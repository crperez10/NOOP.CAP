import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    originalName: String,
    storedName: String,
    mimeType: String,
    size: Number,
    url: String,
  },
  { _id: true, timestamps: true }
);

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    role: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
  },
  { _id: false }
);

const validatorAccessSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    url: { type: String, default: "" },
    user: { type: String, default: "" },
    password: { type: String, default: "" },
  },
  { _id: true }
);

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    industry: { type: String, default: "" },
    address: { type: String, default: "" },
    contractType: { type: String, default: "" },
    validatorUrl: { type: String, default: "" },
    validatorUser: { type: String, default: "" },
    validatorPassword: { type: String, default: "" },
    validatorAccesses: [validatorAccessSchema],
    contacts: [contactSchema],
    attachments: [attachmentSchema],
    notes: { type: String, default: "" },
    color: { type: String, default: "#6d5dfc" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

clientSchema.index({ name: "text", industry: "text", notes: "text" });

export const Client = mongoose.model("Client", clientSchema);
