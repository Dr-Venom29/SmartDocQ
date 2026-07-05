const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const { verifyToken, ensureActive } = require("./auth");
const { verifyCsrf } = require("../middlewares/csrf");
const Chat = require("../models/Chat");
const Document = require("../models/Document");
const SharedChat = require("../models/SharedChat");
const PDFDocument = require("pdfkit");

function genShareId() {
  // High-entropy, URL-safe id (32 chars base64url, ~192 bits)
  // 24 bytes -> 32 base64 characters with no padding
  return crypto.randomBytes(24).toString("base64url");
}

function isValidShareId(shareId) {
  // Backward compatible with older shares, while allowing new high-entropy ids.
  // - legacy: 12 chars
  // - current: 32 chars (base64url)
  return typeof shareId === "string" && /^(?:[A-Za-z0-9_-]{12}|[A-Za-z0-9_-]{16,64})$/.test(shareId);
}

// Public share endpoints can be hammered; rate limit by IP.
const publicShareLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

// Create a share snapshot from current user's chat for a document
// Change detection: if the latest snapshot for this user+doc has the same content hash,
// reuse its shareId and extend its expiresAt instead of creating a new one.
router.post("/chat/:documentId", verifyToken, ensureActive, verifyCsrf, async (req, res) => {
  try {
    const { documentId } = req.params;
    const doc = await Document.findOne({ _id: documentId, user: req.userId });
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const chat = await Chat.findOne({ user: req.userId, document: documentId });
    if (!chat || chat.messages.length === 0) {
      return res.status(400).json({ message: "No messages to share" });
    }

    // Compute a stable content hash based on role+text across all messages.
    // Ratings or timestamps are ignored for change detection to avoid unnecessary new links.
    const hasher = crypto.createHash("sha256");
    for (const m of chat.messages) {
      hasher.update(m.role || "");
      hasher.update("\n");
      hasher.update(m.text || "");
      hasher.update("\n");
    }
    const snapshotHash = hasher.digest("hex");

    // See if the latest snapshot for this user+doc matches the same hash and is still around.
    const latest = await SharedChat.findOne({ createdBy: req.userId, document: doc._id })
      .sort({ createdAt: -1 })
      .exec();

    const nextExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    if (latest && latest.snapshotHash === snapshotHash) {
      // If it was expired by timestamp but not yet removed by TTL, revive by pushing expiresAt forward
      latest.expiresAt = nextExpiry;
      latest.messageCount = Array.isArray(chat.messages) ? chat.messages.length : 0;
      await latest.save();
      return res.json({ shareId: latest.shareId, title: latest.title || doc.name });
    }

    // Create unique id, retry on collision (very unlikely)
    let shareId = genShareId();
    for (let i = 0; i < 3; i++) {
      const exists = await SharedChat.findOne({ shareId });
      if (!exists) break;
      shareId = genShareId();
    }

    const snapshot = await SharedChat.create({
      shareId,
      createdBy: req.userId,
      document: doc._id,
      title: doc.name,
      visibility: "unlisted",
      messages: chat.messages.map(m => ({
        role: m.role,
        text: m.text,
        at: m.at,
        rating: m.rating || "none",
      })),
      snapshotHash,
      messageCount: Array.isArray(chat.messages) ? chat.messages.length : 0,
      expiresAt: nextExpiry,
    });

    res.json({ shareId: snapshot.shareId, title: snapshot.title });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to create share" });
  }
});

// Public: resolve a shareId and return snapshot (honors expiration)
router.get("/:shareId", publicShareLimiter, async (req, res) => {
  try {
    const { shareId } = req.params;
    if (!isValidShareId(shareId)) {
      return res.status(400).json({ message: "Invalid share id" });
    }
    const snap = await SharedChat.findOne({ shareId }).populate("document", "name");
    if (!snap) return res.status(404).json({ message: "Share not found" });
    // Explicit expiration check in case TTL hasn't pruned yet
    if (snap.expiresAt && snap.expiresAt.getTime() <= Date.now()) {
      return res.status(410).json({ message: "Share link expired" });
    }

    // Minimal payload; do not expose user id
    res.json({
      shareId: snap.shareId,
      createdAt: snap.createdAt,
      expiresAt: snap.expiresAt,
      title: snap.title || (snap.document && snap.document.name) || "Shared chat",
      messages: snap.messages || [],
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load share" });
  }
});

module.exports = router;

// Export shared chat as PDF (public)
router.get("/:shareId/export.pdf", publicShareLimiter, async (req, res) => {
  try {
    const { shareId } = req.params;
    if (!isValidShareId(shareId)) {
      return res.status(400).json({ message: "Invalid share id" });
    }
    const snap = await SharedChat.findOne({ shareId }).populate("document", "name");
    if (!snap) return res.status(404).json({ message: "Share not found" });
    if (snap.expiresAt && snap.expiresAt.getTime() <= Date.now()) {
      return res.status(410).json({ message: "Share link expired" });
    }

    const title = snap.title || (snap.document && snap.document.name) || "Shared chat";
    const safeName = String(title).replace(/[^A-Za-z0-9._-]+/g, "_");
    const ts = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}`;
    const filename = `SharedChat_${safeName}_${stamp}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const pdf = new PDFDocument({ size: "A4", margin: 50 });
    pdf.on("error", () => { try { res.end(); } catch (_) {} });
    pdf.pipe(res);

    pdf.fontSize(18).text("Shared Chat Export", { align: "left" });
    pdf.moveDown(0.5);
    pdf.fontSize(12).text(`Title: ${title}`);
    if (snap.expiresAt) pdf.text(`Expires at: ${new Date(snap.expiresAt).toLocaleString()}`);
    pdf.moveDown();
    pdf.moveTo(50, pdf.y).lineTo(545, pdf.y).stroke();
    pdf.moveDown();

    const msgs = Array.isArray(snap.messages) ? snap.messages : [];
    if (!msgs.length) {
      pdf.fontSize(12).text("No messages.");
      pdf.end();
      return;
    }
    msgs.forEach((m, idx) => {
      const at = m.at ? new Date(m.at) : null;
      const when = at ? at.toLocaleString() : "";
      const role = m.role === "assistant" ? "Assistant" : m.role === "user" ? "User" : "System";

      pdf.fontSize(11).fillColor("#555").text(`${role} • ${when}`);
      pdf.moveDown(0.2);
      pdf.fontSize(12).fillColor("#000").text(m.text || "", { width: 495, align: "left" });
      pdf.moveDown();
      if ((idx + 1) % 6 === 0) pdf.addPage();
    });

    pdf.end();
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to export shared chat" });
  }
});
