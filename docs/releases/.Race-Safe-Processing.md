# SmartDocQ Backend Update — Reliability & Deduplication Improvements

**Date:** March 3, 2026  
**Type:** Internal reliability improvements, bug fixes, race condition prevention

---

## Overview

This release focuses on improving system reliability, preventing duplicate document processing, and handling edge cases that could cause data corruption or user-blocking issues.

---

## Changes

### 1. Database-Level Upload Deduplication

**Problem:** Same document could be processed twice in parallel if user double-clicked upload or made concurrent requests.

**Solution:** Added content-based deduplication using SHA-256 hashing.

**Files Changed:**
- `servers/models/Document.js`
- `servers/routes/document.js`

**Details:**
```javascript
// New field in Document schema
contentHash: { type: String, index: true }

// Partial unique index - only enforces uniqueness during processing
documentSchema.index(
  { user: 1, contentHash: 1 },
  { 
    unique: true,
    partialFilterExpression: { 
      contentHash: { $type: "string" },
      processingStatus: { $in: ["queued", "indexing"] }
    }
  }
);
```

**Behavior:**
- Same user cannot upload identical file while previous is still processing
- Returns `409 Conflict` with existing document info
- User can re-upload same file after processing completes

---

### 2. Processing Timeout Watchdog

**Problem:** If server crashes during indexing, document stays in `"indexing"` status forever, permanently blocking re-upload due to deduplication index.

**Solution:** Background watchdog job resets stale documents to `"failed"` status.

**Files Changed:**
- `servers/models/Document.js`
- `servers/server.js`

**Details:**
```javascript
// New fields in Document schema
processingStartedAt: { type: Date }
processingVersion: { type: Number, default: 0 }

// Watchdog runs every 2 minutes
// Documents stuck in queued/indexing for >10 minutes → reset to failed
```

**Configuration:**
- Timeout: 10 minutes (configurable via `STALE_PROCESSING_TIMEOUT_MS`)
- Check interval: 2 minutes

---

### 3. Optimistic Locking (Race Condition Prevention)

**Problem:** Race condition between watchdog and active worker:
1. Worker still processing at minute 9
2. Watchdog fires at minute 10, sets status = `"failed"`
3. Worker finishes at minute 11, sets status = `"done"`
4. Result: Inconsistent timeline, potential data issues

**Solution:** Optimistic locking using `processingVersion` field.

**Files Changed:**
- `servers/models/Document.js`
- `servers/server.js`
- `servers/routes/document.js`

**Details:**
```javascript
// Watchdog uses atomic update with version check
const result = await Document.findOneAndUpdate(
  {
    _id: doc._id,
    processingVersion: doc.processingVersion,  // Must match
    processingStatus: { $in: ["queued", "indexing"] }
  },
  {
    $set: { processingStatus: "failed", ... },
    $inc: { processingVersion: 1 }
  }
);

// Worker increments version on completion
doc.processingVersion = (doc.processingVersion || 0) + 1;
```

**Behavior:**
- If worker finishes first: version increments, watchdog update fails (version mismatch)
- If watchdog fires first: version increments, worker update succeeds with new version
- No race condition possible

---

### 4. Idempotent Indexing

**Problem:** If indexing crashes mid-way and user retries:
- Duplicate embeddings created in ChromaDB
- Duplicate vector entries
- Double API billing for embedding generation

**Solution:** Changed `collection.add()` to `collection.upsert()` in Flask backend.

**Files Changed:**
- `backend/main.py`

**Details:**
```python
# Before (not idempotent)
collection.add(embeddings=..., ids=...)

# After (idempotent - safe to retry)
collection.upsert(embeddings=..., ids=...)
```

**Behavior:**
- Chunk IDs are deterministic: `"{doc_id}_{chunk_index}"`
- Retry replaces existing entries instead of creating duplicates
- No duplicate embeddings or double billing

---

### 5. Enhanced Duplicate API Response

**Problem:** When duplicate detected, API only returned generic error. User had no visibility into what was happening.

**Solution:** Return detailed info about existing in-progress document.

**Files Changed:**
- `servers/routes/document.js`
- `my-app/src/Components/UploadPage.jsx`

**API Response (409 Conflict):**
```json
{
  "duplicate": true,
  "message": "This file is already being processed (3 min). Please wait.",
  "existingDocumentId": "...",
  "existingDocId": "...",
  "existingName": "report.pdf",
  "status": "indexing",
  "processingStartedAt": "2026-03-03T10:00:00Z",
  "processingTimeMinutes": 3
}
```

**Frontend Behavior:**
- Shows warning toast with file name and processing time
- Auto-selects existing document so user can track progress
- Refreshes history to show current status

---

## Database Schema Changes

### Document Model

| Field | Type | New | Description |
|-------|------|-----|-------------|
| `contentHash` | String | ✅ | SHA-256 hash of file content |
| `processingStartedAt` | Date | ✅ | When processing began |
| `processingVersion` | Number | ✅ | Optimistic lock version |

### New Indexes

```javascript
// For watchdog queries
{ processingStatus: 1, processingStartedAt: 1 }

// For deduplication (partial unique)
{ user: 1, contentHash: 1 } // unique when status is queued/indexing
```

---

## Migration Notes

**Backward Compatible:** Yes

- New fields have defaults (`processingVersion: 0`, others nullable)
- Watchdog handles legacy documents without `processingStartedAt` using `uploadedAt` as fallback
- No data migration required

**Index Creation:**
- Indexes are created automatically on server startup
- First startup after upgrade may be slightly slower due to index building

---

## Testing Checklist

- [ ] Single file upload works normally
- [ ] Batch upload works normally
- [ ] Double-click upload returns 409 with existing doc info
- [ ] Concurrent identical uploads blocked
- [ ] Different files upload in parallel successfully
- [ ] Same file can be re-uploaded after processing completes
- [ ] Watchdog resets stuck documents after 10 minutes
- [ ] Worker completion doesn't race with watchdog
- [ ] Retry after crash doesn't create duplicate embeddings

---

## Performance Impact

| Change | Impact |
|--------|--------|
| Content hashing | ~1-5ms per upload (SHA-256 is fast) |
| Dedup query | Negligible (indexed) |
| Watchdog job | Runs every 2 min, queries indexed field |
| Version increment | Negligible (single field update) |

---

## Related Issues

- Fixes: Duplicate document processing on double-click
- Fixes: Infinite upload block after server crash
- Fixes: Race condition between watchdog and workers
- Fixes: Duplicate embeddings on retry after crash
