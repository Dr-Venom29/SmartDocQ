import sys
import types
import pytest
import utils.extraction as extraction_mod

def test_extract_pdf_pages_fallback(monkeypatch):
    # Mock Tier 1 failure
    monkeypatch.setattr(extraction_mod, "pymupdf4llm", None)

    # Mock Tier 2 PyMuPDF classic extraction
    class MockPage:
        def get_text(self):
            return "Tier 2 text content"

    class MockDoc:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def __iter__(self):
            return iter([MockPage()])

    mock_fitz = types.ModuleType("fitz")
    mock_fitz.open = lambda stream, filetype: MockDoc()
    monkeypatch.setattr(extraction_mod, "fitz", mock_fitz)

    pages = extraction_mod.extract_pdf(b"pdfdata")
    assert len(pages) == 1
    assert pages[0]["text"] == "Tier 2 text content"
    assert pages[0]["page"] == 1

def test_extract_pdf_pages_tier1_success(monkeypatch):
    # Mock Tier 1 Success
    class MockDoc:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    mock_fitz = types.ModuleType("fitz")
    mock_fitz.open = lambda stream, filetype: MockDoc()
    monkeypatch.setattr(extraction_mod, "fitz", mock_fitz)

    mock_pymupdf4llm = types.ModuleType("pymupdf4llm")
    mock_pymupdf4llm.to_markdown = lambda doc, page_chunks: [
        {"metadata": {"page_number": 1}, "text": "Tier 1 Markdown Content"}
    ]
    monkeypatch.setattr(extraction_mod, "pymupdf4llm", mock_pymupdf4llm)

    pages = extraction_mod.extract_pdf(b"pdfdata")
    assert len(pages) == 1
    assert pages[0]["text"] == "Tier 1 Markdown Content"
    assert pages[0]["page"] == 1

def test_extract_pdf_pages_tier3_fallback(monkeypatch):
    # Mock Tiers 1 and 2 failures
    monkeypatch.setattr(extraction_mod, "pymupdf4llm", None)
    monkeypatch.setattr(extraction_mod, "fitz", None)

    # Mock Tier 3 PDF Reader
    class MockPage:
        def extract_text(self):
            return "Tier 3 text content"

    class MockReader:
        def __init__(self, stream):
            self.pages = [MockPage()]

    mock_pypdf2 = types.ModuleType("PyPDF2")
    mock_pypdf2.PdfReader = MockReader
    sys.modules["PyPDF2"] = mock_pypdf2

    pages = extraction_mod.extract_pdf(b"pdfdata")
    assert len(pages) == 1
    assert pages[0]["text"] == "Tier 3 text content"
    assert pages[0]["page"] == 1

def test_extract_pdf_pages_all_fail(monkeypatch):
    # Force all fallback paths to raise errors or return empty
    monkeypatch.setattr(extraction_mod, "pymupdf4llm", None)
    monkeypatch.setattr(extraction_mod, "fitz", None)
    sys.modules.pop("PyPDF2", None)  # Ensure PyPDF2 import fails

    pages = extraction_mod.extract_pdf(b"pdfdata")
    assert pages == []
