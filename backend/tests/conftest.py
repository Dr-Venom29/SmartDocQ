import pytest
import sys
import types

# Global in-memory index state database for tests
_test_index_states = {}

@pytest.fixture(autouse=True)
def mock_vector_versioning_lifecycle_global(request, monkeypatch):
    """Globally mock all vector versioning lifecycle hooks for all tests safely."""
    # 1. Skip global mocking completely if we are running the payloads test
    if request.node.name == "test_shadow_indexing_lifecycle_payloads":
        return

    # 2. Check if we should skip mocking _get_one_chunk_metadata specifically
    should_mock_metadata = "test_get_one_chunk_metadata" not in request.node.name

    def mock_get_state(doc_id):
        if doc_id in _test_index_states:
            return _test_index_states[doc_id]
        return {
            "activeVersion": None,
            "previousVersion": None,
            "activeMetadata": {},
            "build": {}
        }

    def mock_get_metadata(doc_id):
        return True, {
            "embedding_model": "models/text-embedding-004",
            "pipeline_version": "6"
        }

    def mock_mark_building(doc_id, index_version, file_hash=None):
        if doc_id not in _test_index_states:
            _test_index_states[doc_id] = {
                "activeVersion": None,
                "previousVersion": None,
                "activeMetadata": {},
                "build": {}
            }
        _test_index_states[doc_id]["build"] = {
            "version": index_version,
            "status": "building",
            "fileHash": file_hash,
        }
        return True

    def mock_activate(doc_id, index_version):
        if doc_id not in _test_index_states:
            _test_index_states[doc_id] = {
                "activeVersion": None,
                "previousVersion": None,
                "activeMetadata": {},
                "build": {}
            }
        state = _test_index_states[doc_id]
        state["previousVersion"] = state["activeVersion"]
        state["activeVersion"] = index_version
        state["activeMetadata"] = {
            "embeddingModel": "models/text-embedding-004",
            "pipelineVersion": "6",
        }
        state["build"] = {
            "version": None,
            "status": "idle"
        }
        return True

    # Patch services.vector_versioning namespace
    try:
        import services.vector_versioning as vv
        patches = [
            ("get_index_state", mock_get_state),
            ("mark_index_building", mock_mark_building),
            ("activate_index_version", mock_activate),
            ("mark_index_failed", lambda *a, **k: True),
            ("validate_index_version", lambda *a, **k: True),
            ("delete_index_version", lambda *a, **k: None),
            ("cleanup_old_versions", lambda *a, **k: None),
        ]
        if should_mock_metadata:
            patches.append(("_get_one_chunk_metadata", mock_get_metadata))

        for name, val in patches:
            if hasattr(vv, name):
                monkeypatch.setattr(vv, name, val)
    except ImportError:
        pass

    # Patch indexing.indexer namespace
    try:
        from indexing import indexer
        patches = [
            ("get_index_state", mock_get_state),
            ("mark_index_building", mock_mark_building),
            ("activate_index_version", mock_activate),
            ("mark_index_failed", lambda *a, **k: True),
            ("validate_index_version", lambda *a, **k: True),
            ("delete_index_version", lambda *a, **k: None),
            ("cleanup_old_versions", lambda *a, **k: None),
        ]
        if should_mock_metadata:
            patches.append(("_get_one_chunk_metadata", mock_get_metadata))

        for name, val in patches:
            if hasattr(indexer, name):
                monkeypatch.setattr(indexer, name, val)
    except ImportError:
        pass
