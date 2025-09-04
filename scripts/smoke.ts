import { ethers, network } from "hardhat";
import { IERC20, UniswapV3Adapter } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

// Example USDC whale on mainnet
const USDC_WHALE = "0xe398EE26023ba5013B37CBF1d373B68f8F541b20";

const ADDRESSES = {
  SWAP_ROUTER: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  NONFUNGIBLE_POSITION_MANAGER: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  QUOTER_V2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
  USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
};

export async function fundAccount(
  account: SignerWithAddress | string,
  tokenAddresses: string[],
  amounts: bigint[],
) {
  // Fund with ETH first
  await network.provider.send("hardhat_setBalance", [
    account instanceof SignerWithAddress ? account.address : account,
    ethers.toBeHex(ethers.parseEther("100")), // 100 ETH
  ]);

  // Fund with tokens
  for (let i = 0; i < tokenAddresses.length; i++) {
    const tokenAddress = tokenAddresses[i];
    const amount = amounts[i];
    const token = (await ethers.getContractAt(
      "IERC20",
      tokenAddress,
    )) as unknown as IERC20;

    if (tokenAddress === ADDRESSES.WETH) {
      // For WETH, we'll use the WETH contract to mint
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [token.target],
      });

      const wethSigner = await ethers.getSigner(token.target as string);

      // Transfer WETH to the account
      await token
        .connect(wethSigner)
        .transfer(
          account instanceof SignerWithAddress ? account.address : account,
          amount,
        );

      // Stop impersonating
      await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [token.target],
      });
      continue;
    }

    // For USDC, use the whale
    if (tokenAddress === ADDRESSES.USDC) {
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [USDC_WHALE],
      });

      const whale = await ethers.getSigner(USDC_WHALE);

      // Fund the whale with ETH for gas
      await network.provider.send("hardhat_setBalance", [
        USDC_WHALE,
        ethers.toBeHex(ethers.parseEther("1000")),
      ]);

      // Transfer USDC to the account
      await token
        .connect(whale)
        .transfer(
          account instanceof SignerWithAddress ? account.address : account,
          amount,
        );

      // Stop impersonating
      await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [USDC_WHALE],
      });
      continue;
    }

    throw new Error(`Unsupported token: ${tokenAddress}`);
  }
}

async function main() {
  const [deployer, user] = await ethers.getSigners();
  await fundAccount(
    user,
    [ADDRESSES.USDC, ADDRESSES.WETH],
    [
      ethers.parseUnits("1000", 6), // 100 USDC
      ethers.parseEther("1"), // 1 WETH
    ],
  );
  // Attach adapter (make sure to replace with actual deployed address)
  const adapterAddr = "0x0CED7BC8e0E5Ec747B591480De6eFE084Ddb7Bb5";
  const adapter = (await ethers.getContractAt(
    "UniswapV3Adapter",
    adapterAddr,
  )) as unknown as UniswapV3Adapter;

  const usdc = (await ethers.getContractAt(
    "IERC20",
    ADDRESSES.USDC,
  )) as unknown as IERC20;
  const weth = (await ethers.getContractAt(
    "IERC20",
    ADDRESSES.WETH,
  )) as unknown as IERC20;

  // Approve adapter
  await usdc.connect(user).approve(adapter.target, ethers.MaxUint256);
  await weth.connect(user).approve(adapter.target, ethers.MaxUint256);

  // Add liquidity
  const fee = 3000;
  const amountUSDC = ethers.parseUnits("100", 6);
  const amountWETH = ethers.parseEther("1");
  const userbal = await usdc.balanceOf(user.address);

  console.log("User USDC balance:", userbal.toString());
  console.log(
    "User WETH balance:",
    (await weth.balanceOf(user.address)).toString(),
  );

  const addTx = await adapter.connect(user).addLiquidity(
    ADDRESSES.USDC,
    ADDRESSES.WETH,
    fee,
    amountUSDC,
    amountWETH,
    -60000, // tickLower
    60000, // tickUpper
  );

  const receipt = await addTx.wait();
  console.log("Liquidity added in tx:", receipt?.hash);

  if (!receipt) {
    throw new Error("Transaction receipt not found");
  }

  const liquidityLog = receipt.logs.find(
    (log) => log.address.toLowerCase() === String(adapter.target).toLowerCase(),
  ) as any;
  //  console.log("Liquidity added event:", liquidityLog);

  // Extract tokenId from event
  const tokenId = liquidityLog.args[0];

  if (!tokenId) {
    throw new Error("No tokenId found in logs");
  }

  console.log("Minted position tokenId:", tokenId.toString());

  // Withdraw liquidity
  const positionManagerAddr = ADDRESSES.NONFUNGIBLE_POSITION_MANAGER;
  const positionManager = (await ethers.getContractAt(
    "INonfungiblePositionManager",
    positionManagerAddr,
  )) as any;
  await positionManager
    .connect(user)
    .approve(await adapter.getAddress(), tokenId);
  const pos = await positionManager.positions(tokenId);
  const liquidity = pos.liquidity;

  const withdrawTx = await adapter
    .connect(user)
    .withdrawLiquidity(tokenId, liquidity, 0, 0);
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

  const swapTx = await adapter
    .connect(user)
    .swapExactInput(ADDRESSES.USDC, ADDRESSES.WETH, fee, amountIn, amountOut, {
      from: user.address,
    });
  await swapTx.wait();

  console.log(`Swapped ${amountIn} USDC for ${amountOut} WETH`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
