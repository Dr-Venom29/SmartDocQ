import logging

from utils.extraction import extract_text_for_mimetype
from utils.security import detect_sensitive
from state.memory_store import consent_state

logger = logging.getLogger(__name__)


def _background_index(doc_id: str, *, indexing_lock, indexing_in_progress):
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

        from indexing.indexer import index_bytes

        index_bytes(doc_id, filename, mimetype, data_bytes, file_hash=file_hash)

    except Exception as e:
        logger.exception("Background indexing failed for %s: %s", doc_id, e)

    finally:
        with indexing_lock:
            indexing_in_progress.discard(doc_id)