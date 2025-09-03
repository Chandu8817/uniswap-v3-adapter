import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { JsonRpcSigner } from 'ethers';
import  ERC20_ABI  from '../abis/ERC20.json';



// Replace with your contract address



export const useERC20 = (signer: JsonRpcSigner | null, contractAddress: string) => {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (signer) {
      const contractInstance = new ethers.Contract(
        contractAddress,
        ERC20_ABI,
        signer
      );
      setContract(contractInstance);
    }
  }, [signer]);

  const getBalance = async (
    address: string
  ) => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      setLoading(true);
      setError(null);
      
      const balance = await contract.balanceOf(address);
      return balance;
    } catch (err: any) {
      console.error('Error getting balance:', err);
      setError(err.message || 'Failed to get balance');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const approve = async (
    spender: string,
    amount: string
  ) => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await contract.approve(spender, ethers.parseEther(amount));
      await tx.wait();
    } catch (err: any) {
      console.error('Error approving:', err);
      setError(err.message || 'Failed to approve');
      throw err;
    } finally {
      setLoading(false);
    }
  };
 
  const getAllowance = async (
    owner: string,
    spender: string
  ) => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      setLoading(true);
      setError(null);
      
      const allowance = await contract.allowance(owner, spender);
      return allowance;
    } catch (err: any) {
      console.error('Error getting allowance:', err);
      setError(err.message || 'Failed to get allowance');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getDecimal = async () => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      setLoading(true);
      setError(null);
      
      const decimal = await contract.decimals();
      return decimal;
    } catch (err: any) {
      console.error('Error getting decimal:', err);
      setError(err.message || 'Failed to get decimal');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {

    getBalance,
    approve,
    getAllowance,
    getDecimal,
    loading,
    error,
    isInitialized: !!contract,
    // Add other functions as needed
  };
};
