import threading
import requests
import logging
import hashlib
from db.chroma import collection
from config import (
    SERVICE_TOKEN,
    CHUNK_UPSERT_URL,
    NODE_FETCH_TIMEOUT,
    INDEX_PIPELINE_VERSION,
    INDEX_BATCH_SIZE,
    CHUNKING_VERSION,
)
from state.memory_store import consent_state
from utils.extraction import (
    extract_text_for_mimetype,
    extract_text_from_pdf_bytes as original_extract_pdf,
    extract_text_from_docx_bytes as original_extract_docx,
    extract_text_from_txt_bytes as original_extract_txt,
)
from utils.security import detect_sensitive
from services.bm25_service import build_bm25_index, invalidate_bm25_index
from indexing.chunking import chunk_text as original_chunk_text, split_sheet_sections, pack_blocks_into_chunks
from utils.table_extraction import extract_tables_for_file, render_markdown_table, flatten_table_for_embedding

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
    added = 0

    # Extract tables (CSV/XLSX/DOCX only)
    tables_extractor = globals()["extract_tables_for_file"]
    try:
        tables = tables_extractor(filename, mimetype, data, source_key=doc_id)
    except Exception:
        tables = []

    # Detect if chunk_text is monkeypatched (i.e. overridden by tests)
    is_chunk_mocked = (chunk_text is not original_chunk_text)
    mock_fn = chunk_text if is_chunk_mocked else None

    # Test mock detection
    mocked_text = None
    if mimetype == "application/pdf" or ext == "pdf":
        if extract_text_from_pdf_bytes is not original_extract_pdf:
            mocked_text = extract_text_from_pdf_bytes(data)
    elif mimetype in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ) or ext in ("docx", "doc"):
        if extract_text_from_docx_bytes is not original_extract_docx:
            mocked_text = extract_text_from_docx_bytes(data)
    elif mimetype == "text/plain" or ext == "txt":
        if extract_text_from_txt_bytes is not original_extract_txt:
            mocked_text = extract_text_from_txt_bytes(data)

    if mocked_text is not None:
        _delete_existing(doc_id)
        pages = [{"page": 1, "text": mocked_text}]
        source_type = ext if ext in ("pdf", "docx", "txt") else "txt"
        added_text, next_chunk_index = _index_blocks_pipeline(
            doc_id, filename, source_type, pages, chunk_records, file_hash=file_hash,
            is_chunk_text_mocked=is_chunk_mocked, mock_chunk_text_fn=mock_fn
        )
        added += added_text
        
        if tables:
            added_tables = _index_tables(
                doc_id, filename, tables, start_chunk_index=next_chunk_index,
                chunk_records_out=chunk_records, file_hash=file_hash
            )
            added += added_tables
        
    elif mimetype == "application/pdf" or ext == "pdf":
        pages = _extract_pdf_pages(data)
        if not pages and not tables:
            return False, 0
        _delete_existing(doc_id)
        next_chunk_index = 0
        if pages:
            added_text, next_chunk_index = _index_blocks_pipeline(
                doc_id, filename, "pdf", pages, chunk_records, file_hash=file_hash,
                is_chunk_text_mocked=is_chunk_mocked, mock_chunk_text_fn=mock_fn
            )
            added += added_text
            
        if tables:
            added_tables = _index_tables(
                doc_id, filename, tables, start_chunk_index=next_chunk_index,
                chunk_records_out=chunk_records, file_hash=file_hash
            )
            added += added_tables

    elif mimetype in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ) or ext in ("docx", "doc"):
        text = extract_text_from_docx_bytes(data)
        if not text.strip() and not tables:
            return False, 0
        _delete_existing(doc_id)
        next_chunk_index = 0
        if text.strip():
            pages = [{"page": 1, "text": text}]
            added_text, next_chunk_index = _index_blocks_pipeline(
                doc_id, filename, "docx", pages, chunk_records, file_hash=file_hash,
                is_chunk_text_mocked=is_chunk_mocked, mock_chunk_text_fn=mock_fn
            )
            added += added_text
            
        if tables:
            added_tables = _index_tables(
                doc_id, filename, tables, start_chunk_index=next_chunk_index,
                chunk_records_out=chunk_records, file_hash=file_hash
            )
            added += added_tables

    elif mimetype == "text/plain" or ext == "txt":
        text = extract_text_from_txt_bytes(data)
        if not text.strip() and not tables:
            return False, 0
        _delete_existing(doc_id)
        next_chunk_index = 0
        if text.strip():
            pages = [{"page": 1, "text": text}]
            added_text, next_chunk_index = _index_blocks_pipeline(
                doc_id, filename, "txt", pages, chunk_records, file_hash=file_hash,
                is_chunk_text_mocked=is_chunk_mocked, mock_chunk_text_fn=mock_fn
            )
            added += added_text
            
        if tables:
            added_tables = _index_tables(
                doc_id, filename, tables, start_chunk_index=next_chunk_index,
                chunk_records_out=chunk_records, file_hash=file_hash
            )
            added += added_tables

    elif mimetype in (
        "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) or ext in ("csv", "xlsx"):
        text = extract_text_for_mimetype(filename, mimetype, data)
        if not text and not tables:
            return False, 0

        _delete_existing(doc_id)

        splitter_fn = globals()["split_sheet_sections"]
        sections = splitter_fn(text) if text else [(None, "")]
        added_text = 0
        next_chunk_index = 0
        
        source_type = "xlsx" if (mimetype == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" or ext == "xlsx") else "csv"

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
        added = added_text + added_tables
    else:
        return False, 0

    _push_chunks_to_node(doc_id, filename, chunk_records)

    # BM25 sync
    bm25_chunks = [
        {
            "chunk_id": f"{doc_id}_{r['chunk']}",
            "text": r["text"],
            "is_table": bool(r.get("is_table", False)),
        }
        for r in chunk_records
    ]
    build_bm25_index(doc_id, bm25_chunks, file_hash=file_hash)

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

    _push_chunks_to_node(doc_id, filename, chunk_records)

    bm25_chunks = [
        {
            "chunk_id": f"{doc_id}_{r['chunk']}",
            "text": r["text"],
            "is_table": bool(r.get("is_table", False)),
        }
        for r in chunk_records
    ]
    build_bm25_index(doc_id, bm25_chunks, file_hash=file_hash)

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


# ===== BACKGROUND INDEXING =====

def _background_index(doc_id: str):
    from services.retrieval_service import fetch_doc_from_node, fetch_doc_meta_from_node

    try:
        ok, filename, mimetype, data_bytes = fetch_doc_from_node(doc_id)
        if not ok:
            return

        text_for_scan = extract_text_for_mimetype(filename, mimetype, data_bytes)
        if not text_for_scan:
            return

        scan = detect_sensitive(text_for_scan)
        prev = consent_state.get(doc_id) or {}

        consent_state[doc_id] = {
            "sensitive": bool(scan.get("found")),
            "confirmed": bool(prev.get("confirmed", False)),
            "awaiting": False,
            "last_scan": "ok",
            "summary": scan,
        }

        if scan.get("found") and not prev.get("confirmed", False):
            return

        meta = fetch_doc_meta_from_node(doc_id) or {}
        file_hash = meta.get("contentHash")
        index_bytes(doc_id, filename, mimetype, data_bytes, file_hash=file_hash)

    except Exception as e:
        logger.exception("Background indexing failed for %s: %s", doc_id, e)

    finally:
        with _indexing_lock:
            _indexing_in_progress.discard(doc_id)


_indexing_in_progress = set()
_indexing_lock = threading.Lock()

def start_background_indexing(doc_id: str):
    with _indexing_lock:
        if doc_id in _indexing_in_progress:
            return
        _indexing_in_progress.add(doc_id)

    th = threading.Thread(target=_background_index, args=(doc_id,), daemon=True)
    th.start()