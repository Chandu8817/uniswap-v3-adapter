Here’s a neat `run.md` file you can include in your project with proper formatting and instructions:

````markdown
# Project Run Instructions
## 1. Run Smart Contracts

1. Update your API key in `hardhat.config.ts`:

```ts
network fork https://arbitrum-mainnet.g.alchemy.com/v2/your-api-key
```

2. Start a local Hardhat node with fork:

```bash
npx hardhat node --fork https://arbitrum-mainnet.g.alchemy.com/v2/your-api-key
```

3. Deploy contracts:

```bash
npx hardhat run ./scripts/deploy.ts --network localhost
```

4. Fund deployed contracts

```bash
npx hardhat run scripts/fund.ts --network localhost
```

5. Update deployed adapter address in `smoke.ts`.

6. Test all contract functions:

```bash
npx hardhat run scripts/smoke.ts --network localhost
```

```
## 2. Run Subgraph

1. Start Docker services:
```bash
docker-compose up -d
````

2. Build subgraph:

set network config with adapter address and start blocknumber  use contract deployed blocknumber

```bash
yarn build --network arbitrum-local --subgraph-type v3
```

3. Create subgraph on local node:

```bash
graph create --node http://127.0.0.1:8020 uniswap-v3-arbitrum-ii
```

4. Deploy subgraph:

```bash
graph deploy --node http://127.0.0.1:8020 --ipfs http://127.0.0.1:5001 --deploy-key dummykey --version-label 1e9d8b1 uniswap-v3-arbitrum-ii v3-subgraph.yaml
```

5. Stop and remove Docker containers if needed:

```bash
docker-compose down -v
```

---

## 3. Run Frontend

1. Install dependencies:

```bash
bun install
```

2. Build the frontend:

```bash
bun build
```

3. Start development server:

```bash
bun dev
```

---

```
