from flask import Blueprint, request, jsonify
import logging

from config import URL_REGEX, FLASK_DEBUG
from indexing.indexer import start_background_indexing
from state.memory_store import consent_state, general_fallback
from services.retrieval_service import retrieve_context
from services.vector_versioning import get_reindex_status
from services.llm_service import generate_answer_from_context, generate_general_answer
from services.document_service import suggest_topics_for_doc, GENERIC_TOPICS
from utils.security import is_greeting_or_smalltalk, contains_profanity, contains_jailbreak_attempt
from utils.formatting import format_response, is_out_of_doc_answer

ask_bp = Blueprint("ask", __name__)

logger = logging.getLogger(__name__)

_NO_CONTEXT_MSG = (
    "I couldn't find relevant information about your question in the uploaded document.\n"
    'Do you want me to answer using general knowledge instead? Reply "y" for yes or "n" for no.'
)
_FALLBACK_PROMPT = 'Do you want me to answer using general knowledge instead? Reply "y" for yes or "n" for no.'


@ask_bp.route("/api/document/ask", methods=["POST"])
def ask_doc():
    data = request.get_json(silent=True) or {}
    question = data.get("question", "").strip()
    doc_id = data.get("doc_id", "").strip()

    if not question:
        return jsonify({"error": "Missing question"}), 400

    # --- Greeting / small-talk ---
    if is_greeting_or_smalltalk(question):
        topics = suggest_topics_for_doc(doc_id) if doc_id else GENERIC_TOPICS[:6]
        bullet = "\n".join(f"- {t}" for t in topics)
        msg = (
            "Hello! 👋 I'm here to help you with your document. "
            "You can ask questions about the following sections/topics in your document:\n"
            f"{bullet}\n\nPlease type a question related to one of these topics."
        )
        return jsonify({"answer": msg, "requireConfirmation": False})

    # --- Input guards ---
    if URL_REGEX.search(question):
        return jsonify({"answer": "⚠️ No links allowed. Please ask using text only."}), 422
    if contains_profanity(question):
        return jsonify({"answer": "⚠️ Please avoid using offensive words."}), 422
    if contains_jailbreak_attempt(question):
        return jsonify({
            "answer": (
                "⚠️ Your message contains instructions intended to override the assistant’s safety rules. "
                "Please ask a question about the uploaded document content."
            ),
            "requireConfirmation": False,
        }), 422

    if not doc_id:
        return jsonify({"error": "Missing doc_id"}), 400

    try:
        # --- Consent gate ---
        state = consent_state.get(doc_id) or {"sensitive": False, "confirmed": False, "awaiting": False}
        if state.get("sensitive") and not state.get("confirmed"):
            q_lower = question.lower().strip()
            if q_lower in ("y", "yes"):
                state.update({"confirmed": True, "awaiting": False})
                consent_state[doc_id] = state
                return jsonify({"answer": "Proceeding. You can now ask questions about this document.", "requireConfirmation": False})
            if q_lower in ("n", "no"):
                state["awaiting"] = False
                consent_state[doc_id] = state
                return jsonify({"answer": "Chat cancelled. Please re-upload a cleaned version of the document without sensitive data.", "requireConfirmation": False})
            state["awaiting"] = True
            consent_state[doc_id] = state
            return jsonify({
                "answer": "⚠️ Sensitive or private information detected in this document (e.g., personal IDs, contact info, or financial data).\nDo you still want to proceed with chatting about it? (y/n)",
                "requireConfirmation": True,
                "sensitiveSummary": state.get("summary", {}),
            })

        # --- General-knowledge fallback gate ---
        gf = general_fallback.get(doc_id) or {"awaiting": False}
        if gf.get("awaiting"):
            q_lower = question.lower().strip()
            if q_lower in ("y", "yes"):
                orig_q = gf.get("pending_question") or ""
                general_fallback[doc_id] = {"awaiting": False}
                if not orig_q:
                    return jsonify({"answer": "Okay, please ask your question again."})
                answer = generate_general_answer(orig_q)
                return jsonify({"answer": format_response(answer) if answer else "⚠️ Could not generate a general answer."})
            if q_lower in ("n", "no"):
                general_fallback[doc_id] = {"awaiting": False}
                return jsonify({"answer": "Okay, I won't answer that. Please ask a question based on the uploaded document."})
            return jsonify({"answer": _NO_CONTEXT_MSG})

        # --- Background index trigger ---
        # Prefer serving only vectors generated with the active embedding model.
        # - If no vectors exist => index.
        # - If vectors exist but are from a different model => reindex (block retrieval).
        # - If vectors are legacy (no embedding_model metadata yet) => reindex in background,
        #   but still allow retrieval to preserve backward compatibility.
        status = get_reindex_status(doc_id)
        if status.reason in ("no_vectors", "model_mismatch", "error"):
            start_background_indexing(doc_id)
            msg = "Indexing this document in the background. Please try your question again in ~30–60 seconds."
            if status.reason == "model_mismatch":
                msg = "Reindexing this document due to an embedding model change. Please try again in ~30–60 seconds."
            return jsonify({"answer": msg, "requireConfirmation": False})
        if status.reason in ("missing_metadata", "pipeline_version_mismatch"):
            # Existing vectors are still usable; refresh in background.
            start_background_indexing(doc_id)

        # --- Retrieve context (embedding + ranking lives in retrieval_service) ---
        context, err = retrieve_context(question, doc_id)
        if err:
            return jsonify({"error": err}), 500
        if context is None:
            general_fallback[doc_id] = {"awaiting": True, "pending_question": question}
            return jsonify({"answer": _NO_CONTEXT_MSG})

        # --- Generate answer ---
        raw_text = generate_answer_from_context(question, context)
        if not raw_text:
            return jsonify({"answer": "⚠️ Could not generate answer."})

        if is_out_of_doc_answer(raw_text):
            general_fallback[doc_id] = {"awaiting": True, "pending_question": question}
            appended = raw_text + f"\n\n{_FALLBACK_PROMPT}"
            return jsonify({"answer": format_response(appended), "requireConfirmation": False})

        return jsonify({"answer": format_response(raw_text), "requireConfirmation": False})

    except Exception as e:
        logger.exception("Unexpected error in /api/document/ask")
        message = str(e) if FLASK_DEBUG else "An unexpected server error occurred."
        return jsonify({"error": message}), 500
