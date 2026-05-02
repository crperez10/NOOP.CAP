import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { Client } from "../models/Client.js";
import { Item } from "../models/Item.js";
import { filesToAttachments, upload } from "../config/upload.js";

export const itemsRouter = express.Router();

itemsRouter.use(requireAuth);

itemsRouter.get("/", async (req, res) => {
  const query = await buildItemQuery(req.query);
  const sort = req.query.sort === "importance" ? importanceSort() : { date: -1, createdAt: -1 };
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

  const [items, total] = await Promise.all([
    Item.find(query)
      .populate("createdBy", "name email avatar role")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Item.countDocuments(query),
  ]);

  res.json({
    items: items.map(serializeItem),
    page,
    total,
    hasMore: page * limit < total,
  });
});

itemsRouter.post("/", requireRole("admin"), upload.array("attachments"), async (req, res) => {
  const clientIds = itemClientIds(req.body);
  if (!clientIds.length) return res.status(400).json({ message: "Selecciona al menos un cliente." });

  const attachments = await filesToAttachments(req.files);
  const items = await Item.create(
    clientIds.map((client) => ({
      client,
      subject: req.body.subject,
      date: req.body.date,
      importance: req.body.importance,
      importanceRank: toImportanceRank(req.body.importance),
      category: req.body.category,
      subcategory: req.body.subcategory,
      description: req.body.description,
      attachments,
      createdBy: req.user._id,
    }))
  );

  const populatedItems = await Item.find({ _id: { $in: items.map((item) => item._id) } }).populate("createdBy", "name email avatar role");
  res.status(201).json({
    item: serializeItem(populatedItems[0]),
    items: populatedItems.map(serializeItem),
    count: populatedItems.length,
  });
});

itemsRouter.patch("/:id", requireRole("admin"), upload.array("attachments"), async (req, res) => {
  const update = {
    $set: {
      client: req.body.client,
      subject: req.body.subject,
      date: req.body.date,
      importance: req.body.importance,
      importanceRank: toImportanceRank(req.body.importance),
      category: req.body.category,
      subcategory: req.body.subcategory,
      description: req.body.description,
    },
  };

  const newAttachments = await filesToAttachments(req.files);
  if (newAttachments.length) {
    update.$push = { attachments: { $each: newAttachments } };
  }

  const item = await Item.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  }).populate("createdBy", "name email avatar role");

  if (!item) return res.status(404).json({ message: "Registro no encontrado." });
  res.json({ item: serializeItem(item) });
});

itemsRouter.delete("/:id", requireRole("admin"), async (req, res) => {
  const item = await Item.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: "Registro no encontrado." });
  res.json({ ok: true });
});

async function buildItemQuery(params) {
  const query = {};

  if (params.client) query.client = params.client;
  if (params.importance) query.importance = { $in: toList(params.importance) };
  if (params.category) query.category = { $in: toList(params.category).map((value) => exactRegex(value)) };
  if (params.subcategory) query.subcategory = { $in: toList(params.subcategory).map((value) => exactRegex(value)) };
  if (params.keyword) {
    const keyword = String(params.keyword).trim();
    const keywordRegex = new RegExp(escapeRegExp(keyword), "i");
    const matchingClients = await Client.find({ name: keywordRegex }).select("_id");
    query.$or = [
      { subject: keywordRegex },
      { category: keywordRegex },
      { subcategory: keywordRegex },
      { description: keywordRegex },
      { client: { $in: matchingClients.map((client) => client._id) } },
    ];
  }
  if (params.from || params.to) {
    query.date = {};
    if (params.from) query.date.$gte = new Date(params.from);
    if (params.to) query.date.$lte = new Date(params.to);
  }

  return query;
}

function serializeItem(item) {
  return {
    id: item.id,
    client: item.client,
    subject: item.subject,
    date: item.date,
    importance: item.importance,
    category: item.category,
    subcategory: item.subcategory,
    description: item.description,
    attachments: item.attachments,
    createdBy: item.createdBy,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function importanceSort() {
  return { importanceRank: 1, date: -1, createdAt: -1 };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toImportanceRank(value) {
  return { alta: 1, media: 2, baja: 3 }[value] || 2;
}

function toList(value) {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function itemClientIds(body) {
  const rawClients = body.clients || body.client;
  let clients = [];

  if (rawClients == null) {
    clients = [];
  } else if (Array.isArray(rawClients)) {
    clients = rawClients;
  } else if (typeof rawClients === "string" && rawClients.trim().startsWith("[")) {
    try {
      clients = JSON.parse(rawClients);
    } catch {
      clients = [body.client];
    }
  } else {
    clients = toList(rawClients);
  }

  return [...new Set(clients.map((client) => String(client).trim()).filter(Boolean))];
}

function exactRegex(value) {
  return new RegExp(`^${escapeRegExp(value)}$`, "i");
}
