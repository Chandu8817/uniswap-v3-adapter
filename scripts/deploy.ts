import { ethers } from "hardhat";

 const ADDRESSES = {
  SWAP_ROUTER: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  NONFUNGIBLE_POSITION_MANAGER: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  QUOTER_V2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
  USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",

};
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  const Adapter = await ethers.getContractFactory("UniswapV3Adapter");
  const adapter = await Adapter.deploy(
    ADDRESSES.SWAP_ROUTER,
    ADDRESSES.NONFUNGIBLE_POSITION_MANAGER,
    ADDRESSES.QUOTER_V2,
    
  );

  await adapter.waitForDeployment();


  console.log("Adapter deployed to:", await adapter.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
