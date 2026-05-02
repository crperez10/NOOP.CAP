import { createApp } from "../server/app.js";

let appPromise;

function resolveExpressPath(req) {
  const rawPath = req.query?.path;
  const segments = Array.isArray(rawPath)
    ? rawPath
    : rawPath
      ? [rawPath]
      : [];
  const path = segments.join("/");

  if (!path) return "/api";
  if (path === "health") return "/api/health";
  if (path === "auth") return "/auth";
  if (path.startsWith("auth/")) return `/${path}`;
  if (path === "uploads") return "/uploads";
  if (path.startsWith("uploads/")) return `/${path}`;

  return `/api/${path}`;
}

export default async function handler(req, res) {
  appPromise ||= createApp();

  try {
    req.url = resolveExpressPath(req);
    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    appPromise = undefined;
    throw error;
  }
}
