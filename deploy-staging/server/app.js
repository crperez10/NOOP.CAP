import "dotenv/config";
import crypto from "crypto";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import path from "path";
import { fileURLToPath } from "url";
import { connectDatabase } from "./config/db.js";
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
  await seedRequestedAdmin();
  await seedStarterClients();

  const app = express();
  app.set("trust proxy", 1);

  app.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/auth") || req.path.startsWith("/uploads")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
    next();
  });

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
  app.use(loadSessionUser);

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

async function seedRequestedAdmin() {
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;
  const name = "Cristian Perez";

  if (!email || !password) return;

  const normalizedEmail = email.toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });

  if (!existing) {
    await User.create({
      name,
      email: normalizedEmail,
      avatar: "",
      authProvider: "native",
      passwordHash: await hashPassword(password),
      passwordUpdatedAt: new Date(),
      role: "admin",
      status: "active",
    });
    return;
  }

  existing.role = "admin";
  existing.authProvider = "native";
  if (!existing.passwordHash) {
    existing.passwordHash = await hashPassword(password);
    existing.passwordUpdatedAt = new Date();
  }
  if (!existing.status || existing.status === "pending") existing.status = "active";
  existing.name = name;
  await existing.save();
}

async function loadSessionUser(req, _res, next) {
  try {
    if (!req.session?.userId) {
      req.user = null;
      return next();
    }

    req.user = await User.findById(req.session.userId);
    if (!req.user) delete req.session.userId;
    next();
  } catch (error) {
    next(error);
  }
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
