import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { NbuEntry } from "../models/NbuEntry.js";
import { ensureNbuSeeded } from "../services/nbuSeed.js";

export const nbuRouter = express.Router();

nbuRouter.use(requireAuth);

nbuRouter.get("/", async (req, res) => {
  const query = String(req.query.q || "").trim();
  if (!query) {
    return res.json({ entries: [], total: 0 });
  }

  await ensureNbuSeeded();

  const regex = new RegExp(escapeRegExp(query), "i");
  const entries = await NbuEntry.find({
    $or: [
      { code: regex },
      { "current.determination": regex },
      { searchBlob: regex },
    ],
  })
    .sort({ code: 1 })
    .limit(30)
    .lean();

  res.json({
    entries: entries.map(serializeNbuEntry),
    total: entries.length,
  });
});

function serializeNbuEntry(entry) {
  return {
    id: String(entry._id),
    code: entry.code,
    description: entry.current?.determination || "",
    ub: entry.current?.ub || "",
    lastUpdated: entry.latestUpdate || entry.current?.source || "",
    abbreviations: entry.metadata?.abbreviations || "",
    interpretationRules: entry.metadata?.interpretationRules || "",
    previousModifications: (entry.changes || []).map((change) => ({
      version: change.comparedVersion || "",
      field: change.field || "",
      previousValue: change.previousValue || "",
      currentValue: change.currentValue || "",
      changeType: change.changeType || "",
    })),
    history: (entry.history || []).map((version) => ({
      version: version.version || "",
      description: version.determination || "",
      ub: version.ub || "",
      section: version.section || "",
      isCurrent: Boolean(version.isCurrent),
    })),
  };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
