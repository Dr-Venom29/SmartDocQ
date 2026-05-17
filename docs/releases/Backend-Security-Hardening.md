
# SmartDocQ Backend Update — AI Security Hardening, Privacy Validation & Secure Error Handling

**Date:** 2026-05-18  
**Modules:** Python backend (`backend/`) with minor cross-service configuration updates  
**Category:** AI Security · Privacy Protection · Secure Error Handling · Automated Testing

---

## Problem Summary

This release addresses multiple security and reliability gaps in the SmartDocQ AI service. The issues were not theoretical: each gap represented a realistic operational risk when running the system in production and when processing untrusted documents/user prompts.

### 1) Prompt Injection Risk

**Impact:** Retrieved document text is user-controlled input. If inserted directly into an LLM prompt without guardrails, malicious content can attempt to override system rules (e.g., “ignore previous instructions”). This can lead to policy bypass, hallucinated outputs, or unintended disclosure of internal prompt structure.

**Root cause:** The LLM prompting layer previously did not consistently treat retrieved context as *untrusted data* with strict separation between instructions and reference material.

### 2) Jailbreak Attempts

**Impact:** Users can intentionally submit prompts that attempt to override the assistant’s behavior, extract system/developer prompts, or bypass safeguards. Without pre-LLM gating, these prompts can consume LLM budget and increase the risk of unsafe or non-compliant output.

**Root cause:** There was no centralized, configurable policy threshold controlling when a user message should be treated as a jailbreak/prompt-injection attempt.

### 3) Sensitive Data False Positives

**Impact:** Regex-only detection can over-flag benign numeric strings as credit cards/Aadhaar/phones. This creates unnecessary friction in consent flows and decreases trust in privacy guardrails.

**Root cause:** Pattern matching alone is insufficient for high-entropy identifiers; checksum/heuristic validation is required to improve precision.

### 4) Information Disclosure via Error Messages

**Impact:** Several Flask endpoints returned raw exception messages via `{"error": str(e)}`. While this typically does not expose secrets like `GEMINI_API_KEY`, it can reveal:
- internal URLs and service topology (Node/Flask endpoints)
- file paths and runtime locations
- library and model identifiers
- environment variable names and configuration assumptions

This information materially improves an attacker’s ability to probe and exploit the system.

**Root cause:** Exception handling favored client-visible debugging over production-safe error responses.

### 5) Lack of Automated Regression Tests

**Impact:** Security-critical utilities (checksum validators, jailbreak filters, greeting detection, and sensitive detection logic) could regress silently. This increases long-term maintenance risk as features evolve.

**Root cause:** No unit test coverage existed for core security utilities.

---

## Implemented Solution — Multi-Layer Security Hardening

### Summary of Fix

SmartDocQ now applies layered defenses before and during LLM invocation:
- user-input guards (jailbreak detection, profanity, link checks)
- privacy validation (checksum + heuristic-based validation)
- context-guarded prompt construction that treats retrieved context as untrusted
- production-safe error handling (log full tracebacks internally, return generic errors externally)
- automated regression tests for the security module

### 1) Prompt Injection Defense

The LLM prompt now clearly separates instructions from retrieved document content:

- Retrieved content is wrapped inside guarded `<CONTEXT>` delimiters.
- The prompt includes explicit rules that treat the context as *untrusted source material*.
- The model is instructed to ignore any attempts inside `<CONTEXT>` to alter behavior, rules, or role.

This change is implemented in the LLM generation layer, ensuring a single, consistent defense point for all document-grounded answers.

### 2) Weighted Jailbreak Detection

User messages are screened using a high-precision, weighted scoring approach:

- A set of intentionally narrow patterns is scored (e.g., “ignore previous instructions”, “reveal the system prompt”).
- Broad or ambiguous phrases such as `act as` / `pretend you are` are intentionally *not* used for scoring to avoid false positives.
- The enforcement policy is centralized via a configurable threshold.

**Configurable policy:**
- `JAILBREAK_THRESHOLD` controls the score at which a message is treated as a jailbreak attempt.
- Default value is conservative and can be tuned via environment variables without code changes.

### 3) Advanced Sensitive Data Validation

Sensitive detection has been upgraded from regex-only detection to validation-based detection for high-risk identifiers:

- **Credit cards:** Luhn checksum validation applied after pattern matching.
- **Aadhaar:** Verhoeff checksum validation applied after pattern matching.
- **India phone numbers:** India-focused heuristics (optional `+91`, optional leading `0`, and valid leading digit range) reduce misclassification.

**Outcome:** substantially fewer false positives while preserving detection of real sensitive identifiers.

### 4) Improved Greeting Detection

Greeting detection has been tightened to avoid misclassifying legitimate questions:

- Only short messages are eligible for greeting/small-talk classification.
- Full-message matching is used instead of substring matching.
- Removed ambiguous abbreviations (e.g., `ge`) to prevent collisions with technical identifiers and company names.

### 5) Hardened Error Handling

Error handling is now production-safe by default:

- Client responses no longer include raw exception strings.
- Full exception details (including stack traces) are preserved in server logs using `logger.exception(...)`.
- Detailed exception text is exposed to clients only when explicitly enabled for development via `FLASK_DEBUG=1`.
- `retrieval_service.py` no longer propagates raw exception strings from internal failures.

This reduces information leakage while preserving debuggability during development and incident response.

### 6) Automated Testing

Added `pytest` unit tests covering:

- Luhn (credit card) validation
- Verhoeff (Aadhaar) validation using a synthetic checksum-valid generator
- India-focused phone validation
- Sensitive detection integration behavior
- Greeting/small-talk detection behavior
- Jailbreak scoring and threshold gating

**Test count:** 20 unit tests.

---

## Environment Variables Added or Updated

| Variable | Default | Purpose |
|---|---:|---|
| `JAILBREAK_THRESHOLD` | `3` | Weighted threshold for jailbreak detection gating |
| `FLASK_DEBUG` | `0` | When enabled, client-facing error responses may include exception details |

---

## Result

- Prompt injection resistance improved via explicit context isolation and “untrusted context” instruction rules.
- Jailbreak attempts are blocked earlier and more consistently via weighted detection with a centralized threshold.
- Sensitive-data detection accuracy improved with checksum/heuristic validation, reducing false positives.
- Error responses are now production-safe, reducing information disclosure.
- A security-focused test suite provides regression protection for future changes.

---

## Security Rating Improvements

These ratings are intentionally qualitative and defensible (based on observed controls, not claims of absolute security).

| Area | Before | After |
|---|---|---|
| Prompt Injection Protection | Medium | High |
| Jailbreak Resistance | Medium | High |
| Sensitive Data Accuracy | Medium | High |
| Information Disclosure Prevention | Low–Medium | High |
| Test Coverage (Security Utilities) | None | High (unit-tested) |

---

## Verification Summary

- Command: `python -m pytest tests/test_security.py -v`
- Environment: Windows (win32), Python 3.12.2, pytest 9.0.3
- Result: 20 tests passed successfully in 0.25s
- Manual verification performed for sensitive-data consent gating paths and error-response behavior in non-debug mode

---

## Summary Table

| Category | Before | After |
|---|---|---|
| Document-context prompt safety | Context could influence behavior | Context treated as untrusted data with guarded `<CONTEXT>` rules |
| Jailbreak policy | Implicit / hardcoded | Weighted scoring + centralized `JAILBREAK_THRESHOLD` |
| Sensitive detection | Regex-only | Regex + Luhn/Verhoeff + India phone heuristics |
| Greeting detection precision | Risk of false positives | Short-message eligibility + removal of ambiguous tokens |
| Error responses | Raw exception strings returned | Generic client errors + `logger.exception(...)` + debug gating |
| Regression protection | None | Security utilities covered by `pytest` |

---

## Commit References

The following commits capture the core security hardening work:

- `feat(security): strengthen privacy detection, jailbreak defense, and automated tests`
- `refactor(backend): organize feature modules and harden LLM prompt against injection`

---

## File Impact Summary

| File | Description |
|---|---|
| `backend/utils/security.py` | Jailbreak scoring, greeting hardening, sensitive validation (Luhn/Verhoeff/phone heuristics) |
| `backend/services/llm_service.py` | Guarded `<CONTEXT>` prompting + context sanitization |
| `backend/config.py` | Centralized security config (`JAILBREAK_THRESHOLD`, `FLASK_DEBUG`) |
| `backend/routes/ask_routes.py` | Early jailbreak guard; hardened error handling |
| `backend/routes/document_routes.py` | Hardened error handling for document/indexing endpoints |
| `backend/features/summarize.py` | Hardened error handling for summarize endpoint |
| `backend/services/retrieval_service.py` | Stop propagating raw exception strings; log failures internally |
| `backend/main.py` | Global exception handler hardened; `FLASK_DEBUG` behavior centralized |
| `backend/tests/test_security.py` | Automated regression tests for security utilities |

---

**Status:** Completed and Verified  
**Deployment:** Python/Flask backend · Node.js API · MongoDB Atlas · ChromaDB · Vercel frontend

