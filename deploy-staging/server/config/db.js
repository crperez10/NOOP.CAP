import mongoose from "mongoose";

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is required. Copy .env.example to .env and configure it.");
  }

  mongoose.set("strictQuery", true);

  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (globalThis.__mongoConnectionPromise) return globalThis.__mongoConnectionPromise;

  try {
    globalThis.__mongoConnectionPromise = mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    await globalThis.__mongoConnectionPromise;
    if (process.env.VERCEL !== "1") console.log("MongoDB connected");
    return mongoose.connection;
  } catch (error) {
    globalThis.__mongoConnectionPromise = null;
    if (error?.name === "MongooseServerSelectionError") {
      throw new Error(
        [
          "MongoDB is not reachable.",
          `Tried: ${uri}`,
          "Start MongoDB locally, run docker compose up -d, or set MONGODB_URI to a MongoDB Atlas connection string.",
        ].join(" ")
      );
    }

    throw error;
  }
}
