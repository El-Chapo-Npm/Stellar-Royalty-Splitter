import { useState } from "react";
import WalletConnect from "./components/WalletConnect";
import InitializeForm from "./components/InitializeForm";
import DistributeForm from "./components/DistributeForm";
import CollaboratorTable from "./components/CollaboratorTable";

export default function App() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [contractId, setContractId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="container">
      <h1>Stellar Royalty Splitter</h1>
      <h2>Automated on-chain revenue distribution</h2>

      <WalletConnect onConnect={setWalletAddress} />

      <div className="card">
        <label>Contract ID</label>
        <input
          placeholder="C..."
          value={contractId}
          onChange={(e) => setContractId(e.target.value)}
        />
      </div>

      {walletAddress && (
        <>
          <InitializeForm
            contractId={contractId}
            walletAddress={walletAddress}
            onSuccess={() => setRefreshKey((k) => k + 1)}
          />
          <DistributeForm
            contractId={contractId}
            walletAddress={walletAddress}
            onSuccess={() => setRefreshKey((k) => k + 1)}
          />
          <CollaboratorTable contractId={contractId} refreshKey={refreshKey} />
        </>
      )}
    </div>
  );
}
