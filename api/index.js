let appPromise;

async function getApp() {
  appPromise ||= import("../server/app.js").then((module) => module.createApp());
  return appPromise;
}

function normalizePathParam(value) {
  if (Array.isArray(value)) return value.join("/");
  return value || "";
}

function resolveExpressUrl(req) {
  const path = normalizePathParam(req.query?.path);
  let expressPath = "/api";

  if (path === "health") {
    expressPath = "/api/health";
  } else if (path === "auth") {
    expressPath = "/auth";
  } else if (path.startsWith("auth/")) {
    expressPath = `/${path}`;
  } else if (path === "uploads") {
    expressPath = "/uploads";
  } else if (path.startsWith("uploads/")) {
    expressPath = `/${path}`;
  } else if (path) {
    expressPath = `/api/${path}`;
  }

  const params = new URLSearchParams();
  Object.entries(req.query || {}).forEach(([key, value]) => {
    if (key === "path") return;
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
      return;
    }
    if (value !== undefined) params.append(key, value);
  });

  const query = params.toString();
  return query ? `${expressPath}?${query}` : expressPath;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  try {
    req.url = resolveExpressUrl(req);
    if (req.url.startsWith("/api/health")) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.end(JSON.stringify({
        ok: true,
        service: "noop-cap-api",
        layer: "handler",
        mongoConfigured: Boolean(process.env.MONGODB_URI),
      }));
    }
    if (req.method === "GET" && req.url.startsWith("/auth/me")) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.end(JSON.stringify({ user: hasGuestCookie(req) ? guestUser() : null, auth: {} }));
    }
    if (req.method === "GET" && req.url.startsWith("/auth/login-users")) {
      const data = await loginUsersDirect();
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.end(JSON.stringify(data));
    }
    if (req.method === "POST" && req.url.startsWith("/auth/guest-login")) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Set-Cookie", guestCookieHeader());
      return res.end(JSON.stringify({ user: guestUser() }));
    }
    if (req.method === "POST" && req.url.startsWith("/auth/logout")) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Set-Cookie", "noop_guest=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure");
      return res.end(JSON.stringify({ ok: true }));
    }
    const app = await getApp();
    return app(req, res);
  } catch (error) {
    appPromise = undefined;
    const message = error?.message || "Error interno al iniciar la API.";
    res.statusCode = error?.status || 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({
      ok: false,
      message,
      code: error?.code || error?.codeName || "API_STARTUP_ERROR",
    }));
  }
}

function hasGuestCookie(req) {
  return String(req.headers.cookie || "").split(";").some((part) => part.trim() === "noop_guest=1");
}

function guestCookieHeader() {
  return "noop_guest=1; Path=/; Max-Age=28800; HttpOnly; SameSite=Lax; Secure";
}

function guestUser() {
  return {
    id: "guest",
    name: "Invitado",
    email: "invitado.local@example.com",
    avatar: "",
    role: "viewer",
    status: "active",
    authProvider: "guest",
    passwordUpdatedAt: null,
  };
}

async function loginUsersDirect() {
  const [{ connectDatabase }, { User }] = await Promise.all([
    import("../server/config/db.js"),
    import("../server/models/User.js"),
  ]);
  await connectDatabase();
  const users = await User.find({
    authProvider: "native",
    status: "active",
    role: { $in: ["admin", "collaborator"] },
    passwordHash: { $ne: "" },
  })
    .sort({ name: 1, email: 1 })
    .collation({ locale: "es", strength: 1 });

  return {
    users: users.map((user) => ({
      name: user.name,
      email: user.email,
      role: user.role,
    })),
  };
}
