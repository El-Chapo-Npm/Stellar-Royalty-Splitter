import { Router } from "express";
import { indexDocument, searchDocuments } from "../database/search.js";
import { sendError } from "../error-response.js";

export const searchRouter = Router();

searchRouter.get("/", (req, res) => {
  const query = String(req.query.q ?? "").trim();
  if (query.length < 2 || query.length > 200)
    return sendError(res, 400, "invalid_query", "q must contain 2-200 characters");
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  return res.json({
    success: true,
    data: searchDocuments(query, { entityType: req.query.entityType, limit }),
    query,
  });
});

searchRouter.post("/documents", (req, res) => {
  const { entityType, entityId, title, body, metadata = {} } = req.body ?? {};
  if (
    ![entityType, entityId, title, body].every((value) => typeof value === "string" && value.trim())
  ) {
    return sendError(
      res,
      400,
      "invalid_document",
      "entityType, entityId, title, and body are required"
    );
  }
  return res
    .status(201)
    .json({ success: true, data: indexDocument({ entityType, entityId, title, body, metadata }) });
});
