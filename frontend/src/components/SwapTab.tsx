import { useCallback, useEffect, useState } from "react";
import { ethers, JsonRpcSigner } from "ethers";
import { useUniswapV3Adapter } from "../hooks/useUniswapV3Adapter";
import { useERC20 } from "../hooks/useERC20";
import { toast, ToastContainer } from "react-toastify";
interface SwapTabProps {
  signer: JsonRpcSigner | null;
}
const UNISWAP_V3_ADAPTER_ADDRESS = import.meta.env
  .VITE_UNISWAP_V3_ADAPTER_ADDRESS;

const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
export const SwapTab = ({ signer }: SwapTabProps) => {
  const [tokenIn, setTokenIn] = useState(USDC);
  const [tokenOut, setTokenOut] = useState(WETH);
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [fee, setFee] = useState(3000); // 0.3% fee tier
  const [isSwapping, setIsSwapping] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const [balanceIn, setBalanceIn] = useState("0");
  const [decimalsIn, setDecimalsIn] = useState(6);
  const [allowanceIn, setAllowanceIn] = useState("0");

  const { getQuote, swap } = useUniswapV3Adapter(signer);
  const {
    isInitialized: isERC20InitializedA,
    getBalance: getBalanceIn,
    getAllowance: getAllowanceIn,
    approve: approveTokenIn,
    getAllowance: allowanceTokenIn,
    getDecimal: getDecimalTokenIn,
  } = useERC20(signer);
  const {
    isInitialized: isERC20InitializedB,
    getBalance: getBalanceOut,
    getAllowance: getAllowanceOut,
    approve: approveTokenOut,
    getAllowance: allowanceTokenOut,
    getDecimal: getDecimalTokenOut,
  } = useERC20(signer);

  // Format balance for display
  const formatDisplayBalance = (balance: string, decimals: number) => {
    try {
      return Number(ethers.formatUnits(balance, decimals)).toFixed(4);
    } catch (e) {
      return "0";
    }
  };

  // Check if input amount exceeds balance
  const isInsufficientBalance = useCallback(() => {
    if (!amountIn || !balanceIn) return false;
    try {
      const decimals = tokenIn === USDC ? 6 : 18; // Assuming USDC has 6 decimals
      const amountInWei = ethers.parseUnits(amountIn, decimals);
      return BigInt(balanceIn) < amountInWei;
    } catch (e) {
      return false;
    }
  }, [amountIn, balanceIn, tokenIn]);

  // Fetch balances and allowances
  const fetchBalancesAndAllowances = useCallback(async () => {
    if (
      !signer ||
      !isInitialized ||
      !isERC20InitializedA ||
      !isERC20InitializedB
    )
      return;

    try {
      const signerAddress = await signer.getAddress();

      // Fetch balances
      const [balanceA, allowanceA] = await Promise.all([
        getBalanceIn(signerAddress, tokenIn),
        getAllowanceIn(signerAddress, UNISWAP_V3_ADAPTER_ADDRESS, tokenIn),
      ]);

      setBalanceIn(balanceA.toString());
      setAllowanceIn(allowanceA.toString());
      setDecimalsIn(await getDecimalTokenIn(tokenIn));
    } catch (error) {
      console.error("Error fetching balances and allowances:", error);
      toast.error("Failed to fetch token data");
    } finally {
      // Loading state handled by isProcessing
    }
  }, [
    signer,
    isInitialized,
    isERC20InitializedA,
    isERC20InitializedB,
    getBalanceIn,
    getBalanceOut,
    getAllowanceIn,
    getAllowanceOut,
  ]);
  useEffect(() => {
    fetchBalancesAndAllowances();
  }, [fetchBalancesAndAllowances]);

  useEffect(() => {
    if (signer) {
      setIsInitialized(true);
      fetchBalancesAndAllowances();
    }
  }, [signer]);
  const fetchQuote = useCallback(async () => {
    if (!tokenIn || !tokenOut || !amountIn || !signer) {
      setAmountOut("");
      return;
    }

    try {
      const decimalsIn = await getDecimalTokenIn(tokenIn);
      const decimalsOut = await getDecimalTokenOut(tokenOut);

      // Validate amount is a positive number
      if (isNaN(Number(amountIn)) || Number(amountIn) <= 0) {
        setAmountOut("");
        return;
      }

      const quote = await getQuote(
        tokenIn,
        tokenOut,
        Number(fee),
        amountIn,
        decimalsIn,
        decimalsOut,
      );
      setAmountOut(quote);
    } catch (err) {
      console.error("Failed to get quote:", err);
      setAmountOut("");
    }
  }, [
    tokenIn,
    tokenOut,
    amountIn,
    fee,
    signer,
    getDecimalTokenIn,
    getDecimalTokenOut,
    getQuote,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuote();
    }, 500);

    return () => clearTimeout(timer);
  }, [fetchQuote]);

  const handleApproveTokenIn = async () => {
    if (!amountIn || !signer) {
      toast.error("Please connect your wallet and enter an amount");
      return;
    }

    try {
      setIsSwapping(true);
      const decimals = await getDecimalTokenIn(tokenIn);
      const amountInWei = ethers.parseUnits(amountIn, decimals);

      await approveTokenIn(
        UNISWAP_V3_ADAPTER_ADDRESS,
        amountInWei,
        tokenIn,
      );
      toast.success("Token approved successfully");

      // Refresh balances and allowances
      await fetchBalancesAndAllowances();
    } catch (error) {
      console.error("Approval failed:", error);
      toast.error("Failed to approve token");
    } finally {
      setIsSwapping(false);
    }
  };

  const handleSwap = async () => {
    if (!tokenIn || !tokenOut || !amountIn || !amountOut || !signer) {
      toast.error("Please fill in all fields and connect your wallet");
      return;
    }

    try {
      setIsSwapping(true);
      const signerAddress = await signer.getAddress();

      // Get decimals for both tokens
      const [decimalsIn, decimalsOut] = await Promise.all([
        getDecimalTokenIn(tokenIn),
        getDecimalTokenOut(tokenOut),
      ]);

      // Convert amounts to wei
      const amountInWei = ethers.parseUnits(amountIn, decimalsIn);
      const amountOutWei = ethers.parseUnits(amountOut, decimalsOut);

      // Check and approve tokenIn if needed
      const allowanceIn = await allowanceTokenIn(
        signerAddress,
        UNISWAP_V3_ADAPTER_ADDRESS,
        tokenIn,
      );
      if (BigInt(allowanceIn) < amountInWei) {
        await approveTokenIn(
          UNISWAP_V3_ADAPTER_ADDRESS,
          amountInWei,
          tokenIn,
        );
        toast.success("Token approved, please confirm swap");
        return; // Let the user initiate swap after approval
      }

      // Execute swap
      const tx = await swap(
        tokenIn,
        tokenOut,
        Number(fee),
        amountInWei,
        amountOutWei,
      );

      console.log("Transaction hash:", tx);
      toast.success("Swap executed successfully");

      // Refresh data after successful swap
      await fetchBalancesAndAllowances();
      setAmountIn("");
      setAmountOut("");
    } catch (err: any) {
      console.error("Swap failed:", err);
      toast.error(`Swap failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <ToastContainer position="top-right" autoClose={5000} />
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-semibold mb-4">Swap Tokens</h2>

        <div className="space-y-4">
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium mb-1">From</label>
              <input
                type="text"
                value={tokenIn}
                onChange={(e) => setTokenIn(e.target.value)}
                placeholder="Token address"
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="flex justify-center -my-2">
              <button
                onClick={() => {
                  setTokenIn(tokenOut);
                  setTokenOut(tokenIn);
                }}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full"
                type="button"
                aria-label="Swap tokens"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">To</label>
              <input
                type="text"
                value={tokenOut}
                onChange={(e) => setTokenOut(e.target.value)}
                placeholder="Token address"
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium">Token A</label>
              <span className="text-xs text-gray-500">
                Balance: {formatDisplayBalance(balanceIn, decimalsIn)}
              </span>
            </div>
            <label className="block text-sm font-medium mb-1">Amount In</label>
            <input
              type="text"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.0"
              className="w-full p-2 border rounded"
            />
            {isInsufficientBalance() && (
              <p className="mt-1 text-xs text-red-500">Insufficient balance</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Fee Tier (0.05%, 0.3%, or 1%)
            </label>
            <select
              value={fee}
              onChange={(e) => setFee(Number(e.target.value))}
              className="w-full p-2 border rounded"
            >
              <option value={500}>0.05%</option>
              <option value={3000}>0.3%</option>
              <option value={10000}>1%</option>
            </select>
          </div>

          <div className="flex space-x-2">
            {allowanceIn < amountIn ? (
              <button
                onClick={handleApproveTokenIn}
                disabled={isSwapping}
                className="bg-green-500 text-white px-4 py-2 rounded flex-1 disabled:opacity-50"
              >
                {isSwapping ? "Approving..." : "Approve"}
              </button>
            ) : (
              <button
                onClick={handleSwap}
                disabled={!amountOut || isSwapping}
                className="bg-green-500 text-white px-4 py-2 rounded flex-1 disabled:opacity-50"
              >
                {isSwapping ? "Swapping..." : "Swap"}
              </button>
            )}
          </div>

          {amountOut && (
            <div className="mt-4 p-3 bg-gray-100 rounded">
              <div className="flex justify-between">
                <span>Expected Output:</span>
                <span className="font-medium">{amountOut}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
