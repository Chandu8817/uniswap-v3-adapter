import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { JsonRpcSigner } from "ethers";
import ERC20_ABI from "../abis/ERC20.json";



export const useERC20 = (signer: JsonRpcSigner | null) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getBalance = async (address: string, contractAddress: string) => {
    if (signer) {
      const contractInstance = new ethers.Contract(
        contractAddress,
        ERC20_ABI,
        signer,
      );

      try {
        setLoading(true);
        setError(null);

        const balance = await contractInstance.balanceOf(address);
        return balance;
      } catch (err: any) {
        console.error("Error getting balance:", err);
        setError(err.message || "Failed to get balance");
        throw err;
      } finally {
        setLoading(false);
      }
    }
  };

  const approve = async (
    spender: string,
    amount: bigint,
    contractAddress: string,
  ) => {
    if (signer) {
      const contractInstance = new ethers.Contract(
        contractAddress,
        ERC20_ABI,
        signer,
      );

      try {
        setLoading(true);
        setError(null);

        const tx = await contractInstance.approve(spender, amount);
        await tx.wait();
      } catch (err: any) {
        console.error("Error approving:", err);
        setError(err.message || "Failed to approve");
        throw err;
      } finally {
        setLoading(false);
      }
    }
  };

  const getAllowance = async (
    owner: string,
    spender: string,
    contractAddress: string,
  ) => {
    if (signer) {
      const contractInstance = new ethers.Contract(
        contractAddress,
        ERC20_ABI,
        signer,
      );

      try {
        setLoading(true);
        setError(null);

        const allowance = await contractInstance.allowance(owner, spender);
        return allowance;
      } catch (err: any) {
        console.error("Error getting allowance:", err);
        setError(err.message || "Failed to get allowance");
        throw err;
      } finally {
        setLoading(false);
      }
    }
  };

  const getDecimal = async (contractAddress: string) => {
    if (signer) {
      const contractInstance = new ethers.Contract(
        contractAddress,
        ERC20_ABI,
        signer,
      );

      try {
        setLoading(true);
        setError(null);

        const decimal = await contractInstance.decimals();
        return decimal;
      } catch (err: any) {
        console.error("Error getting decimal:", err);
        setError(err.message || "Failed to get decimal");
        throw err;
      } finally {
        setLoading(false);
      }
    }
  };

  const getSymbol = async (contractAddress: string) => {
    if (signer) {
      const contractInstance = new ethers.Contract(
        contractAddress,
        ERC20_ABI,
        signer,
      );

      try {
        setLoading(true);
        setError(null);

        const symbol = await contractInstance.symbol();
        return symbol;
      } catch (err: any) {
        console.error("Error getting symbol:", err);
        setError(err.message || "Failed to get symbol");
        throw err;
      } finally {
        setLoading(false);
      }
    }
  };

  return {
    getBalance,
    approve,
    getAllowance,
    getDecimal,
    getSymbol,
    loading,
    error,
    isInitialized: !!signer,
    
  };
};
