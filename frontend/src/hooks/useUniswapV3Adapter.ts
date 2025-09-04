import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { JsonRpcSigner } from "ethers";
import UNISWAP_V3_ADAPTER_ABI from "../abis/UniswapV3Adapter.json";

// Replace with your contract address
const UNISWAP_V3_ADAPTER_ADDRESS = import.meta.env
  .VITE_UNISWAP_V3_ADAPTER_ADDRESS;

export const useUniswapV3Adapter = (signer: JsonRpcSigner | null) => {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("useEffect in useUniswapV3Adapter - signer changed:", !!signer);
    if (signer) {
      try {
        console.log(
          "Creating new contract instance with address:",
          UNISWAP_V3_ADAPTER_ADDRESS,
        );
        const contractInstance = new ethers.Contract(
          UNISWAP_V3_ADAPTER_ADDRESS,
          UNISWAP_V3_ADAPTER_ABI,
          signer,
        );
        console.log("Contract instance created:", contractInstance);
        setContract(contractInstance);
      } catch (err) {
        console.error("Error creating contract instance:", err);
        setError("Failed to initialize contract");
      }
    } else {
      console.log("No signer available, setting contract to null");
      setContract(null);
    }
  }, [signer]);

  const getQuote = async (
    tokenIn: string,
    tokenOut: string,
    fee: number,
    amountIn: string,
    decimalsIn: number,
    decimalsOut: number,
  ) => {
    if (!contract) {
      throw new Error("Contract not initialized");
    }

    try {
      setLoading(true);
      setError(null);

      const amountInWei = ethers.parseUnits(amountIn, decimalsIn);

      const quote = await contract.getQuote.staticCall(
        tokenIn,
        tokenOut,
        fee,
        amountInWei,
      );

      return ethers.formatUnits(quote, decimalsOut);
    } catch (err: any) {
      console.error("Error getting quote:", err);
      setError(err.message || "Failed to get quote");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addLiquidity = async (
    tokenA: string,
    tokenB: string,
    amountA: bigint,
    amountB: bigint,
    tickLower: number,
    tickUpper: number,

    fee: number, // fee in basis points (e.g., 3000 for 0.3%)
    decimalsA: number,
    decimalsB: number,
  ) => {
    if (!contract) {
      throw new Error("Contract not initialized");
    }

    // Validate fee tier (common Uniswap V3 fee tiers: 100, 500, 3000, 10000)
    const validFees = [100, 500, 3000, 10000];
    if (!validFees.includes(fee)) {
      throw new Error(
        `Invalid fee tier. Must be one of: ${validFees.join(", ")}`,
      );
    }

    try {
      setLoading(true);
      setError(null);

      // Parse amounts with appropriate decimals (18 for WETH, 6 for USDC, etc.)

      // Convert amounts to BigInt with correct decimals

      console.log("Adding liquidity with params:", {
        tokenA,
        tokenB,
        fee,
        amountA: amountA.toString(),
        amountB: amountB.toString(),
        tickLower,
        tickUpper,
        decimalsA,
        decimalsB,
      });

      if (!contract.runner) {
        throw new Error("No signer available");
      }

      // Increase gas limit for complex operations
      const tx = await contract.addLiquidity(
        tokenA,
        tokenB,
        fee,
        amountA,
        amountB,
        tickLower,
        tickUpper,
      );

      console.log("Transaction submitted, waiting for confirmation...");
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);
      return receipt;
    } catch (err: any) {
      console.error("Error adding liquidity:", err);
      setError(err.message || "Failed to add liquidity");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const withdrawLiquidity = async (
    tokenId: string,
    liquidity: string,
    amount0Min: bigint,
    amount1Min: bigint,
  ) => {
    if (!contract) {
      throw new Error("Contract not initialized");
    }

    try {
      setLoading(true);
      setError(null);

      const tx = await contract.withdrawLiquidity(
        tokenId,
        liquidity,
        amount0Min,
        amount1Min,
      );
      const receipt = await tx.wait();
      return receipt;
    } catch (err: any) {
      console.error("Error withdrawing liquidity:", err);
      setError(err.message || "Failed to withdraw liquidity");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const swap = async (
    tokenIn: string,
    tokenOut: string,
    fee: number,
    amountIn: bigint,
    amountOutMin: bigint,
  ) => {
    if (!contract) {
      throw new Error("Contract not initialized");
    }

    try {
      setLoading(true);
      setError(null);

      const tx = await contract.swapExactInput(
        tokenIn,
        tokenOut,
        fee,
        amountIn,
        amountOutMin,
      );
      const receipt = await tx.wait();
      return receipt;
    } catch (err: any) {
      console.error("Error swapping:", err);
      setError(err.message || "Failed to swap");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    getQuote,
    addLiquidity,
    withdrawLiquidity,
    swap,
    loading,
    error,
    isInitialized: !!contract,
  };
};
