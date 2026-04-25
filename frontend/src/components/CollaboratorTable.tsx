import { useEffect, useState } from "react";
import { api } from "../api";

interface Collaborator {
  address: string;
  basisPoints: number;
}

interface Props {
  contractId: string;
  refreshKey: number;
}

export default function CollaboratorTable({ contractId, refreshKey }: Props) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!contractId) return;
    setLoading(true);
    setError("");
    api
      .getCollaborators(contractId)
      .then(setCollaborators)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [contractId, refreshKey]);

  if (!contractId) return null;
  if (loading)
    return <div className="card status info">Loading collaborators…</div>;
  if (error) return <div className="card status error">{error}</div>;
  if (!collaborators.length)
    return (
      <div className="card">
        <span className="badge">Collaborators</span>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          No collaborators found. Initialize the contract to add collaborators.
        </p>
      </div>
    );

  return (
    <div className="card">
      <span className="badge">Collaborators</span>
      <table>
        <thead>
          <tr>
            <th>Address</th>
            <th style={{ textAlign: "right" }}>Share</th>
          </tr>
        </thead>
        <tbody>
          {collaborators.map((c) => (
            <tr key={c.address}>
              <td>
                <span title={c.address}>
                  {c.address.slice(0, 8)}...{c.address.slice(-6)}
                </span>
                <button
                  className="copy-btn-sm"
                  onClick={() => navigator.clipboard.writeText(c.address)}
                  title="Copy address"
                >
                  ⧉
                </button>
              </td>
              <td style={{ textAlign: "right" }}>
                <span>{(c.basisPoints / 100).toFixed(2)}%</span>
                <div
                  className="share-bar"
                  style={{ width: `${c.basisPoints / 100}%` }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
