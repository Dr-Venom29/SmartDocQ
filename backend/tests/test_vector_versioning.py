"""Unit tests for services.vector_versioning.

These tests validate the decision logic that determines whether a document
needs reindexing based on stored metadata:

- no vectors exist
- embedding model matches
- embedding model mismatch
- pipeline version mismatch
- legacy chunks missing metadata
- missing pipeline_version remains backward compatible
- invalid doc_id
- unexpected internal exceptions
- boolean wrapper function

Run:
  pytest -q
"""

import pytest

from config import EMBED_MODEL, INDEX_PIPELINE_VERSION
from services.vector_versioning import (
    ReindexStatus,
    get_reindex_status,
    document_needs_reindex,
)


def test_no_vectors(monkeypatch):
    """If no vectors exist, the document must be indexed."""
    monkeypatch.setattr(
        "services.vector_versioning._get_one_chunk_metadata",
        lambda doc_id: (False, None),
    )

    status = get_reindex_status("doc1")

    assert status.needs_reindex is True
    assert status.reason == "no_vectors"
    assert status.stored_embedding_model is None


def test_embedding_model_matches(monkeypatch):
    """Matching embedding model and pipeline version should be OK."""
    monkeypatch.setattr(
        "services.vector_versioning._get_one_chunk_metadata",
        lambda doc_id: (
            True,
            {
                "embedding_model": EMBED_MODEL,
                "pipeline_version": INDEX_PIPELINE_VERSION,
            },
        ),
    )

    status = get_reindex_status("doc1")

    assert status.needs_reindex is False
    assert status.reason == "ok"
    assert status.stored_embedding_model == EMBED_MODEL


def test_embedding_model_mismatch(monkeypatch):
    """Different embedding models must trigger reindexing."""
    monkeypatch.setattr(
        "services.vector_versioning._get_one_chunk_metadata",
        lambda doc_id: (
            True,
            {
                "embedding_model": "old-embedding-model",
                "pipeline_version": INDEX_PIPELINE_VERSION,
            },
        ),
    )

    status = get_reindex_status("doc1")

    assert status.needs_reindex is True
    assert status.reason == "model_mismatch"
    assert status.stored_embedding_model == "old-embedding-model"


def test_pipeline_version_mismatch(monkeypatch):
    """Different pipeline versions should trigger reindexing."""
    monkeypatch.setattr(
        "services.vector_versioning._get_one_chunk_metadata",
        lambda doc_id: (
            True,
            {
                "embedding_model": EMBED_MODEL,
                "pipeline_version": "0",
            },
        ),
    )

    status = get_reindex_status("doc1")

    assert status.needs_reindex is True
    assert status.reason == "pipeline_version_mismatch"
    assert status.stored_embedding_model == EMBED_MODEL


def test_missing_embedding_metadata(monkeypatch):
    """Legacy chunks without embedding_model should trigger refresh."""
    monkeypatch.setattr(
        "services.vector_versioning._get_one_chunk_metadata",
        lambda doc_id: (True, {}),
    )

    status = get_reindex_status("doc1")

    assert status.needs_reindex is True
    assert status.reason == "missing_metadata"


def test_missing_pipeline_version_is_backward_compatible(monkeypatch):
    """If embedding_model exists but pipeline_version is missing, treat as OK."""
    monkeypatch.setattr(
        "services.vector_versioning._get_one_chunk_metadata",
        lambda doc_id: (
            True,
            {
                "embedding_model": EMBED_MODEL,
                # No pipeline_version key
            },
        ),
    )

    status = get_reindex_status("doc1")

    assert status.needs_reindex is False
    assert status.reason == "ok"


def test_blank_doc_id_returns_error():
    """Blank document IDs should fail safely."""
    status = get_reindex_status("")

    assert status.needs_reindex is True
    assert status.reason == "error"


def test_internal_exception_returns_error(monkeypatch):
    """Unexpected exceptions should fail safely."""

    def boom(doc_id):
        raise RuntimeError("test failure")

    monkeypatch.setattr(
        "services.vector_versioning._get_one_chunk_metadata",
        boom,
    )

    status = get_reindex_status("doc1")

    assert status.needs_reindex is True
    assert status.reason == "error"


def test_document_needs_reindex_true(monkeypatch):
    """Boolean wrapper should return True when reindex is required."""
    monkeypatch.setattr(
        "services.vector_versioning.get_reindex_status",
        lambda doc_id: ReindexStatus(needs_reindex=True, reason="error"),
    )

    assert document_needs_reindex("doc1") is True


def test_document_needs_reindex_false(monkeypatch):
    """Boolean wrapper should return False when reindex is not required."""
    monkeypatch.setattr(
        "services.vector_versioning.get_reindex_status",
        lambda doc_id: ReindexStatus(needs_reindex=False, reason="ok"),
    )

    assert document_needs_reindex("doc1") is False


def test_get_one_chunk_metadata_reads_collection(monkeypatch):
    from services.vector_versioning import _get_one_chunk_metadata

    class FakeCollection:
        def get(self, **kwargs):
            return {
                "ids": ["doc1_0"],
                "metadatas": [{"embedding_model": "test-model"}],
            }

    monkeypatch.setattr(
        "services.vector_versioning.collection",
        FakeCollection(),
    )

    has_vectors, meta = _get_one_chunk_metadata("doc1")

    assert has_vectors is True
    assert meta["embedding_model"] == "test-model"


def test_get_one_chunk_metadata_no_ids(monkeypatch):
    from services.vector_versioning import _get_one_chunk_metadata

    class FakeCollection:
        def get(self, **kwargs):
            return {
                "ids": [],
                "metadatas": [],
            }

    monkeypatch.setattr(
        "services.vector_versioning.collection",
        FakeCollection(),
    )

    has_vectors, meta = _get_one_chunk_metadata("doc1")

    assert has_vectors is False
    assert meta is None
