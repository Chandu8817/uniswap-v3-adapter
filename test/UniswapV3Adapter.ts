import { ethers, network } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { IERC20, UniswapV3Adapter } from "../typechain-types";

import { fundAccount } from "../scripts/fund";

// Mainnet addresses for Arbitrum
const ADDRESSES = {
  USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  NONFUNGIBLE_POSITION_MANAGER: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  SWAP_ROUTER: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  QUOTER_V2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e"
};






describe("UniswapV3Adapter", function () {
  // Increase timeout for tests that interact with forked network
  this.timeout(60000);

  // Deploy the contract and set up initial state
  async function deployUniswapV3AdapterFixture() {
    const [deployer, user] = await ethers.getSigners();

    // Fund the deployer with ETH
    await network.provider.send("hardhat_setBalance", [
      deployer.address,
      ethers.toBeHex(ethers.parseEther("100")) // 100 ETH
    ]);

    // Deploy the adapter
    const UniswapV3Adapter = await ethers.getContractFactory("UniswapV3Adapter", deployer);
    const adapter = await UniswapV3Adapter.deploy(
      ADDRESSES.SWAP_ROUTER,
      ADDRESSES.NONFUNGIBLE_POSITION_MANAGER,
      ADDRESSES.QUOTER_V2,
      { gasLimit: 10000000 }
    ) as unknown as UniswapV3Adapter;

    await adapter.waitForDeployment();
    console.log("UniswapV3Adapter deployed to:", await adapter.getAddress());

    // Get token contracts
    const usdc = await ethers.getContractAt("IERC20", ADDRESSES.USDC) as unknown as IERC20;
    const weth = await ethers.getContractAt("IERC20", ADDRESSES.WETH) as unknown as IERC20;

    try {
      // Fund user account with tokens
      await fundAccount(user, [ADDRESSES.USDC, ADDRESSES.WETH], [
        ethers.parseUnits("10000", 6), // 10,000 USDC
        ethers.parseEther("10")        // 10 WETH
      ]);
    } catch (error) {
      console.error("Error funding account:", error);
      throw error;
    }

    return { adapter , usdc, weth, user };
  }

  describe("Deployment", function () {
    it("Should set the correct addresses", async function () {
      const { adapter } = await loadFixture(deployUniswapV3AdapterFixture);

      // Check that the contract was deployed with the correct addresses
      expect(await adapter.swapRouter()).to.equal(ADDRESSES.SWAP_ROUTER);
      expect(await adapter.positionManager()).to.equal(ADDRESSES.NONFUNGIBLE_POSITION_MANAGER);
      expect(await adapter.quoter()).to.equal(ADDRESSES.QUOTER_V2);
    });
  });

  describe("addLiquidity", function () {
    it("Should add liquidity and emit LiquidityAdded event", async function () {
      const { adapter, usdc, weth, user } = await loadFixture(deployUniswapV3AdapterFixture) ;

      const usdcAmount = ethers.parseUnits("1000", 6);
      const wethAmount = ethers.parseEther("0.1");
      const fee = 3000; // 0.3%

      console

      // Log balances before the operation
      console.log("User USDC balance before:", await usdc.balanceOf(user.address));
      console.log("User WETH balance before:", await weth.balanceOf(user.address));

      // // Approve the adapter to spend tokens
      console.log("Approving tokens...");

      const usdcApproveTx = await usdc.connect(user).approve(await adapter.getAddress(), usdcAmount);
      await usdcApproveTx.wait();

      const wethApproveTx = await weth.connect(user).approve(await adapter.getAddress(), wethAmount);
      await wethApproveTx.wait();

      console.log("Adding liquidity...");
      const tx = await adapter.connect(user).addLiquidity(
        ADDRESSES.USDC,
        ADDRESSES.WETH,
        fee,
        usdcAmount,
        wethAmount,
        -887220, // Min tick
        887220,  // Max tick
        { gasLimit: 2000000 }
      );

      console.log("Waiting for transaction...");
      const receipt = await tx.wait();
      console.log("Transaction completed");
      if (!receipt) {
        throw new Error("Transaction receipt not found");
      }

      // // Check if the event was emitted
      // const event = receipt.events?.find((e) => e.event === "LiquidityAdded");
      const liquidityLog = receipt.logs.find(log => log.address.toLowerCase() === String(adapter.target).toLowerCase()) as any;
      // console.log("Liquidity log:", liquidityLog);

      // console.log("Receipt logs:", receipt.logs.map(l => ({
      //   address: l.address,
      //   topics: l.topics,
      //   data: l.data
      // })));
      // LiquidityAdded event assertions
      if (!liquidityLog) {
        throw new Error("Liquidity log not found");
      }

      expect(liquidityLog).to.not.be.undefined;
      expect(liquidityLog.args[1]).to.equal(ADDRESSES.USDC);   // tokenA
      expect(liquidityLog.args[2]).to.equal(ADDRESSES.WETH);   // tokenB
      expect(liquidityLog.args[3]).to.equal(fee);              // fee (e.g., 3000)
      expect(liquidityLog.args[4]).to.equal(usdcAmount);          // amount0
      expect(liquidityLog.args[5]).to.equal(wethAmount);          // amount1
      expect(liquidityLog.args[6]).to.equal(-887220);
      expect(liquidityLog.args[7]).to.equal(887220);


      // // Store the tokenId for later tests
      const tokenId = liquidityLog.args[0];

      // // Check that the position was created
      const positionManager = await ethers.getContractAt("INonfungiblePositionManager", ADDRESSES.NONFUNGIBLE_POSITION_MANAGER);
      const position = await positionManager.positions(tokenId);
      expect(position.liquidity).to.be.gt(0);

      return { tokenId };
    });
  });

  describe("swapExactInputSingle", function () {
    it("Should swap exact input single", async function () {
      const { adapter, usdc, weth, user } = await loadFixture(deployUniswapV3AdapterFixture);

      const amountIn = ethers.parseUnits("100", 6); // 100 USDC
      const fee = 3000; // 0.3%

      // Approve the adapter to spend USDC
      await usdc.connect(user).approve(await adapter.getAddress(), amountIn);

      // Get a quote for the swap

      const quotedOut = await adapter.getQuote.staticCall(
        ADDRESSES.USDC,
        ADDRESSES.WETH,
        fee,
        amountIn,
      );

      // Perform the swap
      const tx = await adapter.connect(user).swapExactInput(
        ADDRESSES.USDC,
        ADDRESSES.WETH,
        fee,
        amountIn,
        quotedOut,
        { from: user.address }
      );

      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error("Transaction receipt not found");
      }
      const swapLog = receipt.logs.find(log => log.address.toLowerCase() ===String(adapter.target).toLowerCase()) as any;

      expect(swapLog).to.not.be.undefined;
      expect(swapLog.args[0]).to.equal(ADDRESSES.USDC);   // tokenB
      expect(swapLog.args[1]).to.equal(ADDRESSES.WETH);   // tokenA
      expect(swapLog.args[2]).to.equal(fee);              // fee (e.g., 3000)
      expect(swapLog.args[3]).to.equal(amountIn);          // amount0
      expect(swapLog.args[4]).to.be.gt(0);          // amount1



    });
  });

  describe("withdrawLiquidity", function () {
    it("Should withdraw liquidity and emit LiquidityRemoved event", async function () {
      const { adapter, usdc, weth, user } = await loadFixture(deployUniswapV3AdapterFixture);

      // First add liquidity to get a position
      const usdcAmount = ethers.parseUnits("1000", 6);
      const wethAmount = ethers.parseEther("0.1");
      const fee = 3000;

      await usdc.connect(user).approve(await adapter.getAddress(), usdcAmount);
      await weth.connect(user).approve(await adapter.getAddress(), wethAmount);

      const txAdd = await adapter.connect(user).addLiquidity(
        ADDRESSES.USDC,
        ADDRESSES.WETH,
        fee,
        usdcAmount,
        wethAmount,
        -887220,
        887220,
        { from: user.address }
      );

      const receiptAdd = await txAdd.wait();
      if (!receiptAdd) {
        throw new Error("Transaction receipt not found");
      }
      const liquidityLog = receiptAdd.logs.find(log => log.address.toLowerCase() === String(adapter.target).toLowerCase()) as any;
      const tokenId = liquidityLog.args[0];

      // Approve the adapter to manage the NFT
      const positionManager = await ethers.getContractAt("INonfungiblePositionManager", ADDRESSES.NONFUNGIBLE_POSITION_MANAGER) as any;
      await positionManager.connect(user).approve(await adapter.getAddress(), tokenId);
      

      // Get position details before withdrawal
      const positionBefore = await positionManager.positions(tokenId);
      console.log("Position before withdrawal:", positionBefore);
      const liquidity = positionBefore.liquidity;
      // Withdraw liquidity
      const tx = await adapter.connect(user).withdrawLiquidity(
        tokenId,
        liquidity,
        0,
        0,
        { from: user.address }
      );

      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error("Transaction receipt not found");
      }

      // Check if the event was emitted
      const withdrawEvent = receipt.logs.find(log => log.address.toLowerCase() === String(adapter.target).toLowerCase()) as any;
      console.log("Withdraw event:", withdrawEvent);
      expect(withdrawEvent).to.not.be.undefined;
      expect(withdrawEvent.args[0]).to.equal(tokenId);
      expect(withdrawEvent.args[1]).to.equal(ADDRESSES.WETH);   // tokenB
      expect(withdrawEvent.args[2]).to.equal(ADDRESSES.USDC);   // tokenA
      expect(withdrawEvent.args[3]).to.equal(fee);              // fee (e.g., 3000)
      expect(withdrawEvent.args[4]).to.be.gt(0);          // amount0
      expect(withdrawEvent.args[5]).to.be.gt(0);          // amount1


      // Verify the position was closed (liquidity is 0)
      const positionAfter = await positionManager.positions(tokenId);
      console.log("Position after withdrawal:", positionAfter);
      expect(positionAfter.liquidity).to.equal(0);
    });
  });
});
