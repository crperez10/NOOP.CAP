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

clientsRouter.post("/", requireRole("admin"), upload.array("attachments"), async (req, res) => {
  const client = await Client.create({
    name: req.body.name,
    industry: req.body.industry,
    address: req.body.address,
    contractType: req.body.contractType,
    validatorUrl: normalizeUrl(req.body.validatorUrl),
    validatorUser: req.body.validatorUser,
    validatorPassword: req.body.validatorPassword,
    contacts: parseContacts(req.body.contacts),
    attachments: await filesToAttachments(req.files),
    notes: req.body.notes,
    color: req.body.color,
    createdBy: req.user._id,
  });

  res.status(201).json({ client: serializeClient(client) });
});

clientsRouter.patch("/:id", requireRole("admin"), upload.array("attachments"), async (req, res) => {
  const update = {
    $set: {
      name: req.body.name,
      industry: req.body.industry,
      address: req.body.address,
      contractType: req.body.contractType,
      validatorUrl: normalizeUrl(req.body.validatorUrl),
      validatorUser: req.body.validatorUser,
      validatorPassword: req.body.validatorPassword,
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
