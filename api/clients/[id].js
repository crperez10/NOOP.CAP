import { runExpress } from "../_express.js";

export default async function handler(req, res) {
  return runExpress(req, res, `/api/clients/${req.query.id}`);
}
