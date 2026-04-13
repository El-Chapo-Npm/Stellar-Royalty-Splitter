import { useState } from "react";
import { api } from "../api";

interface Props {
  contractId: string;
  walletAddress: string;
  onSuccess: () => void;
}

export default function DistributeForm({
  contractId,
  walletAddress,
  onSuccess,
}: Props) {
  const [tokenId, setTokenId] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<{
    type: "ok" | "error" | "info";
    msg: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!contractId)
      return setStatus({ type: "error", msg: "Enter a contract ID first." });
    if (!tokenId || !amount)
      return setStatus({ type: "error", msg: "Fill in token and amount." });

    setLoading(true);
    setStatus({ type: "info", msg: "Building transaction…" });

    try {
      const res = await api.distribute({
        contractId,
        walletAddress,
        tokenId,
        amount: parseInt(amount),
      });
      setStatus({ type: "ok", msg: `Distributed. Tx: ${res.txHash}` });
      onSuccess();
    } catch (e: any) {
      setStatus({ type: "error", msg: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <span className="badge">Distribute</span>
      <label>Token contract address</label>
      <input
        placeholder="C..."
        value={tokenId}
        onChange={(e) => setTokenId(e.target.value)}
      />
      <label>Amount (stroops)</label>
      <input
        placeholder="e.g. 10000000"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button className="btn-primary" onClick={submit} disabled={loading}>
        {loading ? "Submitting…" : "Distribute funds"}
      </button>
      {status && <div className={`status ${status.type}`}>{status.msg}</div>}
    </div>
  );
}
