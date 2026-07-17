"""Embedding/vector versioning helpers.

Goal
----
Store and check the embedding model used for each vector so the system can
identify incompatible vectors after an embedding model change and safely reindex.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional
import logging
import requests
import time
import threading

_INDEX_STATE_CACHE_TTL = 10  # Cache index state for 10 seconds
_index_state_cache: dict[str, dict] = {}
_index_state_cache_lock = threading.Lock()

def invalidate_cached_index_state(doc_id: str):
    """Remove the cached index state for doc_id."""
    with _index_state_cache_lock:
        _index_state_cache.pop(doc_id, None)

from config import EMBED_MODEL, INDEX_PIPELINE_VERSION, CHUNKING_VERSION, NODE_BASE_URL, SERVICE_TOKEN
from db.chroma import collection

_original_collection = collection

def _get_collection():
    """Helper to dynamically resolve collection, supporting both monkeypatching and sys.modules stubbing."""
    if collection is not _original_collection:
        return collection
    from db.chroma import collection as dynamic_col
    return dynamic_col

logger = logging.getLogger(__name__)


ReindexReason = Literal[
    "ok",
    "no_vectors",
    "model_mismatch",
    "pipeline_version_mismatch",
    "missing_metadata",
    "missing_file_hash_metadata",
    "content_hash_mismatch",
    "error",
]


@dataclass(frozen=True)
class ReindexStatus:
    """Decision + context for whether a document should be reindexed."""

    needs_reindex: bool
    reason: ReindexReason
    stored_embedding_model: Optional[str] = None
    stored_file_hash: Optional[str] = None


def _headers() -> dict:
    return {
        "x-service-token": SERVICE_TOKEN or "",
        "Content-Type": "application/json"
    }


def _get_one_chunk_metadata(doc_id: str) -> tuple[bool, Optional[dict]]:
    """Fetch a single chunk metadata dict for a document from Chroma.

    Returns:
        (has_vectors, metadata)
    """
    collection = _get_collection()
    res = collection.get(where={"doc_id": doc_id}, include=["metadatas"], limit=1) or {}
    ids = res.get("ids") or []
    metas = res.get("metadatas") or []

    if not ids:
        return False, None

    meta = metas[0] if metas else None
    return True, meta if isinstance(meta, dict) else None


def has_legacy_chunks(doc_id: str) -> bool:
    """Check if the document has legacy chunks (vectors with empty or missing index_version) in Chroma."""
    collection = _get_collection()
    try:
        res = collection.get(where={"doc_id": doc_id}, include=["metadatas"]) or {}
        ids = res.get("ids") or []
        metas = res.get("metadatas") or []
        if not ids:
            return False
        for meta in metas:
            if not meta or "index_version" not in meta or not meta.get("index_version"):
                return True
    except Exception as e:
        logger.error("[Versioning] Error checking legacy chunks: %s", e)
    return False


def get_index_state(doc_id: str) -> dict:
    """GET /api/document/:id/index-state from Node backend with caching."""
    now = time.time()
    with _index_state_cache_lock:
        entry = _index_state_cache.get(doc_id)
        if entry and entry["expires_at"] > now:
            return entry["state"]

    url = f"{NODE_BASE_URL}/api/document/{doc_id}/index-state"
    state = None
    try:
        resp = requests.get(url, headers=_headers(), timeout=10)
        if resp.status_code == 200:
            state = resp.json()
        else:
            logger.warning("GET index-state failed for %s (status %s): %s", doc_id, resp.status_code, resp.text)
    except Exception as e:
        logger.error("GET index-state exception for %s: %s", doc_id, e)

    if not state:
        state = {
            "activeVersion": None,
            "previousVersion": None,
            "activeMetadata": {
                "fileHash": None,
                "pipelineVersion": None,
                "chunkingVersion": None,
                "embeddingModel": None
            },
            "build": {
                "version": None,
                "status": "idle",
                "fileHash": None,
                "pipelineVersion": None,
                "chunkingVersion": None,
                "embeddingModel": None
            }
        }

    with _index_state_cache_lock:
        _index_state_cache[doc_id] = {
            "state": state,
            "expires_at": now + _INDEX_STATE_CACHE_TTL
        }
    return state


def mark_index_building(doc_id: str, index_version: str, file_hash: str | None = None) -> bool:
    """POST /api/document/:id/index-state/building to Node backend."""
    url = f"{NODE_BASE_URL}/api/document/{doc_id}/index-state/building"
    payload = {
        "indexVersion": index_version,
        "fileHash": file_hash,
        "pipelineVersion": INDEX_PIPELINE_VERSION,
        "chunkingVersion": CHUNKING_VERSION,
        "embeddingModel": EMBED_MODEL
    }
    invalidate_cached_index_state(doc_id)
    try:
        resp = requests.post(url, json=payload, headers=_headers(), timeout=10)
        if resp.status_code == 200:
            return True
        logger.warning("POST index-state/building failed for %s (status %s): %s", doc_id, resp.status_code, resp.text)
    except Exception as e:
        logger.error("POST index-state/building exception for %s: %s", doc_id, e)
    return False


def activate_index_version(doc_id: str, index_version: str) -> bool:
    """POST /api/document/:id/index-state/activate to Node backend."""
    url = f"{NODE_BASE_URL}/api/document/{doc_id}/index-state/activate"
    payload = {"indexVersion": index_version}
    invalidate_cached_index_state(doc_id)
    try:
        resp = requests.post(url, json=payload, headers=_headers(), timeout=10)
        if resp.status_code == 200:
            return True
        logger.warning("POST index-state/activate failed for %s (status %s): %s", doc_id, resp.status_code, resp.text)
    except Exception as e:
        logger.error("POST index-state/activate exception for %s: %s", doc_id, e)
    return False


def mark_index_failed(doc_id: str, index_version: str, reason: str) -> bool:
    """POST /api/document/:id/index-state/failed to Node backend."""
    url = f"{NODE_BASE_URL}/api/document/{doc_id}/index-state/failed"
    payload = {"indexVersion": index_version, "reason": reason}
    invalidate_cached_index_state(doc_id)
    try:
        resp = requests.post(url, json=payload, headers=_headers(), timeout=10)
        if resp.status_code == 200:
            return True
        logger.warning("POST index-state/failed failed for %s (status %s): %s", doc_id, resp.status_code, resp.text)
    except Exception as e:
        logger.error("POST index-state/failed exception for %s: %s", doc_id, e)
    return False


def get_node_chunk_count(doc_id: str, index_version: str | None = None) -> int:
    """GET /api/document/:id/chunks/count from Node backend."""
    url = f"{NODE_BASE_URL}/api/document/{doc_id}/chunks/count"
    params = {}
    if index_version:
        params["indexVersion"] = index_version
    try:
        resp = requests.get(url, params=params, headers=_headers(), timeout=10)
        if resp.status_code == 200:
            return resp.json().get("count", 0)
        logger.warning("GET chunks/count failed for %s (status %s): %s", doc_id, resp.status_code, resp.text)
    except Exception as e:
        logger.error("GET chunks/count exception for %s: %s", doc_id, e)
    return -1


def validate_index_version(doc_id: str, index_version: str, expected_chunks: int, file_hash: str | None = None) -> bool:
    """Validate that the newly built version is fully complete, consistent, and matches metadata."""
    if expected_chunks <= 0:
        logger.error("[Validation] expected_chunks must be > 0 (got %d)", expected_chunks)
        return False

    collection = _get_collection()
    try:
        res = collection.get(
            where={
                "$and": [
                    {"doc_id": doc_id},
                    {"index_version": index_version}
                ]
            },
            include=["metadatas"]
        ) or {}
        ids = res.get("ids") or []
        metas = res.get("metadatas") or []
    except Exception as e:
        logger.error("[Validation] Chroma get exception: %s", e)
        return False

    chroma_count = len(ids)
    if chroma_count != expected_chunks:
        logger.error("[Validation] Chroma chunk count mismatch: expected %d, got %d", expected_chunks, chroma_count)
        return False

    # Check metadata fields for each chunk in Chroma
    for cid, meta in zip(ids, metas):
        if not meta:
            logger.error("[Validation] Missing metadata for chunk %s", cid)
            return False
        if meta.get("index_version") != index_version:
            logger.error("[Validation] index_version mismatch for chunk %s: expected %s, got %s", cid, index_version, meta.get("index_version"))
            return False
        if meta.get("embedding_model") != EMBED_MODEL:
            logger.error("[Validation] embedding_model mismatch for chunk %s: expected %s, got %s", cid, EMBED_MODEL, meta.get("embedding_model"))
            return False
        if meta.get("pipeline_version") != INDEX_PIPELINE_VERSION:
            logger.error("[Validation] pipeline_version mismatch for chunk %s: expected %s, got %s", cid, INDEX_PIPELINE_VERSION, meta.get("pipeline_version"))
            return False
        if meta.get("chunking_version") != CHUNKING_VERSION:
            logger.error("[Validation] chunking_version mismatch for chunk %s: expected %s, got %s", cid, CHUNKING_VERSION, meta.get("chunking_version"))
            return False
        if file_hash and meta.get("file_hash") != file_hash:
            logger.error("[Validation] file_hash mismatch for chunk %s: expected %s, got %s", cid, file_hash, meta.get("file_hash"))
            return False

    # Chroma IDs uniqueness
    if len(set(ids)) != chroma_count:
        logger.error("[Validation] Duplicate Chroma IDs found")
        return False

    # Check Node chunk count matches
    node_count = get_node_chunk_count(doc_id, index_version)
    if node_count < 0:
        logger.error("[Validation] Node chunk count validation dependency unavailable (request failed)")
        return False
    if node_count != chroma_count:
        logger.error("[Validation] Node chunk count mismatch: expected %d (Chroma), got %d (Node)", chroma_count, node_count)
        return False

    # Check BM25 chunk count matches
    from services.bm25_service import get_bm25_chunk_count
    bm25_count = get_bm25_chunk_count(doc_id, index_version)
    if bm25_count != chroma_count:
        logger.error("[Validation] BM25 chunk count mismatch: expected %d (Chroma), got %d (BM25)", chroma_count, bm25_count)
        return False

    logger.info("[Validation] Index version %s successfully validated for doc %s", index_version, doc_id)
    return True


def delete_index_version(doc_id: str, index_version: str | None) -> None:
    """Delete Chroma vectors and BM25 entries belonging ONLY to a specific version."""
    if not index_version:
        return
    logger.info("[VectorVersioning] Deleting index version %s for document %s", index_version, doc_id)
    collection = _get_collection()
    try:
        collection.delete(
            where={
                "$and": [
                    {"doc_id": doc_id},
                    {"index_version": index_version}
                ]
            }
        )
    except Exception as e:
        logger.error("[VectorVersioning] Failed to delete Chroma version %s: %s", index_version, e)

    from services.bm25_service import invalidate_bm25_index
    invalidate_bm25_index(doc_id, index_version)


def cleanup_old_versions(doc_id: str, active_version: str | None, previous_version: str | None) -> None:
    """Best-effort cleanup of all versions except the active and previous versions."""
    collection = _get_collection()
    try:
        res = collection.get(
            where={"doc_id": doc_id},
            include=["metadatas"]
        ) or {}
        metas = res.get("metadatas") or []

        versions = set()
        for meta in metas:
            v = meta.get("index_version")
            if v:
                versions.add(v)

        to_delete = versions - {active_version, previous_version}
        for v in to_delete:
            delete_index_version(doc_id, v)
    except Exception as e:
        logger.warning("[VectorVersioning] Failed to clean up old versions for %s: %s", doc_id, e)


def get_reindex_status(doc_id: str, current_file_hash: str | None = None) -> ReindexStatus:
    """Return whether this document's active version is compatible with current settings."""
    doc_id = (doc_id or "").strip()
    if not doc_id:
        return ReindexStatus(needs_reindex=True, reason="error")

    try:
        state = get_index_state(doc_id)
        active_version = state.get("activeVersion")
        
        if active_version:
            meta = state.get("activeMetadata") or {}
        else:
            # Fallback check for legacy chunks in Chroma
            has_vectors, meta = _get_one_chunk_metadata(doc_id)
            if not has_vectors:
                return ReindexStatus(needs_reindex=True, reason="no_vectors")
            if not meta:
                return ReindexStatus(needs_reindex=True, reason="missing_metadata")

        stored = meta.get("embedding_model") or meta.get("embeddingModel")
        if not stored:
            return ReindexStatus(needs_reindex=True, reason="missing_metadata")

        if stored != EMBED_MODEL:
            return ReindexStatus(needs_reindex=True, reason="model_mismatch", stored_embedding_model=stored)

        stored_pipeline = meta.get("pipeline_version") or meta.get("pipelineVersion")
        if stored_pipeline and stored_pipeline != INDEX_PIPELINE_VERSION:
            return ReindexStatus(
                needs_reindex=True,
                reason="pipeline_version_mismatch",
                stored_embedding_model=stored,
            )

        if current_file_hash:
            stored_file_hash = meta.get("file_hash") or meta.get("fileHash")
            if not stored_file_hash:
                return ReindexStatus(
                    needs_reindex=True,
                    reason="missing_file_hash_metadata",
                    stored_embedding_model=stored,
                    stored_file_hash=None,
                )
            if stored_file_hash != current_file_hash:
                return ReindexStatus(
                    needs_reindex=True,
                    reason="content_hash_mismatch",
                    stored_embedding_model=stored,
                    stored_file_hash=stored_file_hash,
                )

        return ReindexStatus(
            needs_reindex=False,
            reason="ok",
            stored_embedding_model=stored,
            stored_file_hash=(meta.get("file_hash") or meta.get("fileHash")) if current_file_hash else None,
        )

    except Exception as e:
        logger.warning("[VectorVersioning] Failed to read index metadata for %s: %s", doc_id, e)
        return ReindexStatus(needs_reindex=True, reason="error")


def document_needs_reindex(doc_id: str) -> bool:
    """Required helper: returns True when vectors are missing or incompatible."""
    return get_reindex_status(doc_id).needs_reindex
