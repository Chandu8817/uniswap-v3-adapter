import { useState, useEffect } from "react";
import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum: any;
  }
}

export const useMetaMask = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask;
  };

  // Connect to MetaMask
  const connect = async () => {
    if (!isMetaMaskInstalled()) {
      setError("Please install MetaMask to use this dApp");
      return false;
    }

    try {
      setIsConnecting(true);
      setError(null);

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      // Get the provider and signer
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();
      const network = await web3Provider.getNetwork();

      setAccount(accounts[0]);
      setProvider(web3Provider);
      setSigner(web3Signer);
      setChainId(Number(network.chainId));

      // Set up event listeners
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return true;
    } catch (err: any) {
      console.error("Error connecting to MetaMask:", err);
      setError(err.message || "Failed to connect to MetaMask");
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle account change
  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      // MetaMask is locked or the user has not connected any accounts
      setAccount(null);
      setSigner(null);
    } else if (accounts[0] !== account) {
      setAccount(accounts[0]);
    }
  };

  // Handle chain change
  const handleChainChanged = (_chainId: string) => {
    window.location.reload();
  };

  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged,
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  return {
    account,
    provider,
    signer,
    chainId,
    error,
    isConnecting,
    connect,
    isMetaMaskInstalled,
  };
};
