const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Document = require("../models/Document");
const DocChunk = require("../models/DocChunk");
const { verifyToken, ensureActive } = require("../middlewares/auth");

// Internal upsert endpoint for Flask to persist chunk texts for keyword/metadata search
router.post("/internal/chunks/upsert", async (req, res) => {
  try {
    const svc = process.env.SERVICE_TOKEN;
    const provided = req.header("x-service-token");
    if (!provided || provided !== svc) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { documentId, doc_id, filename, indexVersion, chunks } = req.body || {};
    if ((!documentId && !doc_id) || !Array.isArray(chunks)) {
      return res.status(400).json({ message: "Missing documentId/doc_id or chunks" });
    }

    let doc = null;
    if (documentId && mongoose.Types.ObjectId.isValid(documentId)) {
      doc = await Document.findById(documentId);
    }
    if (!doc && doc_id) {
      doc = await Document.findOne({ doc_id: doc_id });
    }
    if (!doc) return res.status(404).json({ message: "Document not found" });

    // Replace strategy: remove existing chunks for this specific version then insert new ones
    const versionVal = indexVersion || null;
    await DocChunk.deleteMany({ doc: doc._id, indexVersion: versionVal });

    const bulk = DocChunk.collection.initializeUnorderedBulkOp();
    const now = new Date();
    const fname = filename || doc.name;
    for (const c of chunks) {
      if (!c || typeof c.chunk !== "number" || typeof c.text !== "string") continue;
      bulk.find({ doc: doc._id, chunk: c.chunk, indexVersion: versionVal }).upsert().replaceOne({
        user: doc.user,
        doc: doc._id,
        doc_id: doc.doc_id,
        filename: fname,
        sheet: c.sheet || null,
        chunk: c.chunk,
        text: c.text,
        indexVersion: versionVal,
        createdAt: now,
      });
    }
    let result = { nUpserted: 0, nModified: 0 };
    if (bulk.length > 0) {
      const r = await bulk.execute();
      result = { nUpserted: r?.nUpserted || 0, nModified: r?.nModified || 0 };
    }

    return res.json({ message: "Chunks upserted", result });
  } catch (err) {
    return res.status(500).json({ message: err?.message || String(err) });
  }
});

// Public search endpoint (keyword-first). Falls back to $text or regex if Atlas Search is not configured.
router.get("/", verifyToken, ensureActive, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.status(400).json({ message: "Missing q" });

    const limit = Math.min(parseInt(req.query.limit || "20", 10) || 20, 50);

    // Fallback using $text if index exists; otherwise regex (case-insensitive)
    let items = [];
    try {
      // Try $text with activeVersion filter
      items = await DocChunk.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(req.userId), $text: { $search: q } } },
        {
          $lookup: {
            from: "documents",
            localField: "doc",
            foreignField: "_id",
            as: "docObj"
          }
        },
        { $unwind: "$docObj" },
        {
          $match: {
            $expr: {
              $or: [
                { $eq: ["$indexVersion", "$docObj.indexState.activeVersion"] },
                {
                  $and: [
                    { $or: [{ $eq: ["$indexVersion", null] }, { $not: ["$indexVersion"] }] },
                    { $or: [{ $eq: ["$docObj.indexState.activeVersion", null] }, { $not: ["$docObj.indexState.activeVersion"] }] }
                  ]
                }
              ]
            }
          }
        },
        {
          $project: {
            score: { $meta: "textScore" },
            text: 1,
            filename: 1,
            sheet: 1,
            doc: 1,
            doc_id: 1,
            chunk: 1
          }
        },
        { $sort: { score: { $meta: "textScore" } } },
        { $limit: limit }
      ]);
    } catch (_) {
      // Regex fallback with activeVersion filter
      items = await DocChunk.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(req.userId),
            text: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" }
          }
        },
        {
          $lookup: {
            from: "documents",
            localField: "doc",
            foreignField: "_id",
            as: "docObj"
          }
        },
        { $unwind: "$docObj" },
        {
          $match: {
            $expr: {
              $or: [
                { $eq: ["$indexVersion", "$docObj.indexState.activeVersion"] },
                {
                  $and: [
                    { $or: [{ $eq: ["$indexVersion", null] }, { $not: ["$indexVersion"] }] },
                    { $or: [{ $eq: ["$docObj.indexState.activeVersion", null] }, { $not: ["$docObj.indexState.activeVersion"] }] }
                  ]
                }
              ]
            }
          }
        },
        {
          $project: {
            text: 1,
            filename: 1,
            sheet: 1,
            doc: 1,
            doc_id: 1,
            chunk: 1
          }
        },
        { $limit: limit }
      ]);
    }

    // Simple snippet building
    const results = items.map(it => {
      const t = it.text || "";
      const idx = t.toLowerCase().indexOf(q.toLowerCase());
      let snippet = t.slice(0, 180);
      if (idx >= 0) {
        const start = Math.max(0, idx - 60);
        snippet = t.slice(start, start + 180);
      }
      return {
        documentId: it.doc,
        doc_id: it.doc_id,
        filename: it.filename,
        sheet: it.sheet || null,
        chunk: it.chunk,
        snippet,
        score: it.score || undefined,
      };
    });

    return res.json({ items: results, total: results.length });
  } catch (err) {
    return res.status(500).json({ message: err?.message || String(err) });
  }
});

module.exports = router;
