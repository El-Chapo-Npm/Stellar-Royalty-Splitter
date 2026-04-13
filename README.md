# Stellar Royalty Splitter

A Soroban smart contract on the Stellar network that automatically distributes NFT sale proceeds among multiple collaborators based on predefined percentage allocations.

---

## How it works

1. Deploy the contract
2. Call `initialize` with collaborator addresses and their shares (in basis points)
3. When a sale occurs, funds are sent to the contract address
4. Call `distribute` — funds split instantly, on-chain, with no intermediaries

Shares are expressed in **basis points** (1 bp = 0.01%). They must sum to **10,000** (100%).

---

## Project structure

```
├── src/lib.rs                        # Soroban contract (Rust)
├── tests/integration_test.rs
├── scripts/deploy.sh
├── Cargo.toml
├── frontend/                         # React + Vite UI
│   └── src/
│       ├── App.tsx
│       ├── api.ts                    # Backend client
│       └── components/
│           ├── WalletConnect.tsx     # Freighter wallet connect
│           ├── InitializeForm.tsx    # Set up collaborators
│           ├── DistributeForm.tsx    # Trigger distribution
│           └── CollaboratorTable.tsx # View current splits
└── backend/                          # Express API
    └── src/
        ├── index.js
        ├── stellar.js                # Soroban RPC helpers
        └── routes/
            ├── initialize.js
            ├── distribute.js
            └── collaborators.js
```

---

## Prerequisites

| Tool          | Install                                    |
| ------------- | ------------------------------------------ |
| Rust          | https://rustup.rs                          |
| wasm32 target | `rustup target add wasm32-unknown-unknown` |
| Stellar CLI   | `cargo install --locked stellar-cli`       |

---

## Build

```bash
cargo build --target wasm32-unknown-unknown --release
```

---

## Test

```bash
cargo test
```

---

## Deploy to Testnet

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

---

## Contract API

### `initialize(collaborators: Vec<Address>, shares: Vec<u32>)`

Sets up the revenue split. Can only be called once.

- `collaborators` — list of recipient wallet addresses
- `shares` — basis-point allocation per collaborator (must sum to 10,000)

### `distribute(token: Address, amount: i128)`

Transfers `amount` of `token` from the contract to all collaborators proportionally.

### `get_collaborators() → Vec<Address>`

Returns all registered collaborator addresses.

### `get_share(collaborator: Address) → u32`

Returns the basis-point share for a given address.

---

## Example: 3-way split

```bash
# 50% artist / 30% musician / 20% animator
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- initialize \
  --collaborators '["GARTIST...","GMUSICIAN...","GANIMATOR..."]' \
  --shares '[5000,3000,2000]'
```

---

## Rounding

Integer division is used for each collaborator's payout. Any rounding dust (1–2 stroops) is assigned to the last collaborator in the list to ensure the full amount is always distributed.

---

## Running the frontend & backend

```bash
# Backend
cd backend
cp .env.example .env   # fill in your keys
npm install
npm run dev            # http://localhost:3001

# Frontend (separate terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173
```

The frontend proxies `/api/*` to the backend automatically via Vite config.

The backend builds unsigned transaction XDR and returns it to the frontend. Freighter signs and submits — your private key never leaves the browser.

---

## Roadmap

- [ ] Dynamic royalty adjustments via governance
- [ ] Secondary market resale royalty hooks
- [ ] Role-based contributor management
- [ ] Dashboard UI for earnings tracking

---

## License

MIT
