"""Document extraction engine.

This module owns ALL document reading. Nothing outside this module should
open raw bytes to read file content.

Public API
----------
extract_pdf(data)          -> list[dict]   page dicts {"page": int, "text": str}
extract_docx(data)         -> str
extract_txt(data)          -> str
extract_csv(fn, mt, data)  -> str
extract_xlsx(fn, mt, data) -> str
extract_text_for_mimetype(filename, mimetype, data) -> str   (router)

PDF uses a three-tier fallback chain:
    Tier 1  PyMuPDF4LLM  (structured Markdown, best quality)
    Tier 2  PyMuPDF      (plain text, page-by-page)
    Tier 3  PyPDF2       (final backup)
"""

import io
import re
import logging
from docx import Document as DocxDocument

from utils.table_extraction import extract_tables_for_file, tables_to_scan_text

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Optional PDF library imports — gracefully absent in minimal environments.
# Tests monkeypatch these module-level names via:
#     monkeypatch.setattr(utils.extraction, "fitz", mock_fitz)
# ---------------------------------------------------------------------------
try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

try:
    import pymupdf4llm
except ImportError:
    pymupdf4llm = None


# ===========================================================================
# PDF
# ===========================================================================

def extract_pdf(data: bytes) -> list[dict]:
    """Three-tier extraction fallback chain for PDF documents.

    Returns a list of page dicts: ``[{"page": int, "text": str}, ...]``

    Tier 1 → PyMuPDF4LLM  (structured Markdown, highest fidelity)
    Tier 2 → PyMuPDF      (plain text, page-by-page fallback)
    Tier 3 → PyPDF2       (final backup)
    """
    # Tier 1: PyMuPDF4LLM
    if fitz is not None and pymupdf4llm is not None:
        try:
            with fitz.open(stream=data, filetype="pdf") as doc:
                chunks = pymupdf4llm.to_markdown(doc, page_chunks=True)
            valid = [c for c in (chunks or []) if c.get("text", "").strip()]
            if valid:
                return [
                    {
                        "page": chunk["metadata"].get(
                            "page_number", chunk["metadata"].get("page", 1)
                        ),
                        "text": chunk["text"],
                    }
                    for chunk in valid
                ]
        except Exception as e:
            logger.warning(
                "Tier 1 PyMuPDF4LLM extraction failed: %s. Falling back to Tier 2.", e
            )

    # Tier 2: PyMuPDF classic
    if fitz is not None:
        try:
            with fitz.open(stream=data, filetype="pdf") as doc:
                pages = [
                    {"page": idx + 1, "text": page.get_text()}
                    for idx, page in enumerate(doc)
                ]
            return pages
        except Exception as e:
            logger.warning(
                "Tier 2 PyMuPDF classic extraction failed: %s. Falling back to Tier 3.", e
            )

    # Tier 3: PyPDF2 fallback (lazy import so tests can inject a mock via sys.modules)
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(data))
        pages = []
        for idx, page in enumerate(reader.pages):
            pages.append({"page": idx + 1, "text": page.extract_text() or ""})
        return pages
    except Exception as e:
        logger.error("Tier 3 PyPDF2 extraction failed: %s.", e)
        return []


# ===========================================================================
# DOCX
# ===========================================================================

def extract_docx(data: bytes) -> str:
    """Extract plain text from a DOCX byte stream."""
    text = ""
    try:
        with io.BytesIO(data) as f:
            doc = DocxDocument(f)
            for p in doc.paragraphs:
                raw = (p.text or "").strip()
                if not raw:
                    continue
                norm = re.sub(r"\s+", " ", raw).strip()
                if norm:
                    text += norm + "\n"
    except Exception as e:
        logger.error("DOCX extraction error: %s", e)
    return text


# ===========================================================================
# TXT
# ===========================================================================

def extract_txt(data: bytes) -> str:
    """Decode a plain-text byte stream as UTF-8."""
    try:
        return data.decode("utf-8", errors="ignore")
    except Exception as e:
        logger.error("TXT extraction error: %s", e)
        return ""


# ===========================================================================
# CSV / XLSX
# ===========================================================================

def _extract_sheet(filename: str, mimetype: str, data: bytes, fmt: str) -> str:
    """Shared extraction backend for spreadsheet formats (CSV, XLSX)."""
    try:
        tables = extract_tables_for_file(filename, mimetype, data)
        return tables_to_scan_text(tables)
    except Exception as e:
        logger.error("%s extraction error: %s", fmt.upper(), e)
        return ""


def extract_csv(filename: str, mimetype: str, data: bytes) -> str:
    """Extract text from a CSV byte stream via the table extraction engine."""
    return _extract_sheet(filename, mimetype, data, "csv")


def extract_xlsx(filename: str, mimetype: str, data: bytes) -> str:
    """Extract text from an XLSX byte stream via the table extraction engine."""
    return _extract_sheet(filename, mimetype, data, "xlsx")


# ===========================================================================
# MIME-type router
# ===========================================================================

def extract_text_for_mimetype(filename: str, mimetype: str, data: bytes) -> str:
    """Route extraction by MIME type / file extension and return plain text.

    For PDFs the three-tier chain is used; pages are joined with newlines.
    """
    ext = (filename.rsplit(".", 1)[-1].lower() if "." in filename else "")
    if mimetype == "application/pdf" or ext == "pdf":
        pages = extract_pdf(data)
        return "\n".join(p["text"] for p in pages)
    elif mimetype in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ) or ext in ("docx", "doc"):
        return extract_docx(data)
    elif mimetype == "text/csv" or ext == "csv":
        return extract_csv(filename, mimetype, data)
    elif (
        mimetype == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        or ext == "xlsx"
    ):
        return extract_xlsx(filename, mimetype, data)
    elif mimetype == "text/plain" or ext == "txt":
        return extract_txt(data)
    return ""


# ---------------------------------------------------------------------------
# Phase-1 backward-compat aliases
#
# These exist so that code that imports the old long-form names continues to
# work during the transition.  Remove in Phase 2 once all callers have been
# updated to use the short public API above.
# ---------------------------------------------------------------------------

#: Alias for extract_pdf(); prefer extract_pdf() in new code.
extract_pdf_pages = extract_pdf

#: Alias for extract_docx(); prefer extract_docx() in new code.
extract_text_from_docx_bytes = extract_docx

#: Alias for extract_txt(); prefer extract_txt() in new code.
extract_text_from_txt_bytes = extract_txt

#: Alias for extract_csv(); prefer extract_csv() in new code.
extract_text_from_csv_bytes = extract_csv

#: Alias for extract_xlsx(); prefer extract_xlsx() in new code.
extract_text_from_xlsx_bytes = extract_xlsx


def extract_text_from_pdf_bytes(data: bytes) -> str:
    """Backward-compat: returns flat text from a PDF (no page metadata).

    Prefer extract_pdf() which returns structured page dicts.
    Remove in Phase 2.
    """
    return "\n".join(p["text"] for p in extract_pdf(data))
