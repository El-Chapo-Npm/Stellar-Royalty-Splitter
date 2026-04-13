import { Router } from "express";
import { buildTx, addressToScVal, u32ToScVal, vecToScVal } from "../stellar.js";

export const initializeRouter = Router();

/**
 * POST /api/initialize
 * Body: { contractId, walletAddress, collaborators: string[], shares: number[] }
 * Returns: { xdr } — unsigned transaction XDR for the frontend to sign & submit
 */
initializeRouter.post("/", async (req, res, next) => {
  try {
    const { contractId, walletAddress, collaborators, shares } = req.body;

    if (
      !contractId ||
      !walletAddress ||
      !collaborators?.length ||
      !shares?.length
    ) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    if (collaborators.length !== shares.length) {
      return res
        .status(400)
        .json({ error: "collaborators and shares length mismatch." });
    }
    const total = shares.reduce((s, n) => s + n, 0);
    if (total !== 10_000) {
      return res
        .status(400)
        .json({ error: `Shares must sum to 10000 bp (got ${total}).` });
    }

    const collaboratorVec = vecToScVal(collaborators.map(addressToScVal));
    const sharesVec = vecToScVal(shares.map(u32ToScVal));

    const txXdr = await buildTx(walletAddress, contractId, "initialize", [
      collaboratorVec,
      sharesVec,
    ]);

    res.json({ xdr: txXdr });
  } catch (err) {
    next(err);
  }
});
