import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    avatar: { type: String, default: "" },
    passwordHash: { type: String, default: "" },
    authProvider: {
      type: String,
      enum: ["native"],
      default: "native",
    },
    role: {
      type: String,
      enum: ["admin", "viewer"],
      default: "viewer",
    },
    status: {
      type: String,
      enum: ["active", "pending"],
      default: "active",
    },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
