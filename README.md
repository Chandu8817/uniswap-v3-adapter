# Project Setup & Run Guide

A clean, step‑by‑step walkthrough to run the **smart contracts**, **subgraph**, and **frontend** locally using an Arbitrum mainnet fork.

---

## Prerequisites

* **Node.js** ≥ 18 and **npm**
* **Bun** (for the frontend) → [https://bun.sh](https://bun.sh) else use npm or yarn
* **Docker Desktop** (for Graph Node + IPFS + Postgres)
* **Yarn** (if your subgraph uses it): `npm i -g yarn`
* **Graph CLI**: `npm i -g @graphprotocol/graph-cli`
* An **Arbitrum RPC** URL (e.g., Ankr). You’ll need an API key.

> Tip: If you already have the repo cloned, open four terminals: one for **Hardhat node**, one for **deploy contracts and fund**, one for **subgraph/docker**, and one for **frontend**.

---

## 1) Run Smart Contracts (Hardhat + Fork)

### 1.1 Configure Hardhat fork

Edit `hardhat.config.ts` and add your Arbitrum RPC URL + API key:

```ts
networks: {
  hardhat: {
    forking: {
      url: "https://rpc.ankr.com/arbitrum/<YOUR_API_KEY>",
    },
  }
}
```

> You can also pass the URL on the CLI (shown below), but keeping it in config is simpler.

### 1.2 Start a local Hardhat node (forked)

In **Terminal A**:

```bash
npx hardhat node
# or explicitly:
# npx hardhat node --fork https://rpc.ankr.com/arbitrum/<YOUR_API_KEY>
```

Keep this terminal running.

### 1.3 Deploy contracts to the fork

In **Terminal B**:

```bash
npx hardhat run ./scripts/deploy.ts --network localhost
```

* **Save these two values** from the deploy output:

  * **Adapter address** (deployed contract)
  * **Deployment block number** (you’ll need this for the subgraph start block)

> If your deploy script doesn’t print the block, you can take the block number from the transaction receipt or the Hardhat logs.

### 1.4 Fund the user wallet (impersonation)

Update `scripts/fund.ts` → in the `main` function, set the **recipient wallet address** you want to use. The default Hardhat account is:

```
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

If the impersonated account has low balance, switch to a different rich address.

Run the fund script:

```bash
npx hardhat run scripts/fund.ts --network localhost
```

### 1.5 Smoke test the adapter

Make sure to update the adapter address inside `scripts/smoke.ts`, then run:

```bash
npx hardhat run scripts/smoke.ts --network localhost
```

### 1.6 Run unit tests (optional)

```bash
npx hardhat test 
```

---

## 2) Run Subgraph

You have two options: **(A) one‑command script** or **(B) manual steps**.

Before either option, update your **subgraph config** with the adapter address and the **start block** (the contract deployment block).

* Update **`config.json`** and **`chain.ts`** in the `arbitrum-local` setup (path`subgraph/arbitrum-local/chain.ts` and `subgraph/arbitrum-local/config.json` in your repo)
* Add your Graph Node key to `.env` (as required by your script). Example:

```bash
cd subgraph

```

```bash
# .env (example – adjust to your script)
ALCHEMY_DEPLOY_URL=http://127.0.0.1:8020
ALCHEMY_IPFS_URL=http://127.0.0.1:5001
ALCHEMY_DEPLOY_KEY=dummykey
NETWORK=arbitrum-local
SUBGRAPH_NAME=uniswap-v3-arbitrum-ii
VERSION_LABEL=1e9d8b1
SUBGRAPH_FILE=v3-subgraph.yaml
```

### Option A — One command (recommended)

1. Make the script executable:

```bash
chmod +x ./deploy_subgraph.sh
```

2. Run it:

```bash
./deploy_subgraph.sh
```

### Option B — Manual steps

1. Start Docker services (Graph Node, IPFS, Postgres):

```bash
docker-compose up -d
```

2. Build the subgraph (with the correct network + start block in your config):

```bash
yarn build --network arbitrum-local --subgraph-type v3
```

3. Create the subgraph on the local node:

```bash
graph create --node http://127.0.0.1:8020 uniswap-v3-arbitrum-ii
```

4. Deploy the subgraph:

```bash
graph deploy \
  --node http://127.0.0.1:8020 \
  --ipfs http://127.0.0.1:5001 \
  --deploy-key dummykey \
  --version-label 1e9d8b1 \
  uniswap-v3-arbitrum-ii v3-subgraph.yaml
```

5. (Optional) Stop and clean up Docker:

```bash
docker-compose down -v
```

**Local GraphQL endpoint (default):**

```
http://127.0.0.1:8000/subgraphs/name/uniswap-v3-arbitrum-ii
```

---

## 3) Run Frontend

Create/update `.env` in the frontend app:

```bash
VITE_SUBGRAPH_URL=http://127.0.0.1:8000/subgraphs/name/uniswap-v3-arbitrum-ii
VITE_UNISWAP_V3_ADAPTER_ADDRESS=0xYourAdapterAddress
```

Install deps and run:

```bash
bun install
bun dev
```

Build (optional):

```bash
bun build
# then (optional) preview:
# bun preview
```

---

## Troubleshooting

* **`graph` command not found** → `npm i -g @graphprotocol/graph-cli`
* **Docker not starting / port in use** → stop any old Graph Node containers: `docker-compose down -v`
* **Need to redeploy the subgraph** → re-run build + deploy or re-run `./deploy_subgraph.sh`
* **Impersonation/funding fails** → switch to an Arbitrum account with higher balances and update `scripts/fund.ts`
* **Frontend can’t query** → verify `VITE_SUBGRAPH_URL` matches your local Graph Node endpoint and the subgraph name you created

---

## Quick Copy/Paste (Happy Path)

```bash
# 1) Hardhat fork
npx hardhat node
npx hardhat run scripts/deploy.ts --network localhost
# save: adapter address + deploy block number
npx hardhat run scripts/fund.ts --network localhost
npx hardhat run scripts/smoke.ts --network localhost

# 2) Subgraph (scripted)
chmod +x ./deploy_subgraph.sh
./deploy_subgraph.sh
# OR manual:
docker-compose up -d
yarn build --network arbitrum-local --subgraph-type v3
graph create --node http://127.0.0.1:8020 uniswap-v3-arbitrum-ii
graph deploy --node http://127.0.0.1:8020 --ipfs http://127.0.0.1:5001 --deploy-key dummykey --version-label 1e9d8b1 uniswap-v3-arbitrum-ii v3-subgraph.yaml

# 3) Frontend
# .env
# VITE_SUBGRAPH_URL=http://127.0.0.1:8000/subgraphs/name/uniswap-v3-arbitrum-ii
# VITE_UNISWAP_V3_ADAPTER_ADDRESS=0xYourAdapterAddress
bun install
bun dev
```

---

## Notes

* Keep the Hardhat node running while you interact with the subgraph and frontend.
* Always ensure the **adapter address** and **start block** are consistent across deploy scripts, subgraph config, and frontend `.env`.
