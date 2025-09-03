import { ethers } from "hardhat";
import { IERC20, UniswapV3Adapter } from "../typechain-types";

import { fundAccount } from "./fund";
const ADDRESSES = {
    SWAP_ROUTER: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    NONFUNGIBLE_POSITION_MANAGER: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    QUOTER_V2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  
  };



async function main() {
  const [deployer, user] = await ethers.getSigners();
      await fundAccount(user, [ADDRESSES.USDC, ADDRESSES.WETH], [
        ethers.parseUnits("10000", 6), // 10,000 USDC
        ethers.parseEther("10")        // 10 WETH
      ]);
  // Attach adapter (make sure to replace with actual deployed address)
  const adapterAddr = "0x1E2aCD68C1C09d41c72E835Da8152e1028Be0F20";
  const adapter = await ethers.getContractAt("UniswapV3Adapter", adapterAddr) as unknown as UniswapV3Adapter;

  const usdc = await ethers.getContractAt("IERC20", ADDRESSES.USDC) as unknown as IERC20;
  const weth = await ethers.getContractAt("IERC20", ADDRESSES.WETH) as unknown as IERC20;

  // Approve adapter
  await usdc.connect(user).approve(adapter.target, ethers.MaxUint256);
  await weth.connect(user).approve(adapter.target, ethers.MaxUint256);

  // Add liquidity
  const fee = 3000;
  const amountUSDC = ethers.parseUnits("1000", 6);
  const amountWETH = ethers.parseEther("1");

  const addTx = await adapter.connect(user).addLiquidity(
    ADDRESSES.USDC,
    ADDRESSES.WETH,
    fee,
    amountUSDC,
    amountWETH,
    -60000, // tickLower
    60000   // tickUpper
  );

  const receipt = await addTx.wait();
  console.log("Liquidity added in tx:", receipt?.hash);

  if (!receipt) {
    throw new Error("Transaction receipt not found");
  }

  const liquidityLog = receipt.logs.find(log => log.address.toLowerCase() === String(adapter.target).toLowerCase()) as any;


  // Extract tokenId from event
  const tokenId = liquidityLog.args[0];

  if (!tokenId) {
    throw new Error("No tokenId found in logs");
  }

  console.log("Minted position tokenId:", tokenId.toString());

  // Withdraw liquidity
  const positionManagerAddr = ADDRESSES.NONFUNGIBLE_POSITION_MANAGER;
  const positionManager = await ethers.getContractAt("INonfungiblePositionManager", positionManagerAddr) as any;
  await positionManager.connect(user).approve(await adapter.getAddress(), tokenId);
  const pos = await positionManager.positions(tokenId);
  const liquidity = pos.liquidity;

  const withdrawTx = await adapter.connect(user).withdrawLiquidity(
    tokenId,
    liquidity,
    0,
    0
  );
  await withdrawTx.wait();

  console.log(`Liquidity withdrawn for tokenId ${tokenId}`);

  // swapExactInputSingle
  const amountIn = ethers.parseUnits("100", 6); // 100 USDC
  const amountOut = await adapter.getQuote.staticCall(
    ADDRESSES.USDC,
    ADDRESSES.WETH,
    fee,
    amountIn,
  );

  const swapTx = await adapter.connect(user).swapExactInput(
    ADDRESSES.USDC,
    ADDRESSES.WETH,
    fee,
    amountIn,
    amountOut,
    { from: user.address }
  );
  await swapTx.wait();

  console.log(`Swapped ${amountIn} USDC for ${amountOut} WETH`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
