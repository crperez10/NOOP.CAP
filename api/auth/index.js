import { runExpress } from "../_express.js";

export default async function handler(req, res) {
  const queryIndex = req.url.indexOf("?");
  const query = queryIndex >= 0 ? req.url.slice(queryIndex) : "";
  return runExpress(req, res, `/auth${query}`);
}
