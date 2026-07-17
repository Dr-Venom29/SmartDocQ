import pytest
import logging
from flask import Flask
from routes.ask_routes import ask_bp
from services.retrieval_service import retrieve_context

@pytest.fixture
def app():
    app = Flask(__name__)
    app.register_blueprint(ask_bp)
    app.config["TESTING"] = True
    return app

@pytest.fixture
def client(app):
    return app.test_client()

def test_retrieve_context_latency_logging(monkeypatch, caplog):
    # Mock services/dependencies
    monkeypatch.setattr("services.vector_versioning.get_index_state", lambda doc_id: {
        "activeVersion": "v123",
        "previousVersion": None,
        "activeMetadata": {},
        "build": {}
    })
    monkeypatch.setattr("services.retrieval_service.embed_query", lambda q: [0.1, 0.2, 0.3])
    
    class FakeCollection:
        def query(self, *args, **kwargs):
            return {
                "ids": [["chunk1"]],
                "documents": [["This is test text context."]],
                "distances": [[0.1]],
                "metadatas": [[{"index_version": "v123", "is_table": False}]]
            }
            
    monkeypatch.setattr("services.retrieval_service.collection", FakeCollection())
    monkeypatch.setattr("services.retrieval_service.bm25_search", lambda *args, **kwargs: [("chunk1", 10.0, "This is test text context.", False)])

    # Call retrieve_context with logger level set to INFO
    with caplog.at_level(logging.INFO):
        context, err = retrieve_context("test question", "doc123")
        
    assert context == "This is test text context."
    assert err is None

    # Check if retrieval latency logs exist and have correct fields
    retrieval_logs = [rec.message for rec in caplog.records if "[Retrieval Latency]" in rec.message]
    assert len(retrieval_logs) >= 1
    log_msg = retrieval_logs[0]
    assert "doc_id=doc123" in log_msg
    assert "index_state_fetch_ms=" in log_msg
    assert "embed_query_ms=" in log_msg
    assert "chroma_query_ms=" in log_msg
    assert "bm25_ms=" in log_msg
    assert "fusion_ms=" in log_msg
    assert "retrieval_total_ms=" in log_msg


def test_ask_endpoint_latency_logging_and_contract(client, monkeypatch, caplog):
    # Mock retrieve_context
    monkeypatch.setattr("routes.ask_routes.retrieve_context", lambda q, d: ("Mock context data.", None))
    # Mock LLM generation
    monkeypatch.setattr("routes.ask_routes.generate_answer_from_context", lambda q, c: "This is the generated answer from document.")
    # Mock reindex status check to prevent early redirects
    from dataclasses import dataclass
    @dataclass
    class MockStatus:
        reason: str = "ok"
    monkeypatch.setattr("routes.ask_routes.get_reindex_status", lambda *args, **kwargs: MockStatus())

    # Call the /api/document/ask endpoint
    with caplog.at_level(logging.INFO):
        resp = client.post("/api/document/ask", json={
            "question": "what is this?",
            "doc_id": "doc123"
        })

    assert resp.status_code == 200
    data = resp.get_json()
    assert "answer" in data
    assert data["answer"] == "This is the generated answer from document."
    
    # Timing fields must NOT be present in JSON response
    assert "retrieval_ms" not in data
    assert "llm_ms" not in data
    assert "total_ms" not in data

    # Check if Ask Latency logs exist and have correct fields
    ask_logs = [rec.message for rec in caplog.records if "[Ask Latency]" in rec.message]
    assert len(ask_logs) >= 1
    log_msg = ask_logs[0]
    assert "doc_id=doc123" in log_msg
    assert "retrieval_ms=" in log_msg
    assert "llm_ms=" in log_msg
    assert "total_ms=" in log_msg
