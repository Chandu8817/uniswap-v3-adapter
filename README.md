
# Project Setup & Run Guide

Step-by-step to run **contracts**, **subgraph**, and **frontend** locally on an Arbitrum mainnet fork.

---

## Prerequisites

* **Node.js** ≥ 18 + **npm**
* **Docker** (Graph Node, IPFS, Postgres) make sure its running 
* **Yarn**: `npm i -g yarn`
* **Graph CLI**: `npm i -g @graphprotocol/graph-cli`
* **Arbitrum RPC** (e.g. Ankr with API key)

---

## 1) Smart Contracts (Hardhat Fork)


### 1.0 Setup `.env`

Create a **`.env`** file in the project root with the following:

```env
# whale address to fund local accounts
WHALE_ADDRESS="0xe398EE26023ba5013B37CBF1d373B68f8F541b20"

# deployed adapter contract address
ADAPTER_ADDRESS=""

# token + router addresses (Arbitrum mainnet)
USDC="0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
WETH="0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
SWAP_ROUTER="0xE592427A0AEce92De3Edee1F18E0157C05861564"
NONFUNGIBLE_POSITION_MANAGER="0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
QUOTER_V2="0x61fFE014bA17989E743c5F6cB21bF9697530B21e"
ARBITRUM_RPC_URL="https://rpc.ankr.com/arbitrum/api-key"
```


### 1.1 Start node

```bash
npm install

npx hardhat node

# or fork Arbitrum 
npx hardhat node --fork https://rpc.ankr.com/arbitrum/<API_KEY>
```

### 1.2 Compile and Deploy contracts

```bash
npx hardhat compile
npx hardhat run scripts/deploy.ts --network localhost
```

👉 Save **adapter address** + **deploy block number** in `.env`.

### 1.3 Fund wallet

Update `scripts/fund.ts` with your recipient address:

```bash
npx hardhat run scripts/fund.ts --network localhost
```

### 1.4 Smoke test

Update adapter in `.env` or `scripts/smoke.ts`:

```bash
npx hardhat run scripts/smoke.ts --network localhost
```

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

dependency

 ```bash

 yarn install 

 ```



You can run the subgraph in **two ways**:

**Option A — One command (recommended):**

```bash
// for linux or mac
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
yarn install
yarn dev
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
yarn install
docker-compose up -d
yarn build --network arbitrum-local --subgraph-type v3
graph create --node http://127.0.0.1:8020 uniswap-v3-arbitrum-ii
graph deploy --node http://127.0.0.1:8020 --ipfs http://127.0.0.1:5001 --deploy-key dummykey --version-label local uniswap-v3-arbitrum-ii v3-subgraph.yaml

# Frontend
yarn install
yarn dev
```
