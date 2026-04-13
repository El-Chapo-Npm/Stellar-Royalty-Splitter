import { Router } from "express";
import { buildTx, addressToScVal, i128ToScVal } from "../stellar.js";

export const distributeRouter = Router();

/**
 * POST /api/distribute
 * Body: { contractId, walletAddress, tokenId, amount }
 * Returns: { xdr } — unsigned transaction XDR
 */
distributeRouter.post("/", async (req, res, next) => {
  try {
    const { contractId, walletAddress, tokenId, amount } = req.body;

    if (!contractId || !walletAddress || !tokenId || amount == null) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    if (amount <= 0) {
      return res.status(400).json({ error: "Amount must be positive." });
    }

    const txXdr = await buildTx(walletAddress, contractId, "distribute", [
      addressToScVal(tokenId),
      i128ToScVal(amount),
    ]);

    res.json({ xdr: txXdr });
  } catch (err) {
    next(err);
  }
});
