# SmartDoc AI Service (Python/Flask backend)

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `PORT` — Port for the AI service (default: `5001`)
- `FRONTEND_ORIGINS` — Comma-separated CORS allowlist (e.g., `http://localhost:3000,https://your-frontend.vercel.app`)
- `NODE_BASE_URL` — Base URL of the Node.js API used for document download and metadata access
- `SERVICE_TOKEN` — Shared secret that must match the Node API's `SERVICE_TOKEN` for secure server-to-server communication
- `GEMINI_API_KEY` — Google Generative AI API key
- `TEXT_MODEL` — Optional override for the Gemini text model (default: `models/gemini-2.5-flash`)
- `EMBED_MODEL` — Optional override for the embedding model (default: `models/gemini-embedding-2`)
- `JAILBREAK_THRESHOLD` — Optional weighted threshold for jailbreak detection (default: `3`)

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

## Health Check

- `GET /healthz` → `{ "status": "ok" }`

## Security Features

- Rejects common jailbreak and prompt-manipulation attempts in user questions before retrieval and LLM invocation
- Treats retrieved document context as untrusted data using guarded `<CONTEXT>` delimiters to reduce document-based prompt injection
- Detects sensitive data including PAN, Aadhaar, phone numbers, credit cards, emails, and SSN-like patterns
- Validates credit cards with the Luhn algorithm and Aadhaar numbers with the Verhoeff checksum algorithm to reduce false positives
- Applies India-focused phone number heuristics for improved detection accuracy
- Requires explicit user consent before processing documents containing sensitive information

## Testing

Run automated unit tests for the security module:

```bash
python -m pytest tests/test_security.py -v
```
