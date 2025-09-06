
# Project Setup & Run Guide

Step-by-step to run **contracts**, **subgraph**, and **frontend** locally on an Arbitrum mainnet fork.

---

## Prerequisites

* **Node.js** ≥ 18 + **npm**
* **Bun** (for frontend) → [bun.sh](https://bun.sh) (or use npm/yarn)
* **Docker** (Graph Node, IPFS, Postgres) make sure its running 
* **Yarn**: `npm i -g yarn`
* **Graph CLI**: `npm i -g @graphprotocol/graph-cli`
* **Arbitrum RPC** (e.g. Ankr with API key)

---

## 1) Smart Contracts (Hardhat Fork)

### 1.1 Start node

```bash
npm install 

npx hardhat node

# or
npx hardhat node --fork https://rpc.ankr.com/arbitrum/<API_KEY>
```

### 1.2 Compile and  Deploy contracts in another terminal 

```bash
npx hardhat compile 

npx hardhat run scripts/deploy.ts --network localhost
```

👉 Save **adapter address** + **deploy block number**.

### 1.3 Fund wallet

Update `scripts/fund.ts` with your recipient address, then:

```bash
npx hardhat run scripts/fund.ts --network localhost
```

### 1.4 Smoke test

Update adapter in `scripts/smoke.ts`, then:

```bash
npx hardhat run scripts/smoke.ts --network localhost
```

---

## 2) Subgraph

### Update config

* Set **adapter address** + **start block** in
  `subgraph/config/arbitrum-local/config.json` and `chain.ts`
* Add `.env`:

```bash
ALCHEMY_DEPLOY_URL=http://127.0.0.1:8020
ALCHEMY_IPFS_URL=http://127.0.0.1:5001
ALCHEMY_DEPLOY_KEY=dummykey
NETWORK=arbitrum-local
SUBGRAPH_NAME=uniswap-v3-arbitrum-ii
VERSION_LABEL=local
SUBGRAPH_FILE=v3-subgraph.yaml
```

You can run the subgraph in **two ways**:

**Option A — One command (recommended):**

```bash
chmod +x ./deploy-subgraph.sh 
./deploy-subgraph.sh

```

**Option B — Manual steps:**

```bash
docker-compose up -d
yarn build --network arbitrum-local --subgraph-type v3
graph create --node http://127.0.0.1:8020 uniswap-v3-arbitrum-ii
graph deploy --node http://127.0.0.1:8020 --ipfs http://127.0.0.1:5001 --deploy-key dummykey --version-label local uniswap-v3-arbitrum-ii v3-subgraph.yaml
```

👉 GraphQL endpoint:
`http://127.0.0.1:8000/subgraphs/name/uniswap-v3-arbitrum-ii`

---

## 3) Frontend

Add `.env`:

```bash
VITE_SUBGRAPH_URL=http://127.0.0.1:8000/subgraphs/name/uniswap-v3-arbitrum-ii
VITE_UNISWAP_V3_ADAPTER_ADDRESS=0xYourAdapterAddress
```

Run:

```bash
bun install
bun dev
```

---

## Quick Path

```bash
# Contracts
npm install
npx hardhat node
npx hardhat comiple
npx hardhat run scripts/deploy.ts --network localhost
npx hardhat run scripts/fund.ts --network localhost 
npx hardhat run scripts/smoke.ts --network localhost

# Subgraph
docker-compose up -d
yarn build --network arbitrum-local --subgraph-type v3
graph create --node http://127.0.0.1:8020 uniswap-v3-arbitrum-ii
graph deploy --node http://127.0.0.1:8020 --ipfs http://127.0.0.1:5001 --deploy-key dummykey --version-label local uniswap-v3-arbitrum-ii v3-subgraph.yaml

# Frontend
bun install
bun dev
```
