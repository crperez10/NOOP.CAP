import { createApp } from "../server/app.js";

let appPromise;

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
  appPromise ||= createApp();

  try {
    req.url = resolveExpressUrl(req);
    const app = await appPromise;
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
