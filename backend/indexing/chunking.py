import re


_PARAGRAPH_SPLITTER = re.compile(r"\n\s*\n")
_SHEET_PATTERN = re.compile(r"^\s*#\s*Sheet:\s*(.*)", re.IGNORECASE)

def _split_large_para(p: str, size: int) -> list:
    return [p[i:i + size] for i in range(0, len(p), size)]


def chunk_text(text: str, size: int = 1000, overlap: int = 200) -> list:
    if size <= 0:
        raise ValueError("size must be positive")
    if overlap < 0:
        raise ValueError("overlap must be non-negative")
    if overlap >= size:
        overlap = size // 2

    text = (text or "").strip()
    if not text:
        return []

    paras = [p.strip() for p in _PARAGRAPH_SPLITTER.split(text) if p.strip()]
    if not paras:
        paras = [text]

    windows = []
    buf = []
    cur_len = 0

    for p in paras:

        # handle large paragraph
        if len(p) > size:
            if buf:
                windows.append("\n\n".join(buf))
                buf = []
                cur_len = 0

            windows.extend(_split_large_para(p, size))
            continue

        p_len = len(p) + 2

        if cur_len + p_len <= size or not buf:
            buf.append(p)
            cur_len += p_len
        else:
            joined = "\n\n".join(buf) 
            windows.append(joined)

            if overlap > 0 and len(joined) > overlap:
                tail = joined[-overlap:]
                buf = [tail, p]
                cur_len = len(tail) + p_len
            else:
                buf = [p]
                cur_len = p_len

    if buf:
        windows.append("\n\n".join(buf))

    return windows


def split_sheet_sections(text: str) -> list:
    lines = (text or "").splitlines()
    sections = []
    current_name = None
    current_lines = []
    found = False

    for ln in lines:
        #regex-based flexible matching
        m = _SHEET_PATTERN.match(ln)
        if m:
            found = True
            if current_lines:
                sections.append((current_name, "\n".join(current_lines).strip()))
                current_lines = []
            current_name = m.group(1).strip() or None
        else:
            current_lines.append(ln)

    if current_lines:
        sections.append((current_name, "\n".join(current_lines).strip()))

    if not found:
        return [(None, text or "")]

    return [(name, body) for (name, body) in sections if (body or "").strip()]