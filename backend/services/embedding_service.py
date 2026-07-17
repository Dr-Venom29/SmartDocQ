import logging
import concurrent.futures
import google.generativeai as genai
from config import GEMINI_API_KEY, EMBED_MODEL

logger = logging.getLogger(__name__)

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


def _embed_call(text: str):
    return genai.embed_content(
        model=EMBED_MODEL,
        content=text
    )


def _generate_embedding(text: str, timeout_sec: int = 20):
    """Low-level function to perform the Gemini embedding request with a timeout."""
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
            fut = ex.submit(_embed_call, text)
            result = fut.result(timeout=timeout_sec)
            return result.get("embedding") if isinstance(result, dict) else None
    except concurrent.futures.TimeoutError:
        logger.warning("Embedding timeout after %d seconds", timeout_sec)
        return None
    except Exception as e:
        logger.error("Embedding error: %s", e)
        return None


def embed_query(question: str, timeout_sec: int = 20):
    """Format and generate query embedding."""
    if not question or not question.strip():
        return None
    prepared = f"task: question answering | query: {question.strip()}"
    return _generate_embedding(prepared, timeout_sec)


def embed_document(
    text: str,
    title: str | None = None,
    context: str | None = None,
    timeout_sec: int = 20,
):
    """Format and generate document embedding with bounded exponential backoff retries."""
    if not text or not text.strip():
        return None
    title_str = title.strip() if title and title.strip() else "none"
    text_str = text.strip()

    if context and context.strip():
        content = f"{context.strip()}\n\n{text_str}"
    else:
        content = text_str

    prepared = f"title: {title_str} | text: {content}"
    
    import time
    max_attempts = 3
    backoff = 1.0
    for attempt in range(max_attempts):
        emb = _generate_embedding(prepared, timeout_sec)
        if emb:
            return emb
        
        if attempt < max_attempts - 1:
            logger.warning("Embedding failed. Retrying in %s seconds (attempt %d/%d)...", backoff, attempt + 1, max_attempts)
            time.sleep(backoff)
            backoff *= 2
            
    return None
