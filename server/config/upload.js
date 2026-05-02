import mongoose from "mongoose";
import multer from "multer";
import { Readable } from "stream";

const allowedTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "text/plain",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, done) => {
    if (allowedTypes.includes(file.mimetype)) return done(null, true);
    done(new Error("Tipo de archivo no permitido."));
  },
});

export async function filesToAttachments(files = []) {
  return Promise.all(files.map(fileToAttachment));
}

async function fileToAttachment(file) {
  const id = new mongoose.Types.ObjectId();
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads",
  });

  await new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStreamWithId(id, file.originalname, {
      contentType: file.mimetype,
      metadata: { originalName: file.originalname, size: file.size },
    });

    Readable.from(file.buffer).pipe(uploadStream).on("error", reject).on("finish", resolve);
  });

  return {
    originalName: file.originalname,
    storedName: String(id),
    mimeType: file.mimetype,
    size: file.size,
    url: `/uploads/${id}`,
  };
}
