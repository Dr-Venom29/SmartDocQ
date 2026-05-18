"""Embedding/vector versioning helpers.

Goal
----
Store and check the embedding model used for each vector so the system can
identify incompatible vectors after an embedding model change and safely reindex.

This module intentionally depends only on:
- config (current embedding model)
- db.chroma.collection (Chroma collection handle)

So it can be used from routes/services/indexing with minimal import cycles.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional
import logging

from config import EMBED_MODEL, INDEX_PIPELINE_VERSION
from db.chroma import collection

logger = logging.getLogger(__name__)


ReindexReason = Literal[
    "ok",
    "no_vectors",
    "model_mismatch",
    "pipeline_version_mismatch",
    "missing_metadata",
    "error",
]


@dataclass(frozen=True)
class ReindexStatus:
    """Decision + context for whether a document should be reindexed."""

    needs_reindex: bool
    reason: ReindexReason
    stored_embedding_model: Optional[str] = None


def _get_one_chunk_metadata(doc_id: str) -> tuple[bool, Optional[dict]]:
    """Fetch a single chunk metadata dict for a document.

    Returns:
        (has_vectors, metadata)

    Notes:
        - Uses `limit=1` to keep this fast.
        - Old documents may have metadata entries that don't include the
          `embedding_model` key.
    """

    # Chroma's `get()` is the lightest way to fetch existing metadata.
    res = collection.get(where={"doc_id": doc_id}, include=["metadatas"], limit=1) or {}
    ids = res.get("ids") or []
    metas = res.get("metadatas") or []

    if not ids:
        return False, None

    # metas should align with ids; still guard defensively.
    meta = metas[0] if metas else None
    return True, meta if isinstance(meta, dict) else None


def get_reindex_status(doc_id: str) -> ReindexStatus:
    """Return whether this document's vectors are compatible with current EMBED_MODEL.

    Rules:
    - If no vectors exist => needs reindex.
    - If vectors exist but are missing `embedding_model` metadata => treat as
      legacy and recommend reindex (but callers may choose to keep serving).
    - If stored model differs from current EMBED_MODEL => needs reindex.

    Any unexpected errors default to `needs_reindex=True` (fail safe).
    """

    doc_id = (doc_id or "").strip()
    if not doc_id:
        return ReindexStatus(needs_reindex=True, reason="error")

    try:
        has_vectors, meta = _get_one_chunk_metadata(doc_id)
        if not has_vectors:
            return ReindexStatus(needs_reindex=True, reason="no_vectors")

        stored = (meta or {}).get("embedding_model")
        if not stored:
            return ReindexStatus(needs_reindex=True, reason="missing_metadata")

        if stored != EMBED_MODEL:
            return ReindexStatus(needs_reindex=True, reason="model_mismatch", stored_embedding_model=stored)

        # Pipeline compatibility check.
        # If the indexing pipeline changes (chunking/cleaning/dedup/etc.), old vectors
        # may no longer reflect the current document representation, even if the
        # embedding model stays the same.
        stored_pipeline = (meta or {}).get("pipeline_version")
        if stored_pipeline and stored_pipeline != INDEX_PIPELINE_VERSION:
            return ReindexStatus(
                needs_reindex=True,
                reason="pipeline_version_mismatch",
                stored_embedding_model=stored,
            )

        return ReindexStatus(needs_reindex=False, reason="ok", stored_embedding_model=stored)

    except Exception as e:
        logger.warning("[VectorVersioning] Failed to read index metadata for %s: %s", doc_id, e)
        return ReindexStatus(needs_reindex=True, reason="error")


def document_needs_reindex(doc_id: str) -> bool:
    """Required helper: returns True when vectors are missing or incompatible."""

    return get_reindex_status(doc_id).needs_reindex
