import concurrent.futures
import google.generativeai as genai
from config import GEMINI_API_KEY, EMBED_MODEL

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
        print("Embedding timeout after", timeout_sec, "seconds")
        return None
    except Exception as e:
        print("Embedding error:", e)
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
    """Format and generate document embedding."""
    if not text or not text.strip():
        return None
    title_str = title.strip() if title and title.strip() else "none"
    text_str = text.strip()

    if context and context.strip():
        content = f"{context.strip()}\n\n{text_str}"
    else:
        content = text_str

    prepared = f"title: {title_str} | text: {content}"
    return _generate_embedding(prepared, timeout_sec)
