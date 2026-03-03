const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
  data: { type: Buffer, required: true }, // File as binary data
  // Content hash for deduplication (SHA-256 of file buffer)
  contentHash: { type: String, index: true },
  // Ensure a stable per-document id string used by downstream services (Chroma/Flask)
  doc_id: { type: String, default: null },
  processingStatus: { type: String, enum: ["queued", "indexing", "awaiting-consent", "done", "failed"], default: "queued" },
  // Timestamp when processing started (for stale detection / watchdog)
  processingStartedAt: { type: Date },
  // Version for optimistic locking (prevents watchdog/worker race condition)
  processingVersion: { type: Number, default: 0 },
  processedAt: { type: Date },
  processingError: { type: String, default: "" },
  uploadedAt: { type: Date, default: Date.now },
  // Fields to track original document for converted files
  originalName: { type: String }, // Original filename if converted
  originalType: { type: String }, // Original mimetype if converted
  // Persistent pin state per user/document
  pinned: { type: Boolean, default: false },
  pinnedAt: { type: Date },
  // Sensitive data / consent persistence (avoids Flask in-memory loss)
  sensitiveFound: { type: Boolean, default: false },
  consentConfirmed: { type: Boolean, default: false },
  sensitiveSummary: { type: mongoose.Schema.Types.Mixed },
  lastScanAt: { type: Date },
});

// Populate doc_id with this._id if not set, to avoid null values
documentSchema.pre("save", function (next) {
  if (!this.doc_id) {
    this.doc_id = this._id.toString();
  }
  next();
});

// Helpful indexes for admin aggregations and queries
documentSchema.index({ user: 1 });
documentSchema.index({ uploadedAt: -1 });
documentSchema.index({ size: -1 });
// Index for watchdog stale document cleanup
documentSchema.index({ processingStatus: 1, processingStartedAt: 1 });

// Compound index for deduplication: prevents same file being processed twice in parallel
// Only enforces uniqueness when document is still processing (queued/indexing)
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

module.exports = mongoose.model("Document", documentSchema);