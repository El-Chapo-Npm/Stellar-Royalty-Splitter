import { Router } from "express";
import {
  computeTrustScore,
  getReputation,
  listReputations,
  recordReputationEvent,
} from "../database/reputation.js";
import { sendError } from "../error-response.js";

export const reputationRouter = Router();
const walletPattern = /^G[A-Z2-7]{55}$/;

reputationRouter.post("/events", (req, res) => {
  const { walletAddress, eventType, successful = true, occurredAt, metadata = {} } = req.body ?? {};
  if (
    !walletPattern.test(walletAddress ?? "") ||
    !["payment", "distribution", "activity"].includes(eventType)
  ) {
    return sendError(
      res,
      400,
      "invalid_reputation_event",
      "walletAddress and a supported eventType are required"
    );
  }
  const event = recordReputationEvent({
    walletAddress,
    eventType,
    successful,
    occurredAt,
    metadata,
  });
  return res
    .status(201)
    .json({ success: true, data: event, reputation: computeTrustScore(walletAddress) });
});

reputationRouter.get("/:walletAddress", (req, res) => {
  if (!walletPattern.test(req.params.walletAddress))
    return sendError(res, 400, "invalid_wallet_address", "Invalid wallet address");
  return res.json({ success: true, data: getReputation(req.params.walletAddress) });
});

reputationRouter.get("/", (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  return res.json({ success: true, data: listReputations(limit) });
});
