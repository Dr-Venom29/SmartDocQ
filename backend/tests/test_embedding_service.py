import pytest
from unittest.mock import patch

import services.embedding_service as emb_service

def test_embed_query_formatting():
    """Verify that query embedding prepends the task and query format."""
    with patch("services.embedding_service._generate_embedding") as mock_gen:
        mock_gen.return_value = [0.1, 0.2, 0.3]

        res = emb_service.embed_query("What is RRF?")

        assert res == [0.1, 0.2, 0.3]
        mock_gen.assert_called_once_with(
            "task: question answering | query: What is RRF?",
            20
        )

def test_embed_document_formatting():
    """Verify document embedding formatting with title and context."""
    with patch("services.embedding_service._generate_embedding") as mock_gen:
        mock_gen.return_value = [0.1, 0.2, 0.3]

        # Scenario 1: Title and context provided
        res = emb_service.embed_document(
            text="chunk content",
            title="doc.pdf",
            context="Section: Introduction"
        )
        assert res == [0.1, 0.2, 0.3]
        mock_gen.assert_called_with(
            "title: doc.pdf | text: Section: Introduction\n\nchunk content",
            20
        )

        # Scenario 2: No title, no context
        mock_gen.reset_mock()
        emb_service.embed_document(text="simple content")
        mock_gen.assert_called_once_with(
            "title: none | text: simple content",
            20
        )

def test_gemini_api_call_has_no_task_type():
    """Verify the Google GenAI embedding request contains no task_type parameter."""
    with patch("google.generativeai.embed_content") as mock_embed:
        mock_embed.return_value = {"embedding": [0.9, 0.8, 0.7]}

        res = emb_service._generate_embedding("some prepared text")

        assert res == [0.9, 0.8, 0.7]
        mock_embed.assert_called_once()
        kwargs = mock_embed.call_args[1]
        assert "task_type" not in kwargs
        assert kwargs["content"] == "some prepared text"

def test_old_api_removal():
    """Verify generate_embeddings is no longer in services.embedding_service."""
    assert not hasattr(emb_service, "generate_embeddings")