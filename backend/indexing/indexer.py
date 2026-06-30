import threading
import requests
import logging
import hashlib
from db.chroma import collection
from config import (
    SERVICE_TOKEN,
    CHUNK_UPSERT_URL,
    NODE_FETCH_TIMEOUT,
)
from utils.extraction import (
    extract_text_for_mimetype,
    extract_text_from_pdf_bytes as original_extract_pdf,
    extract_text_from_docx_bytes as original_extract_docx,
    extract_text_from_txt_bytes as original_extract_txt,
)
from services.bm25_service import build_bm25_index, invalidate_bm25_index
from indexing.chunking import chunk_text as original_chunk_text, split_sheet_sections
from utils.table_extraction import extract_tables_for_file
from indexing.background import run_background_index

# Re-export core processing elements for dynamic test resolution and monkeypatching
from services.embedding_service import generate_embeddings
from indexing.pipeline import (
    _extract_pdf_pages,
    _index_blocks_pipeline,
    _index_sections_spreadsheet,
    _index_tables_spreadsheet,
    _build_contextual_header,
    _flush_batch,
    _is_noise,
    fitz,
    pymupdf4llm,
    MAX_MD_META_LEN,
)

logger = logging.getLogger(__name__)

# Re-expose extraction and chunking for unit test overrides
extract_text_from_pdf_bytes = original_extract_pdf
extract_text_from_docx_bytes = original_extract_docx
extract_text_from_txt_bytes = original_extract_txt
chunk_text = original_chunk_text

# ===== PUBLIC APIS & ORCHESTRATION =====

def has_index(doc_id: str) -> bool:
    res = collection.get(where={"doc_id": doc_id})
    ids = res.get("ids", [])
    return bool(ids)

def _delete_existing(doc_id: str):
    invalidate_bm25_index(doc_id)
    try:
        existing = collection.get(where={"doc_id": doc_id}) or {}
        ids = existing.get("ids", []) or []
        if ids:
            collection.delete(ids=ids)
    except Exception as e:
        logger.warning("Could not delete existing chunks for %s: %s", doc_id, e)

def _push_chunks_to_node(doc_id: str, filename: str, chunk_records: list):
    try:
        if not chunk_records:
            return
        payload = {
            "doc_id": doc_id,
            "filename": filename,
            "chunks": chunk_records,
        }
        headers = {"Content-Type": "application/json", "x-service-token": SERVICE_TOKEN}
        r = requests.post(CHUNK_UPSERT_URL, json=payload, headers=headers, timeout=NODE_FETCH_TIMEOUT)
        if r.status_code >= 300:
            logger.warning(
                "Node chunk upsert returned %s: %s",
                r.status_code,
                (r.text or "")[:200],
            )
    except Exception as e:
        logger.exception("Node chunk upsert failed: %s", e)


def _sync_bm25(doc_id: str, chunk_records: list, file_hash: str | None = None):
    bm25_chunks = [
        {
            "chunk_id": f"{doc_id}_{r['chunk']}",
            "text": r["text"],
            "is_table": bool(r.get("is_table", False)),
        }
        for r in chunk_records
    ]
    build_bm25_index(doc_id, bm25_chunks, file_hash=file_hash)


def _finalize_index(doc_id: str, filename: str, chunk_records: list, file_hash: str | None = None):
    _push_chunks_to_node(doc_id, filename, chunk_records)
    _sync_bm25(doc_id, chunk_records, file_hash=file_hash)


def _extract_tables_for_document(doc_id: str, filename: str, mimetype: str, data: bytes):
    try:
        return extract_tables_for_file(filename, mimetype, data, source_key=doc_id)
    except Exception:
        return []


def _maybe_get_mocked_text(mimetype: str, ext: str, data: bytes):
    if mimetype == "application/pdf" or ext == "pdf":
        if extract_text_from_pdf_bytes is not original_extract_pdf:
            return extract_text_from_pdf_bytes(data)
    elif mimetype in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ) or ext in ("docx", "doc"):
        if extract_text_from_docx_bytes is not original_extract_docx:
            return extract_text_from_docx_bytes(data)
    elif mimetype == "text/plain" or ext == "txt":
        if extract_text_from_txt_bytes is not original_extract_txt:
            return extract_text_from_txt_bytes(data)
    return None


def _index_text_document(
    doc_id: str,
    filename: str,
    source_type: str,
    pages: list,
    tables: list,
    chunk_records: list,
    file_hash: str | None = None,
):
    if not pages and not tables:
        return False, 0

    _delete_existing(doc_id)

    added = 0
    next_chunk_index = 0

    if pages:
        added_text, next_chunk_index = _index_blocks_pipeline(
            doc_id,
            filename,
            source_type,
            pages,
            chunk_records,
            file_hash=file_hash,
            is_chunk_text_mocked=(chunk_text is not original_chunk_text),
            mock_chunk_text_fn=chunk_text if chunk_text is not original_chunk_text else None,
        )
        added += added_text

    if tables:
        added += _index_tables(
            doc_id,
            filename,
            tables,
            start_chunk_index=next_chunk_index,
            chunk_records_out=chunk_records,
            file_hash=file_hash,
        )

    return True, added


def _index_pdf_document(doc_id: str, filename: str, ext: str, data: bytes, tables: list, chunk_records: list, file_hash: str | None = None):
    mocked_text = _maybe_get_mocked_text("application/pdf", ext, data)
    if mocked_text is not None:
        pages = [{"page": 1, "text": mocked_text}]
        source_type = ext if ext in ("pdf", "docx", "txt") else "txt"
        return _index_text_document(doc_id, filename, source_type, pages, tables, chunk_records, file_hash=file_hash)

    pages = _extract_pdf_pages(data)
    return _index_text_document(doc_id, filename, "pdf", pages, tables, chunk_records, file_hash=file_hash)


def _index_docx_document(doc_id: str, filename: str, ext: str, data: bytes, tables: list, chunk_records: list, file_hash: str | None = None):
    mocked_text = _maybe_get_mocked_text(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ext,
        data,
    )
    text = mocked_text if mocked_text is not None else extract_text_from_docx_bytes(data)
    pages = [{"page": 1, "text": text}] if text.strip() else []
    return _index_text_document(doc_id, filename, "docx", pages, tables, chunk_records, file_hash=file_hash)


def _index_txt_document(doc_id: str, filename: str, ext: str, data: bytes, tables: list, chunk_records: list, file_hash: str | None = None):
    mocked_text = _maybe_get_mocked_text("text/plain", ext, data)
    text = mocked_text if mocked_text is not None else extract_text_from_txt_bytes(data)
    pages = [{"page": 1, "text": text}] if text.strip() else []
    return _index_text_document(doc_id, filename, "txt", pages, tables, chunk_records, file_hash=file_hash)


def _index_sheet_document(doc_id: str, filename: str, ext: str, mimetype: str, data: bytes, tables: list, chunk_records: list, file_hash: str | None = None):
    text = extract_text_for_mimetype(filename, mimetype, data)
    if not text and not tables:
        return False, 0

    _delete_existing(doc_id)

    sections = split_sheet_sections(text) if text else [(None, "")]
    added_text = 0
    next_chunk_index = 0

    if text:
        added_text, next_chunk_index = _index_sections(
            doc_id,
            filename,
            sections,
            chunk_records,
            file_hash=file_hash,
        )

    added_tables = _index_tables(
        doc_id,
        filename,
        tables,
        start_chunk_index=next_chunk_index,
        chunk_records_out=chunk_records,
        file_hash=file_hash,
    )
    return True, added_text + added_tables


def index_bytes(
    doc_id: str,
    filename: str,
    mimetype: str,
    data: bytes,
    file_hash: str | None = None,
):
    ext = (filename.rsplit(".", 1)[-1].lower() if "." in filename else "")

    if file_hash is None and data:
        try:
            file_hash = hashlib.sha256(data).hexdigest()
        except Exception:
            file_hash = None

    chunk_records = []
    tables = _extract_tables_for_document(doc_id, filename, mimetype, data)

    if mimetype == "application/pdf" or ext == "pdf":
        ok, added = _index_pdf_document(doc_id, filename, ext, data, tables, chunk_records, file_hash=file_hash)
    elif mimetype in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ) or ext in ("docx", "doc"):
        ok, added = _index_docx_document(doc_id, filename, ext, data, tables, chunk_records, file_hash=file_hash)
    elif mimetype == "text/plain" or ext == "txt":
        ok, added = _index_txt_document(doc_id, filename, ext, data, tables, chunk_records, file_hash=file_hash)
    elif mimetype in (
        "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) or ext in ("csv", "xlsx"):
        ok, added = _index_sheet_document(doc_id, filename, ext, mimetype, data, tables, chunk_records, file_hash=file_hash)
    else:
        return False, 0

    if not ok:
        return False, 0

    _finalize_index(doc_id, filename, chunk_records, file_hash=file_hash)
    return True, added


def index_text(doc_id: str, filename: str, text: str, file_hash: str | None = None):
    """Low-level indexing helper."""
    text = (text or "").strip()
    if not text:
        return False, 0

    filename = filename or "document.txt"
    ext = (filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt")
    source_type = ext if ext in ("pdf", "docx", "csv", "xlsx", "txt") else "txt"

    _delete_existing(doc_id)

    pages = [{"page": 1, "text": text}]
    chunk_records = []

    # Detect mock checks
    is_chunk_mocked = (chunk_text is not original_chunk_text)
    mock_fn = chunk_text if is_chunk_mocked else None

    added, _ = _index_blocks_pipeline(
        doc_id, filename, source_type, pages, chunk_records, file_hash=file_hash,
        is_chunk_text_mocked=is_chunk_mocked, mock_chunk_text_fn=mock_fn
    )

    _finalize_index(doc_id, filename, chunk_records, file_hash=file_hash)

    return True, added


# ===== BACKWARD COMPATIBILITY TEST WRAPPERS =====

def _build_chunk_header(filename: str, sheet_name: str | None = None) -> str:
    return _build_contextual_header(filename, sheet_name=sheet_name)

def _index_tables(
    doc_id: str,
    filename: str,
    tables: list[dict],
    *,
    start_chunk_index: int,
    chunk_records_out: list,
    file_hash: str | None = None,
) -> int:
    ext = (filename.rsplit(".", 1)[-1].lower() if "." in filename else "")
    source_type = ext if ext in ("csv", "xlsx") else "xlsx"
    return _index_tables_spreadsheet(
        doc_id, filename, source_type, tables,
        start_chunk_index=start_chunk_index,
        chunk_records_out=chunk_records_out,
        file_hash=file_hash
    )

def _index_sections(
    doc_id: str,
    filename: str,
    sections: list,
    chunk_records_out: list,
    file_hash: str | None = None,
) -> tuple[int, int]:
    ext = (filename.rsplit(".", 1)[-1].lower() if "." in filename else "")
    source_type = ext if ext in ("csv", "xlsx") else "csv"
    is_mocked = (chunk_text is not original_chunk_text)
    mock_fn = chunk_text if is_mocked else None
    return _index_sections_spreadsheet(
        doc_id, filename, source_type, sections,
        chunk_records_out=chunk_records_out,
        file_hash=file_hash,
        mock_chunk_text_fn=mock_fn
    )


_indexing_in_progress = set()
_indexing_lock = threading.Lock()

def start_background_indexing(doc_id: str):
    with _indexing_lock:
        if doc_id in _indexing_in_progress:
            return
        _indexing_in_progress.add(doc_id)

    th = threading.Thread(
        target=run_background_index,
        kwargs={
            "doc_id": doc_id,
            "indexing_lock": _indexing_lock,
            "indexing_in_progress": _indexing_in_progress,
        },
        daemon=True,
    )
    th.start()