"""Unit tests for indexing/chunking.py

These tests cover:
- _split_large_para
- chunk_text
- split_sheet_sections

Run:
    cd backend
    python -m pytest tests/test_chunking.py -v
"""

import pytest

from indexing import chunking
from indexing.chunking import (
    _word_boundary_tail,
    _nearest_word_boundary,
    _split_large_para,
    chunk_text,
    split_sheet_sections,
    estimate_token_count,
    normalize_markdown_page,
    remove_page_artifacts_and_repeated_headers,
    parse_markdown_blocks,
    extract_sections_and_headings,
    pack_blocks_into_chunks,
    split_large_table_block,
    split_large_block_content,
)


# =========================
# _split_large_para
# =========================

def test_split_large_para_exact_multiple():
    text = "a" * 2000
    chunks = _split_large_para(text, 1000)

    assert len(chunks) == 2
    assert all(len(c) == 1000 for c in chunks)


def test_split_large_para_non_multiple():
    text = "a" * 2500
    chunks = _split_large_para(text, 1000)

    assert len(chunks) == 3
    assert len(chunks[0]) == 1000
    assert len(chunks[1]) == 1000
    assert len(chunks[2]) == 500


def test_split_large_para_word_safe_splits_on_spaces():
    text = ("hello world project title " * 50).strip()
    chunks = _split_large_para(text, 120)

    assert len(chunks) > 1
    assert all(chunks)
    assert all(len(c) <= 120 for c in chunks)
    # Since the input has regular single spaces, splitting should be lossless.
    assert " ".join(chunks) == text


# =========================
# chunk_text
# =========================

def test_chunk_text_empty_input():
    assert chunk_text("") == []
    assert chunk_text(None) == []


def test_chunk_text_single_small_paragraph():
    text = "This is a short paragraph."
    chunks = chunk_text(text)

    assert len(chunks) == 1
    assert chunks[0] == text


def test_chunk_text_multiple_paragraphs_fit_one_chunk():
    text = "Paragraph one.\n\nParagraph two."
    chunks = chunk_text(text, size=1000)

    assert len(chunks) == 1
    assert "Paragraph one." in chunks[0]
    assert "Paragraph two." in chunks[0]


def test_chunk_text_creates_multiple_chunks():
    p1 = "a" * 600
    p2 = "b" * 600

    chunks = chunk_text(f"{p1}\n\n{p2}", size=1000, overlap=0)

    assert len(chunks) == 2
    assert chunks[0] == p1
    assert chunks[1] == p2


def test_chunk_text_overlap_applied():
    p1 = "a" * 800
    p2 = "b" * 300

    chunks = chunk_text(f"{p1}\n\n{p2}", size=1000, overlap=200)

    assert len(chunks) == 2
    assert chunks[1].startswith("a" * 200)


def test_word_boundary_tail_prefers_paragraph_boundary():
    text = "Intro\n\nProject title and details follow."
    tail = _word_boundary_tail(text, desired_len=30)
    assert tail.startswith("Project title")


def test_word_boundary_tail_moves_forward_to_whitespace():
    text = "hello project title"
    # This cut is intentionally inside "project".
    tail = _word_boundary_tail(text, desired_len=10)
    # Nearest-boundary snapping prefers preserving more identifier context.
    assert tail == "project title"


def test_word_boundary_tail_falls_back_when_no_whitespace():
    text = "aaaaaaaaaabbbbbbbbbbcccccccccc"
    tail = _word_boundary_tail(text, desired_len=10)
    assert tail == text[-10:]


def test_nearest_word_boundary_prefers_backward_on_tie():
    text = "hello project title"
    # cut inside 'project' such that back and forward whitespace are equally distant
    cut = len(text) - 10
    idx = _nearest_word_boundary(text, cut)
    assert idx == text.find(" ") + 1  # position after space after 'hello'


def test_nearest_word_boundary_chooses_forward_when_closer():
    text = "hello project title"
    # A cut very close to the whitespace after 'project' should pick forward
    cut = text.find("title") - 1
    idx = _nearest_word_boundary(text, cut)
    assert idx == text.find(" ", text.find("project"))


def test_word_boundary_tail_preserves_identifier_near_cut():
    text = "Team 47QZ9K2M7P project title mapping"
    # Choose desired_len so the cut lands inside the identifier token.
    tail = _word_boundary_tail(text, desired_len=27)
    assert tail.startswith("47QZ9K2M7P")


def test_word_boundary_tail_paragraph_snap_must_retain_min_overlap():
    # Paragraph boundary exists inside overlap window, but tail after it is tiny.
    text = "alpha beta gamma delta epsilon\n\nX"
    tail = _word_boundary_tail(text, desired_len=20)
    # With MIN_OVERLAP_RATIO=0.5, we should NOT return just 'X'.
    assert tail != "X"
    assert len(tail) >= 10


def test_chunk_text_overlap_uses_word_boundary_tail():
    # Force a split so overlap is used.
    p1 = ("alpha beta project title " * 8).strip()
    p2 = ("next paragraph starts here " * 8).strip()

    chunks = chunk_text(f"{p1}\n\n{p2}", size=250, overlap=60)
    assert len(chunks) == 2

    expected_tail = _word_boundary_tail(chunks[0], 60)
    assert chunks[1].startswith(expected_tail)


def test_chunk_text_large_paragraph_split():
    text = "x" * 2500
    chunks = chunk_text(text, size=1000)

    assert len(chunks) == 3
    assert len(chunks[0]) == 1000
    assert len(chunks[1]) == 1000
    assert len(chunks[2]) == 500


def test_chunk_text_no_empty_chunks():
    text = "\n\n\nParagraph\n\n\n"
    chunks = chunk_text(text)

    assert len(chunks) == 1
    assert chunks[0] == "Paragraph"


# =========================
# split_sheet_sections
# =========================

def test_split_sheet_sections_no_markers():
    text = "Simple text"
    sections = split_sheet_sections(text)

    assert sections == [(None, "Simple text")]


def test_split_sheet_sections_single_sheet():
    text = "# Sheet: Students\nAlice\nBob"
    sections = split_sheet_sections(text)

    assert len(sections) == 1
    assert sections[0][0] == "Students"
    assert "Alice" in sections[0][1]


def test_split_sheet_sections_multiple_sheets():
    text = (
        "# Sheet: Students\n"
        "Alice\nBob\n"
        "# Sheet: Marks\n"
        "95\n88"
    )

    sections = split_sheet_sections(text)

    assert len(sections) == 2
    assert sections[0][0] == "Students"
    assert sections[1][0] == "Marks"


def test_split_sheet_sections_case_insensitive():
    text = "# sheet: Data\nvalue"
    sections = split_sheet_sections(text)

    assert sections[0][0] == "Data"


def test_split_sheet_sections_ignores_empty_sections():
    text = "# Sheet: Empty\n\n# Sheet: Data\nValue"
    sections = split_sheet_sections(text)

    assert len(sections) == 1
    assert sections[0][0] == "Data"


# =========================
# Additional Edge Case Tests
# =========================


def test_chunk_text_no_overlap_when_overlap_zero():
    p1 = "a" * 800
    p2 = "b" * 300

    chunks = chunk_text(f"{p1}\n\n{p2}", size=1000, overlap=0)

    assert len(chunks) == 2
    assert chunks[0] == p1
    assert chunks[1] == p2
    assert not chunks[1].startswith("a" * 200)


def test_chunk_text_large_paragraph_between_small_paragraphs():
    small1 = "Introduction paragraph."
    large = "x" * 2500
    small2 = "Conclusion paragraph."

    text = f"{small1}\n\n{large}\n\n{small2}"
    chunks = chunk_text(text, size=1000)

    # small1 + three large chunks + small2
    assert len(chunks) == 5

    assert chunks[0] == small1
    assert len(chunks[1]) == 1000
    assert len(chunks[2]) == 1000
    assert len(chunks[3]) == 500
    assert chunks[4] == small2


def test_chunk_text_whitespace_only_returns_empty():
    assert chunk_text("   \n\n   ") == []


def test_split_sheet_sections_empty_input():
    assert split_sheet_sections("") == [(None, "")]
    assert split_sheet_sections(None) == [(None, "")]


def test_split_sheet_sections_blank_sheet_name():
    text = "# Sheet:\nValue1\nValue2"
    sections = split_sheet_sections(text)

    assert len(sections) == 1
    assert sections[0][0] is None
    assert "Value1" in sections[0][1]


def test_chunk_text_size_zero_raises_value_error():
    with pytest.raises(ValueError, match="size must be positive"):
        chunk_text("hello", size=0)


def test_chunk_text_negative_overlap_raises_value_error():
    with pytest.raises(ValueError, match="overlap must be non-negative"):
        chunk_text("hello", overlap=-1)


def test_chunk_text_overlap_auto_adjusts_when_overlap_ge_size():
    # overlap >= size should auto-adjust and still behave normally.
    chunks = chunk_text("hello", size=100, overlap=100)
    assert chunks == ["hello"]


# ============================================================================
# Upgraded PDF Indexing Pipeline Chunking Tests
# ============================================================================

def test_estimate_token_count():
    assert estimate_token_count("") == 0
    text = "one two three four five six seven eight nine ten"
    assert estimate_token_count(text) >= 10


def test_normalize_markdown_page():
    raw = """
#Heading
Some line that ends mid-sentence
and continues on the next line.

* Bullet 1
+ Bullet 2
- Bullet 3

~~~python
print("hello")
~~~
    """
    normalized = normalize_markdown_page(raw)
    
    assert "# Heading" in normalized
    assert "- Bullet 1" in normalized
    assert "- Bullet 2" in normalized
    assert "- Bullet 3" in normalized
    assert "```python" in normalized
    assert "Some line that ends mid-sentence and continues on the next line." in normalized


def test_remove_page_artifacts_and_repeated_headers():
    pages = [
        {"page": 1, "text": "SmartDocQ Manual\nPage 1\nContent of page 1"},
        {"page": 2, "text": "SmartDocQ Manual\nPage 2\nContent of page 2"},
        {"page": 3, "text": "SmartDocQ Manual\nPage 3\nContent of page 3"}
    ]
    cleaned = remove_page_artifacts_and_repeated_headers(pages)
    
    for p in cleaned:
        assert "SmartDocQ Manual" not in p["text"]
        assert "Page 1" not in p["text"]
        assert "Page 2" not in p["text"]
        
    assert "Content of page 1" in cleaned[0]["text"]


def test_parse_markdown_blocks():
    text = """# Section Title

This is a paragraph.

- List Item 1
- List Item 2

| Col 1 | Col 2 |
|---|---|
| val 1 | val 2 |

```python
x = 1
```

> Blockquote here"""
    blocks = parse_markdown_blocks(text, 1)
    
    block_types = [b["type"] for b in blocks]
    assert "heading" in block_types
    assert "paragraph" in block_types
    assert "list" in block_types
    assert "table" in block_types
    assert "code" in block_types
    assert "blockquote" in block_types
    
    heading_block = [b for b in blocks if b["type"] == "heading"][0]
    assert heading_block["content"] == "# Section Title"
    
    list_block = [b for b in blocks if b["type"] == "list"][0]
    assert "- List Item 1\n- List Item 2" in list_block["content"]


def test_extract_sections_and_headings():
    blocks = [
        {"type": "heading", "content": "# H1 Title", "page": 1},
        {"type": "paragraph", "content": "Paragraph in H1", "page": 1},
        {"type": "heading", "content": "## H2 Subtitle", "page": 1},
        {"type": "paragraph", "content": "Paragraph in H2", "page": 1},
        {"type": "heading", "content": "### H3 Deep Title", "page": 2},
        {"type": "paragraph", "content": "Paragraph in H3", "page": 2},
        {"type": "heading", "content": "# References", "page": 2},
        {"type": "paragraph", "content": "Ref 1. Paper title", "page": 2}
    ]
    
    sections = extract_sections_and_headings(blocks)
    
    # "References" section is ignored by default under references filter
    assert len(sections) == 1
    assert sections[0]["section_title"] == "H1 Title"
    
    sec_blocks = sections[0]["blocks"]
    assert sec_blocks[1]["section"] == "H1 Title"
    assert sec_blocks[1]["subsection"] is None
    
    assert sec_blocks[3]["section"] == "H1 Title"
    assert sec_blocks[3]["subsection"] == "H2 Subtitle"
    
    assert sec_blocks[5]["section"] == "H1 Title"
    assert sec_blocks[5]["subsection"] == "H2 Subtitle > H3 Deep Title"


def test_pack_blocks_into_chunks(monkeypatch):
    # Set targets small to force chunking
    monkeypatch.setattr(chunking, "CHUNK_TARGET_TOKENS", 40)
    monkeypatch.setattr(chunking, "CHUNK_SOFT_LIMIT", 50)
    monkeypatch.setattr(chunking, "CHUNK_HARD_LIMIT", 60)
    monkeypatch.setattr(chunking, "CHUNK_OVERLAP_TOKENS", 10)
    
    blocks = [
        {"type": "heading", "content": "# Section 1", "page": 1, "section": "Section 1", "subsection": None, "heading_level": 1},
        {"type": "paragraph", "content": "A short sentence representing block one.", "page": 1, "section": "Section 1", "subsection": None, "heading_level": 1},
        {"type": "paragraph", "content": "A second block representing block two.", "page": 1, "section": "Section 1", "subsection": None, "heading_level": 1},
        {"type": "table", "content": "| Col A |\n|---|", "page": 2, "section": "Section 1", "subsection": None, "heading_level": 1},
        {"type": "paragraph", "content": "A third block representing block three.", "page": 2, "section": "Section 1", "subsection": None, "heading_level": 1}
    ]
    
    sections = [{"section_title": "Section 1", "section_index": 0, "blocks": blocks}]
    chunks = pack_blocks_into_chunks(sections)
    
    # Table must be isolated
    assert len(chunks) == 3
    
    table_chunk = chunks[1]
    assert table_chunk["chunk_type"] == "table"
    assert "| Col A |" in table_chunk["text"]
    assert table_chunk["start_page"] == 2
    
    assert chunks[0]["chunk_type"] == "paragraph"
    assert chunks[2]["chunk_type"] == "paragraph"


# ============================================================================
# Heading Hierarchy & Reference Filtering Tests
# ============================================================================

def test_heading_nesting_deep():
    blocks = [
        {"type": "heading", "content": "# Level 1", "page": 1},
        {"type": "heading", "content": "## Level 2", "page": 1},
        {"type": "heading", "content": "### Level 3", "page": 1},
        {"type": "heading", "content": "#### Level 4", "page": 2},
        {"type": "heading", "content": "##### Level 5", "page": 2},
        {"type": "paragraph", "content": "Deep block content", "page": 2}
    ]
    sections = extract_sections_and_headings(blocks)
    assert len(sections) == 1
    sec_blocks = sections[0]["blocks"]
    deep_para = sec_blocks[-1]
    assert deep_para["section"] == "Level 1"
    assert deep_para["subsection"] == "Level 2 > Level 3 > Level 4 > Level 5"
    assert deep_para["heading_level"] == 5


def test_reference_filtering(monkeypatch):
    monkeypatch.setattr(chunking, "IGNORE_REFERENCE_SECTIONS", True)
    blocks = [
        {"type": "heading", "content": "# Introduction", "page": 1},
        {"type": "paragraph", "content": "Intro body", "page": 1},
        {"type": "heading", "content": "# Bibliography", "page": 2},
        {"type": "paragraph", "content": "Author, Title, 2026.", "page": 2}
    ]
    sections = extract_sections_and_headings(blocks)
    # The bibliography section should be filtered out
    assert len(sections) == 1
    assert sections[0]["section_title"] == "Introduction"


# ============================================================================
# Large Table & Code Splitting & Overlap/Isolation Tests
# ============================================================================

def test_large_table_splitting(monkeypatch):
    monkeypatch.setattr(chunking, "CHUNK_TARGET_TOKENS", 40)
    monkeypatch.setattr(chunking, "CHUNK_SOFT_LIMIT", 50)
    # Target table with 10 rows which will exceed token limits
    table_lines = [
        "| Name | Score |",
        "|---|---|",
    ]
    for i in range(10):
        table_lines.append(f"| Student{i} | {90 + i} |")
    table_content = "\n".join(table_lines)
    
    # Split the table
    sub_tables = split_large_table_block(table_content, max_tokens=40)
    assert len(sub_tables) > 1
    for st in sub_tables:
        # Columns header should be prepended to every split chunk
        assert "| Name | Score |" in st
        assert "|---|---|" in st


def test_large_code_splitting():
    code_content = "```python\n" + "\n".join(f"x = {i}" for i in range(200)) + "\n```"
    sub_codes = split_large_block_content(code_content, max_tokens=50, overlap_tokens=10)
    assert len(sub_codes) > 1
    for sc in sub_codes:
        assert len(sc) > 0


def test_overlap_rules_and_isolation(monkeypatch):
    monkeypatch.setattr(chunking, "CHUNK_TARGET_TOKENS", 30)
    monkeypatch.setattr(chunking, "CHUNK_SOFT_LIMIT", 40)
    monkeypatch.setattr(chunking, "CHUNK_HARD_LIMIT", 50)
    monkeypatch.setattr(chunking, "CHUNK_OVERLAP_TOKENS", 10)
    
    blocks = [
        {"type": "heading", "content": "# Section 1", "page": 1, "section": "Section 1", "subsection": None, "heading_level": 1},
        {"type": "paragraph", "content": "Paragraph one is sufficiently long to fill space.", "page": 1, "section": "Section 1", "subsection": None, "heading_level": 1},
        {"type": "paragraph", "content": "Paragraph two is also long and will trigger split.", "page": 1, "section": "Section 1", "subsection": None, "heading_level": 1},
        {"type": "table", "content": "| A |\n|---|", "page": 2, "section": "Section 1", "subsection": None, "heading_level": 1},
        {"type": "code", "content": "```python\nx = 1\n```", "page": 2, "section": "Section 1", "subsection": None, "heading_level": 1},
        {"type": "paragraph", "content": "Paragraph three follows code block.", "page": 2, "section": "Section 1", "subsection": None, "heading_level": 1}
    ]
    
    sections = [{"section_title": "Section 1", "section_index": 0, "blocks": blocks}]
    chunks = pack_blocks_into_chunks(sections)
    
    # Expected:
    # Chunk 0: Paragraph 1 + Paragraph 2 (with overlap)
    # Chunk 1: Table (isolated, no overlap)
    # Chunk 2: Code (isolated, no overlap)
    # Chunk 3: Paragraph 3
    
    assert len(chunks) == 4
    
    # Table chunk should have no prepended overlap
    table_chunk = chunks[1]
    assert table_chunk["chunk_type"] == "table"
    assert "Paragraph" not in table_chunk["text"]
    
    # Code chunk should have no prepended overlap
    code_chunk = chunks[2]
    assert code_chunk["chunk_type"] == "code"
    assert "| A |" not in code_chunk["text"]
    assert "Paragraph" not in code_chunk["text"]


