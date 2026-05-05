import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { filesToAttachments, upload } from "../config/upload.js";
import { Client } from "../models/Client.js";
import { Item } from "../models/Item.js";

export const clientsRouter = express.Router();

clientsRouter.use(requireAuth);

clientsRouter.get("/", async (_req, res) => {
  const clients = await Client.find().sort({ name: 1, createdAt: 1 }).collation({ locale: "es", strength: 1 });
  const counts = await Item.aggregate([{ $group: { _id: "$client", total: { $sum: 1 } } }]);
  const countMap = new Map(counts.map((row) => [String(row._id), row.total]));

  res.json({
    clients: clients.map((client) => ({
      ...serializeClient(client),
      itemCount: countMap.get(String(client._id)) || 0,
    })),
  });
});

clientsRouter.post("/", requireRole("admin", "collaborator"), upload.array("attachments"), async (req, res) => {
  const client = await Client.create({
    name: req.body.name,
    industry: "",
    address: req.body.address,
    contractType: req.body.contractType,
    validatorUrl: normalizeUrl(req.body.validatorUrl),
    validatorUser: req.body.validatorUser,
    validatorPassword: req.body.validatorPassword,
    validatorAccesses: parseValidatorAccesses(req.body.validatorAccesses, req.body),
    contacts: parseContacts(req.body.contacts),
    attachments: await filesToAttachments(req.files),
    notes: req.body.notes,
    color: req.body.color,
    createdBy: req.user._id,
  });

  res.status(201).json({ client: serializeClient(client) });
});

clientsRouter.patch("/:id", requireRole("admin", "collaborator"), upload.array("attachments"), async (req, res) => {
  const update = {
    $set: {
      name: req.body.name,
      industry: "",
      address: req.body.address,
      contractType: req.body.contractType,
      validatorUrl: normalizeUrl(req.body.validatorUrl),
      validatorUser: req.body.validatorUser,
      validatorPassword: req.body.validatorPassword,
      validatorAccesses: parseValidatorAccesses(req.body.validatorAccesses, req.body),
      contacts: parseContacts(req.body.contacts),
      notes: req.body.notes,
      color: req.body.color,
    },
  };

  const attachments = await filesToAttachments(req.files);
  if (attachments.length) {
    update.$push = { attachments: { $each: attachments } };
  }

  const client = await Client.findByIdAndUpdate(
    req.params.id,
    update,
    { new: true, runValidators: true }
  );

  if (!client) return res.status(404).json({ message: "Cliente no encontrado." });
  res.json({ client: serializeClient(client) });
});

clientsRouter.delete("/:id", requireRole("admin"), async (req, res) => {
  const client = await Client.findByIdAndDelete(req.params.id);
  if (!client) return res.status(404).json({ message: "Cliente no encontrado." });

  await Item.deleteMany({ client: client._id });
  res.json({ ok: true });
});

function serializeClient(client) {
  return {
    id: client.id,
    name: client.name,
    industry: client.industry,
    address: client.address,
    contractType: client.contractType,
    validatorUrl: client.validatorUrl || "",
    validatorUser: client.validatorUser || "",
    validatorPassword: client.validatorPassword || "",
    validatorAccesses: normalizedValidatorAccesses(client),
    contacts: client.contacts,
    attachments: client.attachments,
    notes: client.notes,
    color: client.color,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}

function normalizeUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function normalizedValidatorAccesses(client) {
  const accesses = Array.isArray(client.validatorAccesses) ? client.validatorAccesses : [];
  const normalized = accesses
    .map((access) => ({
      id: access._id ? String(access._id) : "",
      title: access.title || "",
      url: access.url || "",
      user: access.user || "",
      password: access.password || "",
    }))
    .filter((access) => access.title || access.url || access.user || access.password);

  if (!normalized.length && (client.validatorUrl || client.validatorUser || client.validatorPassword)) {
    normalized.push({
      id: "legacy-validator",
      title: "Validador",
      url: client.validatorUrl || "",
      user: client.validatorUser || "",
      password: client.validatorPassword || "",
    });
  }

  return normalized;
}

function parseValidatorAccesses(value, body = {}) {
  let accesses = [];

  try {
    accesses = JSON.parse(value || "[]");
  } catch {
    accesses = [];
  }

  if (!Array.isArray(accesses)) accesses = [];

  const normalized = accesses
    .map((access) => ({
      title: String(access.title || "").trim(),
      url: normalizeUrl(access.url),
      user: String(access.user || "").trim(),
      password: String(access.password || ""),
    }))
    .filter((access) => access.title || access.url || access.user || access.password);

  if (!normalized.length && (body.validatorUrl || body.validatorUser || body.validatorPassword)) {
    normalized.push({
      title: "Validador",
      url: normalizeUrl(body.validatorUrl),
      user: String(body.validatorUser || "").trim(),
      password: String(body.validatorPassword || ""),
    });
  }

  return normalized;
}

function parseContacts(value) {
  if (!value) return [];

  try {
    const contacts = JSON.parse(value);
    if (!Array.isArray(contacts)) return [];
    return contacts
      .map((contact) => ({
        name: contact.name || "",
        role: contact.role || "",
        email: contact.email || "",
        phone: contact.phone || "",
      }))
      .filter((contact) => contact.name || contact.role || contact.email || contact.phone);
  } catch {
    return [];
  }
}
