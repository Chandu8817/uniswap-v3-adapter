import { ethers, network } from "hardhat";
import { IERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
const ADDRESSES = {
  USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
};

// Example USDC whale on mainnet
const USDC_WHALE = "0xe398EE26023ba5013B37CBF1d373B68f8F541b20";

// Helper function to fund an account with ETH and tokens
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

      // Fund the WETH contract with ETH first
      await network.provider.send("hardhat_setBalance", [
        token.target,
        ethers.toBeHex(ethers.parseEther("100")),
      ]);

      // Deposit ETH to get WETH
      // await token.connect(wethSigner).deposit({ value: amount });

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
        ethers.toBeHex(ethers.parseEther("10")),
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
  const recipient_address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  if (!recipient_address) {
    console.error("Please provide an address");
    process.exit(1);
  }

  const account = ethers.getAddress(recipient_address);
  await fundAccount(account, Object.values(ADDRESSES), [
    ethers.parseUnits("100", 6),
    ethers.parseEther("10"),
  ]);
  console.log(`Funded account ${account}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
