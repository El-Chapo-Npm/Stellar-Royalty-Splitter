import { Router } from "express";
import { isContractInitialized } from "../stellar.js";

export const contractRouter = Router();

contractRouter.get("/status/:contractId", async (req, res, next) => {
  try {
    const { contractId } = req.params;
    if (!contractId || !/^C[A-Z2-7]{55}$/.test(contractId)) {
      return res.status(400).json({ error: "Invalid contract ID" });
    }
    const initialized = await isContractInitialized(contractId);
    res.json({ initialized });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/contract/shares-total/:contractId
 * Returns the sum of all collaborator shares via simulation.
 * Response: { contractId, totalShares: number }
 */
contractRouter.get("/shares-total/:contractId", async (req, res, next) => {
  try {
    const { contractId } = req.params;
    const contract = new Contract(contractId);

    const dummyAccount = new Account(
      "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
      "0",
    );
    const tx = new TransactionBuilder(dummyAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(contract.call("get_total_shares"))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(sim)) {
      return res.status(400).json({ error: sim.error });
    }

    const resultVal = sim.result?.retval;
    const totalShares = resultVal?.u32() ?? 0;

    res.json({ contractId, totalShares });
  } catch (err) {
    next(err);
  }
});

