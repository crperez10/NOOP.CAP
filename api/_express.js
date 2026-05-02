import { createApp } from "../server/app.js";

let appPromise;

export async function runExpress(req, res, pathname = req.url) {
  appPromise ||= createApp();
  try {
    req.url = pathname;
    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    appPromise = undefined;
    throw error;
  }
}
