import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";

export const uploadsRouter = express.Router();

uploadsRouter.use(requireAuth);

uploadsRouter.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Archivo no encontrado." });
    }

    const id = new mongoose.Types.ObjectId(req.params.id);
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });
    const files = await bucket.find({ _id: id }).toArray();
    const file = files[0];

    if (!file) return res.status(404).json({ message: "Archivo no encontrado." });

    res.setHeader("Content-Type", file.contentType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.filename)}"`);
    bucket.openDownloadStream(id).on("error", next).pipe(res);
  } catch (error) {
    next(error);
  }
});
