"""
Retrieval service.
Responsible for:
  - Fetching raw documents from the Node API
  - Vector search + keyword re-ranking against ChromaDB
Routes should call retrieve_context() and get back plain text — no query logic in routes.
"""
import re
import requests
import logging

from config import NODE_BASE_URL, SERVICE_TOKEN, NODE_FETCH_TIMEOUT
from db.chroma import collection
from services.embedding_service import generate_embeddings

logger = logging.getLogger(__name__)

_STOP_WORDS = {
    "the", "a", "an", "and", "or", "of", "in", "on", "to", "for",
    "is", "are", "was", "were", "be", "with", "by", "at", "from",
    "as", "that", "this", "it", "its", "if", "then", "than", "into",
    "about", "over", "under", "within", "between",
}


def _keywords(s: str) -> set:
    toks = re.split(r"[^A-Za-z0-9]+", (s or "").lower())
    return {t for t in toks if len(t) >= 3 and t not in _STOP_WORDS and not t.isdigit()}


def retrieve_context(question: str, doc_id: str) -> tuple[str | None, str | None]:
    """Embed the question, query ChromaDB, re-rank with keyword overlap."""

    q_emb = generate_embeddings(question)
    if not q_emb:
        logger.error("[Retrieval] Embedding failed")
        return None, "Failed to generate embedding"

    results = collection.query(
        query_embeddings=[q_emb],
        n_results=12,
        where={"doc_id": doc_id},
        include=["documents", "distances"],
    )

    docs = results.get("documents", [[]])[0] or []
    dists = results.get("distances", [[]])[0] or []

    q_terms = _keywords(question)

    candidates = []
    for doc_txt, dist in zip(docs, dists):
        if not doc_txt:
            continue

        if dist is None:
            dist = 0.5  # normalize

        overlap = len(q_terms & _keywords(doc_txt))
        sim = 1.0 - max(0.0, min(1.0, dist))
        score = 0.7 * sim + 0.3 * (overlap / (len(q_terms) or 1))

        candidates.append((score, dist, doc_txt))

    if not candidates:
        logger.warning("[Retrieval] No candidates found for doc_id={doc_id}")
        return None, None

    # Sort by hybrid score (descending)
    candidates.sort(key=lambda x: x[0], reverse=True)


    strong = [c for c in candidates if c[1] < 0.6]
    weak = [c for c in candidates if c[1] < 0.9]

    if not strong and weak:
        logger.info("[Retrieval] Fallback to weak matches for doc_id={doc_id}")

    if not strong and not weak:
        logger.warning("[Retrieval] No matches passed thresholds for doc_id={doc_id}")

    selected = strong[:5] if strong else weak[:5]

    chosen = [c[2] for c in selected]

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
    """Fetch document metadata (sensitiveFound/consentConfirmed)."""
    try:
        url = f"{NODE_BASE_URL}/api/document/{doc_id}/_meta"
        headers = {"x-service-token": SERVICE_TOKEN}
        r = requests.get(url, headers=headers, timeout=NODE_FETCH_TIMEOUT)

        if r.status_code != 200:
            return None

        return r.json()

    except Exception:
        return None