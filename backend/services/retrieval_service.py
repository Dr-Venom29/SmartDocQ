"""
Retrieval service.
Responsible for:
  - Fetching raw documents from the Node API
  - Hybrid search: ChromaDB vector search + BM25 (in-process cache),
    fused with Reciprocal Rank Fusion (RRF) + table-aware boosting
Routes should call retrieve_context() and get back plain text -- no query logic in routes.
"""
import re
import os
import requests
import logging
import threading
import time

from config import NODE_BASE_URL, SERVICE_TOKEN, NODE_FETCH_TIMEOUT
from db.chroma import collection
from services.embedding_service import embed_query
from services.bm25_service import bm25_search

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Fusion weights  (RRF_WEIGHT + SIM_WEIGHT must sum to 1.0)
#
# Tune these by running retrieval experiments against a labeled query set.
# Override at runtime without code changes:
#   RRF_WEIGHT=0.80 SIM_WEIGHT=0.20 python main.py
#
# Candidate grid to evaluate:
#   0.90 / 0.10  — almost pure RRF; good for exact-match-heavy docs
#   0.85 / 0.15  — current default
#   0.80 / 0.20  — balanced; likely best for mixed query types
#   0.75 / 0.25  — leans semantic; good for narrative/conceptual docs
# ---------------------------------------------------------------------------
RRF_WEIGHT: float = float(os.environ.get("RRF_WEIGHT", "0.85"))
SIM_WEIGHT: float = float(os.environ.get("SIM_WEIGHT", "0.15"))

if abs(RRF_WEIGHT + SIM_WEIGHT - 1.0) > 1e-6:
    logger.warning(
        "[Retrieval] RRF_WEIGHT + SIM_WEIGHT = %.4f (expected 1.0) — normalizing",
        RRF_WEIGHT + SIM_WEIGHT,
    )
    _total = RRF_WEIGHT + SIM_WEIGHT or 1.0
    RRF_WEIGHT /= _total
    SIM_WEIGHT /= _total

logger.info(
    "[Retrieval] Fusion weights: RRF=%.2f SIM=%.2f",
    RRF_WEIGHT,
    SIM_WEIGHT,
)



# --- Node document metadata TTL cache ---
# Used to avoid one synchronous Node HTTP call per question.
# Fail-open: any cache errors should fall back to a direct fetch.
_DOC_META_CACHE_TTL = 300  # 5 minutes
_doc_meta_cache: dict[str, dict] = {}
_doc_meta_cache_lock = threading.Lock()


_TABLE_Q_TERMS = {
    "table",
    "row",
    "rows",
    "column",
    "columns",
    "highest",
    "lowest",
    "average",
    "avg",
    "mean",
    "median",
    "total",
    "sum",
    "compare",
    "percentage",
    "percent",
    "statistics",
    "stats",
    "values",
}


_EXPLICIT_TABLE_HINTS = {
    "table",
    "tables",
    "row",
    "rows",
    "column",
    "columns",
    "spreadsheet",
    "xlsx",
    "csv",
}


def _table_intent_strength(question: str) -> int:
    """Return 0 (none), 1 (weak), 2 (explicit).

    Keep it cheap and robust: no external parsers, no heavy NLP.
    """

    q = (question or "").lower().strip()
    if not q:
        return 0

    # Explicit mentions of tables/spreadsheets are strong signals.
    if any(h in q for h in _EXPLICIT_TABLE_HINTS):
        return 2

    # Aggregation/comparison verbs are weaker hints (could be narrative text too).
    if any(t in q for t in _TABLE_Q_TERMS):
        return 1

    return 0



def _rrf(rank: int, k: int = 60) -> float:
    """Reciprocal Rank Fusion score for a 0-indexed rank.

    Formula: 1 / (k + rank + 1)
    Using rank+1 converts 0-indexed Python positions to 1-indexed RRF convention.
    k=60 is the standard default from the original RRF paper.
    """
    return 1.0 / (k + rank + 1)


def retrieve_context(question: str, doc_id: str) -> tuple[str | None, str | None]:
    """Hybrid retrieval: Vector (Chroma, top-20) + BM25 (cached, top-20),
    fused with Reciprocal Rank Fusion.
    Final score = RRF_WEIGHT * rrf + SIM_WEIGHT * sim  (env-var configurable).
    Table-aware boosting applied after fusion.
    """

    # --- 1. Vector Search ---
    q_emb = embed_query(question)
    if not q_emb:
        logger.error("[Retrieval] Embedding failed")
        return None, "Failed to generate embedding"

    results = collection.query(
        query_embeddings=[q_emb],
        n_results=20,
        where={"doc_id": doc_id},
        include=["documents", "distances", "metadatas"],
    )

    docs = results.get("documents", [[]])[0] or []
    dists = results.get("distances", [[]])[0] or []
    metas = results.get("metadatas", [[]])[0] or []

    # Build ordered vector hit list: (chunk_id, dist, meta, text)
    vector_hits: list[tuple[str, float, dict, str]] = []
    for i, (doc_txt, dist) in enumerate(zip(docs, dists)):
        if not doc_txt:
            continue
        meta = metas[i] if i < len(metas) and isinstance(metas[i], dict) else {}
        dist = float(dist) if dist is not None else 0.5
        chunk_idx = meta.get("chunk", i)
        chunk_id = f"{doc_id}_{chunk_idx}"
        vector_hits.append((chunk_id, dist, meta, doc_txt))

    # --- 2. BM25 Search (in-process cache, zero network overhead) ---
    # Returns [(chunk_id, score, text, is_table), ...] sorted descending.
    # Returns [] on cache miss (first query before index warms up or after TTL).
    bm25_hits = bm25_search(doc_id, question, top_k=20)

    if not vector_hits and not bm25_hits:
        logger.warning("[Retrieval] No results from either search for doc_id=%s", doc_id)
        return None, None

    # --- 3. RRF Fusion keyed by chunk_id ---
    rrf_scores: dict[str, float] = {}
    chunk_text_map: dict[str, str] = {}
    chunk_sim_map: dict[str, float] = {}     # similarity = 1 - distance
    chunk_is_table_map: dict[str, bool] = {}

    # Vector contributions (0-indexed rank → RRF score)
    for rank, (cid, dist, meta, text) in enumerate(vector_hits):
        rrf_scores[cid] = rrf_scores.get(cid, 0.0) + _rrf(rank)
        chunk_text_map[cid] = text
        chunk_sim_map[cid] = 1.0 - max(0.0, min(1.0, dist))
        chunk_is_table_map[cid] = bool(meta.get("is_table")) if meta else False
        logger.debug("[Vector] rank=%d chunk=%s dist=%.4f", rank, cid, dist)

    # BM25 contributions (0-indexed rank → RRF score)
    # Chunks that appear in both lists accumulate scores from both.
    # Chunks only in BM25 get sim=0.0 (no Chroma distance available).
    for rank, (cid, bm25_score, text, is_table) in enumerate(bm25_hits):
        rrf_scores[cid] = rrf_scores.get(cid, 0.0) + _rrf(rank)
        if cid not in chunk_text_map:
            chunk_text_map[cid] = text
            chunk_sim_map[cid] = 0.0
            chunk_is_table_map[cid] = is_table
        logger.debug("[BM25] rank=%d chunk=%s bm25=%.4f", rank, cid, bm25_score)

    # --- 4. Compute final scores and apply table boost ---
    table_intent = _table_intent_strength(question)
    candidates: list[dict] = []

    for cid, rrf_score in rrf_scores.items():
        text = chunk_text_map.get(cid, "")
        if not text:
            continue

        sim = chunk_sim_map.get(cid, 0.0)
        is_table = chunk_is_table_map.get(cid, False)

        # Hybrid score: mostly RRF, with a small similarity tiebreaker.
        final_score = RRF_WEIGHT * rrf_score + SIM_WEIGHT * sim

        # Lightweight table-aware boosting (unchanged from previous pipeline).
        if table_intent:
            if table_intent >= 2:
                final_score *= 1.30 if is_table else 0.93
            else:
                final_score *= 1.15 if is_table else 0.99

        logger.info(
            "[Retrieval] chunk=%s rrf=%.4f sim=%.4f final=%.4f table=%s",
            cid, rrf_score, sim, final_score, is_table,
        )
        candidates.append({"chunk_id": cid, "text": text, "score": final_score})

    if not candidates:
        return None, None

    candidates.sort(key=lambda x: float(x.get("score") or 0.0), reverse=True)
    top5 = candidates[:5]

    logger.info(
        "[Retrieval Selected] top=%d total_candidates=%d vector_hits=%d bm25_hits=%d",
        len(top5), len(candidates), len(vector_hits), len(bm25_hits),
    )

    chosen = [c["text"] for c in top5 if c.get("text")]
    if not chosen:
        return None, None

    return "\n\n".join(chosen), None


def fetch_doc_from_node(doc_id: str):
    """Fetch binary document from Node API /api/document/:id/download."""
    try:
        url = f"{NODE_BASE_URL}/api/document/{doc_id}/download"
        headers = {"x-service-token": SERVICE_TOKEN}
        r = requests.get(url, headers=headers, timeout=NODE_FETCH_TIMEOUT)

        if r.status_code != 200:
            return False, f"Node returned {r.status_code}", None, None

        disp = r.headers.get("Content-Disposition", "")
        filename = "document"

        if "filename=" in disp:
            filename = disp.split("filename=")[-1].strip('"')

        mimetype = r.headers.get("Content-Type", "application/octet-stream")

        return True, filename, mimetype, r.content

    except Exception:
        logger.exception("[Retrieval] Failed to fetch document from Node API")
        return False, "Failed to fetch document", None, None


def fetch_doc_meta_from_node(doc_id: str):
    """Fetch document metadata from Node.

    Expected keys (best-effort; depends on Node version):
      - contentHash: sha256 hex digest of the stored file bytes
      - sensitiveFound: whether sensitive data was detected
      - consentConfirmed: whether user consent was confirmed

    Notes:
      - Returns None if the Node endpoint is unavailable.
      - Callers must be backward compatible with missing keys.
    """

    try:
        url = f"{NODE_BASE_URL}/api/document/{doc_id}/_meta"
        headers = {"x-service-token": SERVICE_TOKEN}
        r = requests.get(url, headers=headers, timeout=NODE_FETCH_TIMEOUT)

        if r.status_code != 200:
            return None

        return r.json()

    except Exception:
        return None


def get_cached_doc_meta(doc_id: str) -> dict | None:
    """Return cached Node document metadata for doc_id if not expired."""

    try:
        doc_id = (doc_id or "").strip()
        if not doc_id:
            return None

        now = time.time()
        with _doc_meta_cache_lock:
            entry = _doc_meta_cache.get(doc_id)
            if not isinstance(entry, dict):
                return None
            expires_at = entry.get("expires_at")
            if not isinstance(expires_at, (int, float)):
                _doc_meta_cache.pop(doc_id, None)
                return None
            if now >= float(expires_at):
                _doc_meta_cache.pop(doc_id, None)
                return None

            data = entry.get("data")
            return data if isinstance(data, dict) else None

    except Exception:
        return None


def set_cached_doc_meta(doc_id: str, meta: dict):
    """Store Node metadata for doc_id with TTL. Safe no-op on invalid input."""

    try:
        doc_id = (doc_id or "").strip()
        if not doc_id or not isinstance(meta, dict):
            return

        with _doc_meta_cache_lock:
            _doc_meta_cache[doc_id] = {
                "data": meta,
                "expires_at": time.time() + _DOC_META_CACHE_TTL,
            }
    except Exception:
        return


def invalidate_cached_doc_meta(doc_id: str):
    """Remove cache entry for doc_id if it exists."""

    try:
        doc_id = (doc_id or "").strip()
        if not doc_id:
            return
        with _doc_meta_cache_lock:
            _doc_meta_cache.pop(doc_id, None)
    except Exception:
        return


def fetch_doc_meta_cached(doc_id: str) -> dict:
    """Fetch Node metadata with TTL caching.

    Returns {} on failure.
    """

    try:
        cached = get_cached_doc_meta(doc_id)
        if isinstance(cached, dict):
            return cached

        meta = fetch_doc_meta_from_node(doc_id)
        if isinstance(meta, dict):
            set_cached_doc_meta(doc_id, meta)
            return meta

        return {}
    except Exception:
        # Fail open: keep behavior similar to callers using fetch_doc_meta_from_node.
        return {}