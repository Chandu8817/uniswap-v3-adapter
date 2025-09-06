#!/bin/bash
set -e

# Load environment variables from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "❌ .env file not found!"
  exit 1
fi

# Required variables from .env:
# GRAPH_NODE=http://127.0.0.1:8020
# IPFS_NODE=http://127.0.0.1:5001
# DEPLOY_KEY=dummykey
# NETWORK=arbitrum-local
# SUBGRAPH_NAME=uniswap-v3-arbitrum-ii
# VERSION_LABEL=1e9d8b1
# SUBGRAPH_FILE=v3-subgraph.yaml

echo "🚀 Starting Docker containers..."
docker-compose up -d

echo "🛠️ Building subgraph..."
yarn build --network "$NETWORK" --subgraph-type v3


echo "⏳ Waiting for Graph Node to be ready(re run the sh file if getting any error)... "
sleep 15 


echo "📦 Creating subgraph..."
graph create --node "$ALCHEMY_DEPLOY_URL" "$SUBGRAPH_NAME" || true

  

echo "📤 Deploying subgraph..."
graph deploy \
  --node "$ALCHEMY_DEPLOY_URL" \
  --ipfs "$ALCHEMY_IPFS_URL" \
  --deploy-key "$ALCHEMY_DEPLOY_KEY" \
  --version-label "$VERSION_LABEL" \
  "$SUBGRAPH_NAME" "$SUBGRAPH_FILE"

echo "✅ Subgraph deployed successfully!"
