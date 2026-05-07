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

const itemSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    subject: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    importance: { type: String, enum: ["alta", "media", "baja"], default: "media" },
    importanceRank: { type: Number, default: 2, index: true },
    category: { type: String, required: true, trim: true },
    subcategory: { type: String, default: "", trim: true },
    description: { type: String, default: "" },
    attachments: [attachmentSchema],
    favorite: { type: Boolean, default: false, index: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, index: true },
    groupClientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Client" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

itemSchema.index({
  subject: "text",
  category: "text",
  subcategory: "text",
  description: "text",
});

itemSchema.pre("validate", function setImportanceRank(next) {
  this.importanceRank = { alta: 1, media: 2, baja: 3 }[this.importance] || 2;
  next();
});

export const Item = mongoose.model("Item", itemSchema);
