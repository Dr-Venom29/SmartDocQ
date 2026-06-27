# SmartDoc AI Service (Python/Flask backend)

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `PORT` — Port for the AI service (default: `5001`)
- `FRONTEND_ORIGINS` — Comma-separated CORS allowlist (e.g., `http://localhost:3000,https://your-frontend.vercel.app`)
- `NODE_BASE_URL` — Base URL of the Node.js API used for document download and metadata access
- `SERVICE_TOKEN` — Shared secret that must match the Node API's `SERVICE_TOKEN` for secure server-to-server communication (required)
- `GEMINI_API_KEY` — Google Generative AI API key
- `TEXT_MODEL` — Optional override for the Gemini text model (default: `models/gemini-2.5-flash`)
- `EMBED_MODEL` — Optional override for the embedding model (default: `models/gemini-embedding-2`)
- `INDEX_BATCH_SIZE` — Optional Chroma flush size during indexing (default: `64`)
- `JAILBREAK_THRESHOLD` — Optional weighted threshold for jailbreak detection (default: `3`)
- `BM25_CACHE_TTL` — Optional BM25 cache lifetime in seconds (recommended: 86400)

## Installation & Run

Create and activate a virtual environment, then install dependencies:

```bash
pip install -r requirements.txt
```

Start the AI service:

```bash
python main.py
```

The service runs on port `5001` by default.

## Dependencies

SmartDocQ leverages modern libraries to implement a resilient document understanding and search interface:
- **PyMuPDF4LLM / PyMuPDF (fitz)**: Multi-format PDF layout parser converting PDF text and tables to Markdown.
- **PyPDF2**: Fallback PDF text parser.
- **tiktoken**: Fast byte pair encoding (BPE) tokenizer used for chunk bounds estimation.
- **rank-bm25**: Lexical BM25 indexing and querying.
- **ChromaDB**: High-performance semantic vector database.

## Health Check

- `GET /healthz` → `{ "status": "ok" }`

---

## RESILIENT PDF EXTRACTION

PDF processing is critical to a document RAG system. SmartDocQ implements a robust **Three-tier PDF Extraction Chain** to ensure processing never fails entirely:

1. **Tier 1: PyMuPDF4LLM** (Default) — Extracts text and tables, converting them to rich Markdown structured page-by-page.
2. **Tier 2: PyMuPDF Classic** (Fallback 1) — Used if Tier 1 conversions encounter layout errors, converting raw text page-by-page.
3. **Tier 3: PyPDF2 Reader** (Fallback 2) — Final backup library returning raw unformatted page text if Fitz modules fail to load.

---

## INDEXING PIPELINE & FEATURES

SmartDocQ processes incoming uploads page-by-page through a structured Markdown indexing pipeline:

```mermaid
graph TD
    Upload["Document Upload"] --> Ext["Three-Tier Extraction Chain"]
    Ext --> Normal["Markdown Normalization"]
    Normal --> Parse["Extensible Block Parsing"]
    Parse --> Section["Heading-aware Section Extraction"]
    Section --> Chunker["Block-aware Token Chunking"]
    Chunker --> Headers["Contextual Embedding Headers"]
    Headers --> Embed["Gemini Embeddings<br/>(gemini-embedding-2)"]
    Embed --> Chroma["ChromaDB Storage"]
```

### Key Indexing Features
- **Markdown Normalization**: standardizes bullets, cleans fences, reduces extra lines, merges wrapped lines, and strips running headers/footers/page numbers.
- **Heading-aware Section Extraction**: dynamically traces H1-H5 sections and subsections.
- **Block-aware Chunking**: splits documents on natural Markdown syntax boundaries rather than arbitrary characters.
- **Token-aware Chunk Sizing**: Packs content up to standard token boundaries dynamically estimated using `tiktoken`.
- **Dedicated Table Chunks**: keeps tables isolated, splitting large tables by row groups and repeating column headers on every sub-chunk.
- **Dedicated Code Chunks**: keeps code blocks isolated to prevent Markdown code fence corruption.
- **Contextual Embedding Headers**: prepends document title, section, subsection, and page ranges to query vector generation.
- **Rich Metadata Store**: records all structural page coordinates, counts, hashes, and pipeline versions.
- **Automatic Duplicate Removal**: filters out repeated noise blocks.
- **Automatic Version Validation**: enforces Vector index compatibility checks.

---

## HYBRID RETRIEVAL WORKFLOW

The SmartDocQ hybrid retrieval engine fuses semantic similarity results with lexical index matching, incorporating table-aware relevance weighting and dynamic metadata validation checks:

```mermaid
graph TD
    %% Styles
    classDef query fill:#2d3748,stroke:#4a5568,stroke-width:2px,color:#fff;
    classDef process fill:#1a202c,stroke:#2d3748,stroke-width:1px,color:#cbd5e0;
    classDef fusion fill:#2c7a7b,stroke:#319795,stroke-width:2px,color:#fff;
    classDef output fill:#276749,stroke:#2f855a,stroke-width:2px,color:#fff;

    Query["User Query"]:::query

    subgraph Validation_Subsystem ["Metadata & Version Validation"]
        direction TB
        MetaCheck["Metadata Cache Lookup<br/>(Fast Cached TTL Fetch)"]:::process
        VersionCheck["Version Validation<br/>(Pipeline Version / Model Check)"]:::process
        Reindex["Automatic Reindexing<br/>(Trigger on Version/Hash Mismatch)"]:::process
    end

    subgraph Retrieval_Subsystem ["Retrieval Subsystem"]
        direction TB
        Embed["Query Embedding<br/>(gemini-embedding-2)"]:::process
        VectorSearch["Vector Store Retrieval<br/>(ChromaDB Semantic Search)"]:::process
        BM25Search["Lexical Retrieval<br/>(In-Memory BM25 Cache)"]:::process
    end

    subgraph Ranking_Subsystem ["Ranking & Fusion Subsystem"]
        direction TB
        RRF["Reciprocal Rank Fusion (RRF)<br/>(Combines Vector & Lexical Ranks)"]:::fusion
        Refine["Score Refinement<br/>(Similarity Normalization)"]:::process
        TableBoost["Table-Aware Reranking<br/>(Structured Data Boost)"]:::process
    end

    subgraph Generation_Subsystem ["Generation Subsystem"]
        direction TB
        Context["Top Chunks Context"]:::process
        Gemini["Gemini 2.5 Flash<br/>(Contextual Answer Generation)"]:::output
    end

    %% Flow Connections
    Query --> MetaCheck
    MetaCheck --> VersionCheck
    VersionCheck -->|Mismatch| Reindex
    VersionCheck -->|Valid| Embed
    Query --> BM25Search
    
    Embed --> VectorSearch
    VectorSearch --> RRF
    BM25Search --> RRF
    
    RRF --> Refine
    Refine --> TableBoost
    TableBoost --> Context
    Context --> Gemini
```

### Contextual Chunk Headers

Before sending chunks to the embedding model, SmartDocQ prepends a structural context block to the embedding input:
```text
Document: [filename]
Section: [H1 Section Title]
Subsection: [H2 > H3 Subsection Path]
Pages: [Page / Page Range]
```
This contextual prepending guarantees that relevant facts are retrieved correctly even when page-level chunks lack direct textual keywords. In contrast, ChromaDB stores clean chunk text as documents to prevent lexical BM25 search pollution.

---

## RETRIEVAL QUALITY FEATURES

- **Hybrid Retrieval** (Vector + BM25)
- **Reciprocal Rank Fusion (RRF)**
- **Table-Aware Retrieval**
- **Contextual Chunk Headers** (Section, Subsection, Page Range)
- **Block-aware Chunking**
- **Section-aware Indexing**
- **Page-aware Metadata**
- **Automatic PDF Fallback Chain**
- **Token-aware Chunk Sizing**
- **Automatic Index Version Validation**

---

## SECURITY FEATURES

- Rejects common jailbreak and prompt-manipulation attempts in user questions before retrieval and LLM invocation.
- Treats retrieved document context as untrusted data using guarded `<CONTEXT>` delimiters to reduce document-based prompt injection.
- Detects sensitive data including PAN, Aadhaar, phone numbers, credit cards, emails, and SSN-like patterns.
- Validates credit cards with the Luhn algorithm and Aadhaar numbers with the Verhoeff checksum algorithm to reduce false positives.
- Applies India-focused phone number heuristics for improved detection accuracy.
- Requires explicit user consent before processing documents containing sensitive information.

---

## INDEX LIFECYCLE MANAGEMENT

SmartDocQ tracks detailed version and configuration metadata for every chunk stored in ChromaDB:

- `embedding_model` — embedding model used to generate the vector (e.g., `models/gemini-embedding-2`)
- `pipeline_version` — indexing pipeline version (chunking, cleaning, preprocessing)
- `chunking_version` — data schema version for chunk layout properties
- `indexed_at` — UTC timestamp when the chunk was indexed
- `file_hash` — source document content hash used to detect document changes

Before retrieval, the system checks whether stored vectors are compatible with the current configuration.

### Automatic Reindexing Behavior

- **Embedding model changes** trigger automatic background reindexing and temporarily block retrieval because vectors generated by different models are mathematically incompatible.
- **Pipeline version changes** trigger background reindexing while continuing to serve the existing index.
- **Source document content changes** (file hash mismatch) trigger automatic reindexing.
- **Legacy chunks** without version metadata remain backward compatible and are upgraded automatically.

---

## TESTING

Note: `SERVICE_TOKEN` is required to import some modules; set it in your environment (a dummy value is fine for unit tests).

Run the full automated unit test suite:

```bash
python -m pytest
```

Or run specific test modules in verbose mode:

```bash
# Run chunking unit tests (blocks, tables, code splitting, overlap)
python -m pytest tests/test_chunking.py -v

# Run indexing pipeline unit tests (PDF extraction chain fallbacks, metadata)
python -m pytest tests/test_indexer.py -v

# Run retrieval unit tests (hybrid search, BM25, metadata caching)
python -m pytest tests/test_retrieval_service.py -v

# Run security checks tests (sensitive detectors, Aadhaar, CC verification)
python -m pytest tests/test_security.py -v

# Run vector store versioning and lifecycle tests
python -m pytest tests/test_vector_versioning.py -v
```
