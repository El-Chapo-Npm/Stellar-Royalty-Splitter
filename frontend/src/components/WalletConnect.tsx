import { useState } from "react";

interface Props {
  onConnect: (address: string) => void;
}

// Minimal Freighter wallet integration (no heavy SDK needed for connect)
export default function WalletConnect({ onConnect }: Props) {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function connect() {
    setError("");
    try {
      // @ts-ignore — Freighter injects window.freighter
      if (!window.freighter) {
        setError("Freighter wallet not found. Install the browser extension.");
        return;
      }
      // @ts-ignore
      await window.freighter.requestAccess();
      // @ts-ignore
      const { address: addr } = await window.freighter.getAddress();
      setAddress(addr);
      onConnect(addr);
    } catch (e: any) {
      setError(e.message ?? "Connection failed");
    }
  }

  return (
    <div className="card">
      <div className="wallet-row">
        <span className="badge">Wallet</span>
        {address ? (
          <span className="wallet-addr">{address}</span>
        ) : (
          <button className="btn-primary" onClick={connect}>
            Connect Freighter
          </button>
        )}
      </div>
      {error && <div className="status error">{error}</div>}
    </div>
  );
}
