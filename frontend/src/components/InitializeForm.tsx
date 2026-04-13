import { useState } from "react";
import { api } from "../api";

interface Collaborator {
  address: string;
  basisPoints: string;
}

interface Props {
  contractId: string;
  walletAddress: string;
  onSuccess: () => void;
}

export default function InitializeForm({
  contractId,
  walletAddress,
  onSuccess,
}: Props) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    { address: "", basisPoints: "" },
  ]);
  const [status, setStatus] = useState<{
    type: "ok" | "error" | "info";
    msg: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  function update(i: number, field: keyof Collaborator, value: string) {
    setCollaborators((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)),
    );
  }

  function addRow() {
    setCollaborators((prev) => [...prev, { address: "", basisPoints: "" }]);
  }

  function removeRow(i: number) {
    setCollaborators((prev) => prev.filter((_, idx) => idx !== i));
  }

  const total = collaborators.reduce(
    (sum, c) => sum + (parseInt(c.basisPoints) || 0),
    0,
  );

  async function submit() {
    if (!contractId)
      return setStatus({ type: "error", msg: "Enter a contract ID first." });
    if (total !== 10_000)
      return setStatus({
        type: "error",
        msg: `Shares must sum to 10,000 bp (currently ${total}).`,
      });

    setLoading(true);
    setStatus({ type: "info", msg: "Building transaction…" });

    try {
      const res = await api.initialize({
        contractId,
        walletAddress,
        collaborators: collaborators.map((c) => c.address),
        shares: collaborators.map((c) => parseInt(c.basisPoints)),
      });
      setStatus({ type: "ok", msg: `Initialized. Tx: ${res.txHash}` });
      onSuccess();
    } catch (e: any) {
      setStatus({ type: "error", msg: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <span className="badge">Initialize</span>

      {collaborators.map((c, i) => (
        <div className="collaborator-row" key={i}>
          <input
            placeholder="Wallet address (G...)"
            value={c.address}
            onChange={(e) => update(i, "address", e.target.value)}
          />
          <input
            placeholder="Basis pts"
            type="number"
            min={1}
            max={10000}
            value={c.basisPoints}
            onChange={(e) => update(i, "basisPoints", e.target.value)}
          />
          {collaborators.length > 1 && (
            <button className="btn-danger" onClick={() => removeRow(i)}>
              ✕
            </button>
          )}
        </div>
      ))}

      <div
        style={{
          fontSize: "0.8rem",
          color: total === 10_000 ? "#86efac" : "#fca5a5",
          marginBottom: "0.75rem",
        }}
      >
        Total: {total} / 10,000 bp ({(total / 100).toFixed(2)}%)
      </div>

      <div className="row">
        <button className="btn-add" onClick={addRow}>
          + Add collaborator
        </button>
        <button className="btn-primary" onClick={submit} disabled={loading}>
          {loading ? "Submitting…" : "Initialize contract"}
        </button>
      </div>

      {status && <div className={`status ${status.type}`}>{status.msg}</div>}
    </div>
  );
}
