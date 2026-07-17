import pytest
from unittest.mock import patch, MagicMock
import uuid

from config import EMBED_MODEL, INDEX_PIPELINE_VERSION
import services.vector_versioning as vv
from services.vector_versioning import (
    ReindexStatus,
    get_reindex_status,
    document_needs_reindex,
)
import services.retrieval_service as retrieval
import services.bm25_service as bm25
import indexing.indexer as indexer
import indexing.pipeline as pipeline
from indexing.pipeline import IndexBuildError

# =====================================================================
# PART 1: Reindexing Decision Logic Tests (from original test_vector_versioning)
# =====================================================================

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
    assert status.stored_file_hash is None


def test_file_hash_matches_ok(monkeypatch):
    """If current_file_hash is provided and matches stored file_hash, status is OK."""
    monkeypatch.setattr(
        "services.vector_versioning._get_one_chunk_metadata",
        lambda doc_id: (
            True,
            {
                "embedding_model": EMBED_MODEL,
                "pipeline_version": INDEX_PIPELINE_VERSION,
                "file_hash": "abc123",
            },
        ),
    )

    status = get_reindex_status("doc1", current_file_hash="abc123")

    assert status.needs_reindex is False
    assert status.reason == "ok"
    assert status.stored_file_hash == "abc123"


def test_missing_file_hash_metadata_triggers_reindex_when_current_hash_provided(monkeypatch):
    """If current_file_hash is provided but stored metadata lacks file_hash => reindex."""
    monkeypatch.setattr(
        "services.vector_versioning._get_one_chunk_metadata",
        lambda doc_id: (
            True,
            {
                "embedding_model": EMBED_MODEL,
                "pipeline_version": INDEX_PIPELINE_VERSION,
                # no file_hash
            },
        ),
    )

    status = get_reindex_status("doc1", current_file_hash="abc123")

    assert status.needs_reindex is True
    assert status.reason == "missing_file_hash_metadata"
    assert status.stored_file_hash is None


def test_content_hash_mismatch_triggers_reindex(monkeypatch):
    """If stored file_hash differs from current_file_hash => reindex."""
    monkeypatch.setattr(
        "services.vector_versioning._get_one_chunk_metadata",
        lambda doc_id: (
            True,
            {
                "embedding_model": EMBED_MODEL,
                "pipeline_version": INDEX_PIPELINE_VERSION,
                "file_hash": "oldhash",
            },
        ),
    )

    status = get_reindex_status("doc1", current_file_hash="newhash")

    assert status.needs_reindex is True
    assert status.reason == "content_hash_mismatch"
    assert status.stored_file_hash == "oldhash"


def test_current_file_hash_none_preserves_backward_compatibility(monkeypatch):
    """If current_file_hash is None, file_hash checks are skipped."""
    monkeypatch.setattr(
        "services.vector_versioning._get_one_chunk_metadata",
        lambda doc_id: (
            True,
            {
                "embedding_model": EMBED_MODEL,
                "pipeline_version": INDEX_PIPELINE_VERSION,
                # no file_hash
            },
        ),
    )

    status = get_reindex_status("doc1", current_file_hash=None)

    assert status.needs_reindex is False
    assert status.reason == "ok"


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
    assert status.stored_file_hash is None


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


# =====================================================================
# PART 2: Shadow Indexing Lifecycle & Hybrid Fallback (from test_shadow_indexing)
# =====================================================================

def test_shadow_indexing_lifecycle_payloads(monkeypatch):
    """Test that lifecycle HTTP client functions send the correct URLs, headers, and JSON payloads to Node."""
    captured = {}

    def fake_post(url, json=None, headers=None, timeout=None):
        captured["post_url"] = url
        captured["post_json"] = json
        captured["post_headers"] = headers
        class Resp:
            status_code = 200
            text = "ok"
            def json(self):
                return {"message": "success", "ok": True}
        return Resp()

    def fake_get(url, headers=None, timeout=None):
        captured["get_url"] = url
        captured["get_headers"] = headers
        class Resp:
            status_code = 200
            def json(self):
                return {
                    "activeVersion": "active_v1",
                    "previousVersion": None,
                    "activeMetadata": {
                        "embeddingModel": "models/gemini-embedding-2",
                        "pipelineVersion": "6",
                        "chunkingVersion": "3"
                    },
                    "build": {
                        "version": "building_v2",
                        "status": "building"
                    }
                }
        return Resp()

    monkeypatch.setattr(vv.requests, "post", fake_post)
    monkeypatch.setattr(vv.requests, "get", fake_get)

    # 1. Test get_index_state
    state = vv.get_index_state("doc123")
    assert state["activeVersion"] == "active_v1"
    assert captured["get_url"].endswith("/api/document/doc123/index-state")

    # 2. Test mark_index_building
    ok = vv.mark_index_building("doc123", "v_build", "hash123")
    assert ok is True
    assert captured["post_url"].endswith("/api/document/doc123/index-state/building")
    assert captured["post_json"]["indexVersion"] == "v_build"
    assert captured["post_json"]["fileHash"] == "hash123"

    # 3. Test activate_index_version
    ok = vv.activate_index_version("doc123", "v_build")
    assert ok is True
    assert captured["post_url"].endswith("/api/document/doc123/index-state/activate")
    assert captured["post_json"]["indexVersion"] == "v_build"

    # 4. Test mark_index_failed
    ok = vv.mark_index_failed("doc123", "v_build", "timeout")
    assert ok is True
    assert captured["post_url"].endswith("/api/document/doc123/index-state/failed")
    assert captured["post_json"]["indexVersion"] == "v_build"
    assert captured["post_json"]["reason"] == "timeout"


def test_bm25_version_cache_isolation():
    """Verify that BM25 indices are keyed on (doc_id, index_version) composite key."""
    doc_id = "doc_bm25_test"
    v1 = "version_one"
    v2 = "version_two"
    
    chunks_v1 = [
        {"chunk_id": f"{doc_id}:{v1}:0", "text": "apple banana cherry", "is_table": False},
        {"chunk_id": f"{doc_id}:{v1}:1", "text": "unrelated placeholder text", "is_table": False},
        {"chunk_id": f"{doc_id}:{v1}:2", "text": "extra dummy placeholder doc", "is_table": False}
    ]
    chunks_v2 = [
        {"chunk_id": f"{doc_id}:{v2}:0", "text": "dragonfruit elderberry fig", "is_table": False},
        {"chunk_id": f"{doc_id}:{v2}:1", "text": "unrelated placeholder text", "is_table": False},
        {"chunk_id": f"{doc_id}:{v2}:2", "text": "extra dummy placeholder doc", "is_table": False}
    ]

    # Build BM25 index for v1
    bm25.build_bm25_index(doc_id, chunks_v1, v1)
    # Build BM25 index for v2
    bm25.build_bm25_index(doc_id, chunks_v2, v2)

    # Search v1: should match banana
    res_v1 = bm25.bm25_search(doc_id, v1, "banana")
    assert len(res_v1) == 1
    assert res_v1[0][0] == f"{doc_id}:{v1}:0"

    # Search v2 for banana: should NOT match
    res_v2_banana = bm25.bm25_search(doc_id, v2, "banana")
    assert len(res_v2_banana) == 0

    # Search v2 for elderberry: should match
    res_v2_elder = bm25.bm25_search(doc_id, v2, "elderberry")
    assert len(res_v2_elder) == 1
    assert res_v2_elder[0][0] == f"{doc_id}:{v2}:0"

    # Invalidate v1 index only
    bm25.invalidate_bm25_index(doc_id, v1)
    assert bm25.bm25_search(doc_id, v1, "banana") == []
    # v2 index remains intact
    assert len(bm25.bm25_search(doc_id, v2, "elderberry")) == 1


def test_retrieval_version_filtering_and_legacy_fallback(monkeypatch):
    """Verify retrieve_context queries Chroma with active version filters and falls back to legacy chunks if active is missing."""
    
    # Mock embed_query
    monkeypatch.setattr(retrieval, "embed_query", lambda _q: [0.1, 0.2, 0.3])
    
    # Mock bm25_search to return empty
    monkeypatch.setattr(retrieval, "bm25_search", lambda *a, **k: [])

    # Case A: Document has an active version
    def mock_get_state_v1(doc_id):
        return {
            "activeVersion": "v_active_123",
            "previousVersion": None,
            "activeMetadata": {},
            "build": {}
        }
    monkeypatch.setattr(vv, "get_index_state", mock_get_state_v1)

    captured_query_where = {}
    class MockChroma:
        def query(self, query_embeddings, n_results, where=None, **kwargs):
            captured_query_where["where"] = where
            return {"ids": [["c1"]], "documents": [["doc content"]], "distances": [[0.1]], "metadatas": [[{"chunk": 0}]]}
    
    monkeypatch.setattr(retrieval, "collection", MockChroma())

    ctx, err = retrieval.retrieve_context("test query", "doc_test")
    assert err is None
    assert ctx == "doc content"
    # Ensure active version filter was supplied to Chroma query
    assert captured_query_where["where"] == {
        "$and": [
            {"doc_id": "doc_test"},
            {"index_version": "v_active_123"}
        ]
    }

    # Case B: Document has NO active version, but has legacy chunks
    def mock_get_state_none(doc_id):
        return {
            "activeVersion": None,
            "previousVersion": None,
            "activeMetadata": {},
            "build": {}
        }
    monkeypatch.setattr(vv, "get_index_state", mock_get_state_none)

    # Mock legacy chunk presence
    monkeypatch.setattr(vv, "has_legacy_chunks", lambda doc_id: True)
    
    # Mock background indexing starter
    background_triggered = []
    monkeypatch.setattr(indexer, "start_background_indexing", lambda doc_id: background_triggered.append(doc_id))

    ctx, err = retrieval.retrieve_context("test query", "doc_test")
    assert err is None
    # Ensure legacy fallback query was run (filter is just doc_id, without index_version)
    assert captured_query_where["where"] == {"doc_id": "doc_test"}
    # Ensure background indexing was triggered exactly once
    assert background_triggered == ["doc_test"]


def test_has_legacy_chunks(monkeypatch):
    """Verify has_legacy_chunks checks Chroma metadata for empty or missing index_version fields."""
    
    # Mock Chroma collection.get returning legacy chunk (no index_version)
    class LegacyChroma:
        def get(self, **kwargs):
            return {
                "ids": ["c1"],
                "metadatas": [{"doc_id": "doc_leg", "some_meta": "value"}] # no index_version
            }
    monkeypatch.setattr(vv, "collection", LegacyChroma())
    assert vv.has_legacy_chunks("doc_leg") is True

    # Mock Chroma collection.get returning versioned chunk (with index_version)
    class VersionedChroma:
        def get(self, **kwargs):
            return {
                "ids": ["c1"],
                "metadatas": [{"doc_id": "doc_ver", "index_version": "v1.0"}]
            }
    monkeypatch.setattr(vv, "collection", VersionedChroma())
    assert vv.has_legacy_chunks("doc_ver") is False

    # Mock Chroma collection.get returning empty
    class EmptyChroma:
        def get(self, **kwargs):
            return {
                "ids": [],
                "metadatas": []
            }
    monkeypatch.setattr(vv, "collection", EmptyChroma())
    assert vv.has_legacy_chunks("doc_empty") is False


def test_strict_embedding_failures_abort_build(monkeypatch):
    """Verify that any single embedding failure immediately aborts index building, marks it as failed, and doesn't activate."""
    
    monkeypatch.setattr(pipeline, "embed_document", lambda *a, **k: None) # Make all embeddings fail

    # Mock node state endpoints to trace rollback calls on indexer namespace directly
    events = []
    monkeypatch.setattr(indexer, "mark_index_building", lambda *a, **k: True)
    monkeypatch.setattr(indexer, "mark_index_failed", lambda doc_id, version, reason=None: events.append(("failed", version, reason)))
    monkeypatch.setattr(indexer, "delete_index_version", lambda doc_id, version: events.append(("deleted", version)))
    monkeypatch.setattr(indexer, "activate_index_version", lambda doc_id, version: events.append(("activated", version)))

    ok, added = indexer.index_text("doc_fail_test", "sample.txt", "Some content to index.")

    assert ok is False
    assert added == 0
    # Ensure mark_index_failed and delete_index_version were called, and activate_index_version was NOT called
    assert any(ev[0] == "failed" for ev in events)
    assert any(ev[0] == "deleted" for ev in events)
    assert not any(ev[0] == "activated" for ev in events)
