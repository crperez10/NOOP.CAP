import "dotenv/config";
import crypto from "crypto";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import passport from "passport";
import path from "path";
import { fileURLToPath } from "url";
import { connectDatabase } from "./config/db.js";
import { configurePassport } from "./config/passport.js";
import { authRouter } from "./routes/auth.js";
import { clientsRouter } from "./routes/clients.js";
import { itemsRouter } from "./routes/items.js";
import { uploadsRouter } from "./routes/uploads.js";
import { Client } from "./models/Client.js";
import { User } from "./models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const publicDir = path.join(rootDir, "public");

let appPromise;

export function createApp() {
  if (!appPromise) appPromise = buildApp();
  return appPromise;
}

async function buildApp() {
  await connectDatabase();
  await cleanupLegacyGoogleAuth();
  await seedRequestedAdmin();
  await seedStarterClients();
  configurePassport();

  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "local-dev-secret",
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 8,
      },
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());

  app.use(express.static(publicDir));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "client-data-admin" });
  });

  app.use("/auth", authRouter);
  app.use("/api/clients", clientsRouter);
  app.use("/api/items", itemsRouter);
  app.use("/uploads", uploadsRouter);

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(error.status || 500).json({
      message: error.message || "Ocurrio un error inesperado.",
    });
  });

  return app;
}

async function cleanupLegacyGoogleAuth() {
  try {
    await User.collection.dropIndex("googleId_1");
  } catch (error) {
    const expectedMissingState =
      ["IndexNotFound", "NamespaceNotFound"].includes(error?.codeName) ||
      [26, 27].includes(error?.code);

    if (!expectedMissingState) throw error;
  }

  await User.collection.updateMany(
    { googleId: { $exists: true } },
    { $unset: { googleId: "" } }
  );
}

async function seedRequestedAdmin() {
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;
  const name = process.env.ADMIN_SEED_NAME || "Administrador";

  if (!email || !password) return;

  await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      name,
      email: email.toLowerCase(),
      avatar: "",
      authProvider: "native",
      passwordHash: await hashPassword(password),
      role: "admin",
      status: "active",
    },
    { new: true, upsert: true, runValidators: true }
  );
}

async function seedStarterClients() {
  if (process.env.SEED_STARTER_CLIENTS === "false") return;

  const existing = await Client.estimatedDocumentCount();
  if (existing) return;

  await Client.insertMany([
    {
      name: "Acme Operaciones",
      industry: "Logistica",
      notes: "Cliente inicial para probar registros, busqueda y adjuntos.",
      color: "#4f8cff",
    },
    {
      name: "Northwind Finanzas",
      industry: "Servicios",
      notes: "Espacio de ejemplo para datos administrativos.",
      color: "#8b5cf6",
    },
  ]);
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) return reject(error);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}
