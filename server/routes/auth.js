import express from "express";
import crypto from "crypto";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { filesToAttachments, upload } from "../config/upload.js";
import { User } from "../models/User.js";

export const authRouter = express.Router();

authRouter.post("/guest-login", async (req, res) => {
  const user = await User.findOneAndUpdate(
    { email: "invitado.local@example.com" },
    {
      name: "Invitado",
      email: "invitado.local@example.com",
      avatar: "",
      authProvider: "native",
      passwordHash: "",
      status: "active",
      role: "viewer",
      lastLoginAt: new Date(),
    },
    { new: true, upsert: true }
  );

  finishLogin(req, res, user, "No se pudo iniciar sesion como invitado.");
});

authRouter.post("/native-login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = await User.findOne({ email, authProvider: "native" });

  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ message: "Email o password incorrecto." });
  }

  if (user.status === "pending") {
    return res.status(403).json({ message: "Tu usuario esta pendiente de aprobacion." });
  }

  user.lastLoginAt = new Date();
  await user.save();

  finishLogin(req, res, user, "No se pudo iniciar sesion.");
});

authRouter.get("/me", (req, res) => {
  res.json({
    user: req.user ? serializeUser(req.user) : null,
    auth: {},
  });
});

authRouter.post("/logout", (req, res, next) => {
  req.logout((error) => {
    if (error) return next(error);
    req.session.destroy(() => res.json({ ok: true }));
  });
});

authRouter.patch("/profile", requireAuth, requireRole("admin"), upload.single("avatar"), async (req, res) => {
  const update = {};
  const attachments = await filesToAttachments(req.file ? [req.file] : []);
  if (attachments[0]) update.avatar = attachments[0].url;

  const user = Object.keys(update).length
    ? await User.findByIdAndUpdate(req.user._id, update, { new: true })
    : await User.findById(req.user._id);
  res.json({ user: serializeUser(user) });
});

authRouter.patch("/password", requireAuth, requireRole("admin"), async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: "El nuevo password debe tener al menos 6 caracteres." });
  }

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "Usuario no encontrado." });

  if (user.authProvider === "native" && !(await verifyPassword(currentPassword, user.passwordHash))) {
    return res.status(401).json({ message: "El password actual no es correcto." });
  }

  user.passwordHash = await hashPassword(newPassword);
  if (user.authProvider !== "native") user.authProvider = "native";
  await user.save();
  res.json({ user: serializeUser(user) });
});

authRouter.get("/users", requireAuth, requireRole("admin"), async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ users: users.map(serializeUser) });
});

authRouter.post("/users", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { name, email, role, password } = req.body;

    if (!name || !email || (role === "admin" && !password)) {
      return res.status(400).json({ message: "Nombre, email y password son obligatorios para administradores." });
    }

    if (!["admin", "viewer"].includes(role)) {
      return res.status(400).json({ message: "Rol invalido." });
    }

    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Ya existe un usuario con ese email." });
    }

    const user = await User.create({
      name,
      email: String(email).toLowerCase(),
      role,
      status: "active",
      authProvider: "native",
      passwordHash: role === "admin" ? await hashPassword(password) : "",
    });

    res.status(201).json({ user: serializeUser(user) });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Ya existe un usuario con ese email." });
    }
    console.error(error);
    res.status(500).json({ message: "No se pudo crear el usuario." });
  }
});

authRouter.patch("/users/:id/role", requireAuth, requireRole("admin"), async (req, res) => {
  const { role } = req.body;
  if (!["admin", "viewer"].includes(role)) {
    return res.status(400).json({ message: "Rol invalido." });
  }

  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) return res.status(404).json({ message: "Usuario no encontrado." });
  res.json({ user: serializeUser(user) });
});

authRouter.patch("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { name, email, role, password, status } = req.body;

    if (!name || !email || !["admin", "viewer"].includes(role)) {
      return res.status(400).json({ message: "Nombre, email y rol validos son obligatorios." });
    }

    if (!["active", "pending"].includes(status)) {
      return res.status(400).json({ message: "Estado invalido." });
    }

    const normalizedEmail = String(email).toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: req.params.id } });
    if (existing) {
      return res.status(409).json({ message: "Ya existe un usuario con ese email." });
    }

    const update = {
      name,
      email: normalizedEmail,
      role,
      status,
    };

    if (role === "viewer") update.passwordHash = "";
    if (role === "admin" && password) update.passwordHash = await hashPassword(password);

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: "Usuario no encontrado." });
    res.json({ user: serializeUser(user) });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Ya existe un usuario con ese email." });
    }
    console.error(error);
    res.status(500).json({ message: "No se pudo actualizar el usuario." });
  }
});

authRouter.delete("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  if (String(req.user._id) === String(req.params.id)) {
    return res.status(400).json({ message: "No puedes eliminar tu propio usuario." });
  }

  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: "Usuario no encontrado." });
  res.json({ ok: true });
});

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    status: user.status || "active",
    authProvider: user.authProvider,
  };
}

function finishLogin(req, res, user, message) {
  req.login(user, (error) => {
    if (error) return res.status(500).json({ message });
    req.session.save((saveError) => {
      if (saveError) return res.status(500).json({ message });
      res.json({ user: serializeUser(user) });
    });
  });
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

function verifyPassword(password, passwordHash) {
  return new Promise((resolve, reject) => {
    const [salt, key] = passwordHash.split(":");
    if (!salt || !key) return resolve(false);

    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) return reject(error);
      const storedKey = Buffer.from(key, "hex");
      if (storedKey.length !== derivedKey.length) return resolve(false);
      resolve(crypto.timingSafeEqual(storedKey, derivedKey));
    });
  });
}
