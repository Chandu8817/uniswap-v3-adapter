import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { JsonRpcSigner } from "ethers";
import NONFUNGIBLE_POSITION_MANAGER_ABI from "../abis/INonfungiblePositionManager.json";

// Replace with your contract address

const NONFUNGIBLE_POSITION_MANAGER =
  "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";

export const usePositionManager = (signer: JsonRpcSigner | null) => {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (signer) {
      const contractInstance = new ethers.Contract(
        NONFUNGIBLE_POSITION_MANAGER,
        NONFUNGIBLE_POSITION_MANAGER_ABI,
        signer,
      );
      setContract(contractInstance);
    }
  }, [signer]);

  const getPosition = async (tokenId: string) => {
    if (!contract) {
      throw new Error("Contract not initialized");
    }

    try {
      setLoading(true);
      setError(null);

      const position = await contract.positions(tokenId);
      return position;
    } catch (err: any) {
      console.error("Error getting position:", err);
      setError(err.message || "Failed to get position");
      throw err;
    } finally {
      setLoading(false);
    }
  };
  const approve = async (spender: string, tokenId: string) => {
    if (!contract) {
      throw new Error("Contract not initialized");
    }

    try {
      setLoading(true);
      setError(null);

      const tx = await contract.approve(spender, tokenId);
      await tx.wait();
      return tx;
    } catch (err: any) {
      console.error("Error approving:", err);
      setError(err.message || "Failed to approve");
      throw err;
    } finally {
      setLoading(false);
    }
  };
  const isApproved = async (tokenId: string) => {
    if (!contract) {
      throw new Error("Contract not initialized");
    }

    try {
      setLoading(true);
      setError(null);

      const approved = await contract.getApproved(tokenId);
      return approved;
    } catch (err: any) {
      console.error("Error getting approved:", err);
      setError(err.message || "Failed to get approved");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    contract,
    loading,
    error,
    getPosition,
    approve,
    isApproved,
  
  };
};
