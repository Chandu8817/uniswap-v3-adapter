import { useState, useEffect, useCallback } from "react";
import { ethers, JsonRpcSigner } from "ethers";
import { useUniswapV3Adapter } from "../hooks/useUniswapV3Adapter";
import { usePositionManager } from "../hooks/usePositionManager";
import { useERC20 } from "../hooks/useERC20";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
const UNISWAP_V3_ADAPTER_ADDRESS = import.meta.env
  .VITE_UNISWAP_V3_ADAPTER_ADDRESS;

interface LiquidityTabProps {
  signer: JsonRpcSigner | null;
}
type TabType = "add" | "remove";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
export const LiquidityTab = ({ signer }: LiquidityTabProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("add");
  const [tokenA, setTokenA] = useState(USDC);
  const [tokenB, setTokenB] = useState(WETH);
  const [tokenId, setTokenId] = useState("");
  const [liquidity, setLiquidity] = useState("");
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [fee, setFee] = useState(3000); // 0.3% fee tier
  const [tickLower, setTickLower] = useState("-60000");
  const [tickUpper, setTickUpper] = useState("60000");
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balanceA, setBalanceA] = useState("0");
  const [balanceB, setBalanceB] = useState("0");
  const [decimalsA, setDecimalsA] = useState(6);
  const [decimalsB, setDecimalsB] = useState(18);
  const [allowanceA, setAllowanceA] = useState("0");
  const [allowanceB, setAllowanceB] = useState("0");
  const [symbolA, setSymbolA] = useState("");
  const [symbolB, setSymbolB] = useState("");

  const { addLiquidity, withdrawLiquidity, isInitialized } =
    useUniswapV3Adapter(signer);
  const {
    getSymbol: getSymbolA,
    getBalance: getBalanceA,
    getAllowance: getAllowanceA,
    approve: approveA,
    isInitialized: isERC20InitializedA,
  } = useERC20(signer);
  const {
    getSymbol: getSymbolB,
    getBalance: getBalanceB,
    getAllowance: getAllowanceB,
    approve: approveB,
    isInitialized: isERC20InitializedB,
  } = useERC20(signer);
  const {
    getPosition,
    approve: approvePosition,
    isApproved,
  } = usePositionManager(signer);
  const { getDecimal: getDecimalTokenIn } = useERC20(signer);
  const { getDecimal: getDecimalTokenOut } = useERC20(signer);
  const { getQuote } = useUniswapV3Adapter(signer);

  // Format token amount with decimals
  const formatTokenAmount = (amount: string, decimals = 18) => {
    try {
      return ethers.parseUnits(amount || "0", decimals).toString();
    } catch (e) {
      return "0";
    }
  };

  // Check if user has sufficient balance
  const hasSufficientBalance = useCallback(() => {
    if (!amountA || !amountB) return false;
    try {
      const amountAWei = formatTokenAmount(amountA, decimalsA); // Assuming token A has 6 decimals (USDC)
      const amountBWei = formatTokenAmount(amountB, decimalsB); // Assuming token B has 18 decimals (WETH)
      return (
        BigInt(balanceA) >= BigInt(amountAWei) &&
        BigInt(balanceB) >= BigInt(amountBWei)
      );
    } catch (e) {
      return false;
    }
  }, [amountA, amountB, balanceA, balanceB]);

  // Check if token is approved
  const isTokenAApproved = useCallback(() => {
    if (!amountA) return false;
    try {
      const amountAWei = formatTokenAmount(amountA, decimalsA);
      return BigInt(allowanceA) >= BigInt(amountAWei);
    } catch (e) {
      return false;
    }
  }, [amountA, allowanceA]);

  const isTokenBApproved = useCallback(() => {
    if (!amountB) return false;
    try {
      const amountBWei = formatTokenAmount(amountB, decimalsB);
      return BigInt(allowanceB) >= BigInt(amountBWei);
    } catch (e) {
      return false;
    }
  }, [amountB, allowanceB]);

  // Function to update token A and B data
  const updateTokenData = useCallback(
    async (newTokenA: string, newTokenB: string) => {
      if (
        !signer ||
        !isInitialized ||
        !isERC20InitializedA ||
        !isERC20InitializedB
      )
        return;

      try {
        const signerAddress = await signer.getAddress();

        // Fetch new balances and allowances
        const [balanceA, balanceB, allowanceA, allowanceB, symbolA, symbolB] =
          await Promise.all([
            getBalanceA(signerAddress, newTokenA),
            getBalanceB(signerAddress, newTokenB),
            getAllowanceA(signerAddress, UNISWAP_V3_ADAPTER_ADDRESS, newTokenA),
            getAllowanceB(signerAddress, UNISWAP_V3_ADAPTER_ADDRESS, newTokenB),
            getSymbolA(newTokenA),
            getSymbolB(newTokenB),
          ]);

        // Update state with new values
        setBalanceA(balanceA.toString());
        setBalanceB(balanceB.toString());
        setAllowanceA(allowanceA.toString());
        setAllowanceB(allowanceB.toString());
        setDecimalsA(await getDecimalTokenIn(newTokenA));
        setDecimalsB(await getDecimalTokenOut(newTokenB));
        setSymbolA(symbolA);
        setSymbolB(symbolB);
      } catch (error) {
        console.error("Error updating token data:", error);
        toast.error("Failed to update token data");
      }
    },
    [
      signer,
      isInitialized,
      isERC20InitializedA,
      isERC20InitializedB,
      getBalanceA,
      getBalanceB,
      getAllowanceA,
      getAllowanceB,
    ],
  );

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

      // Fetch balances and allowances for both tokens
      const [balanceA, balanceB, allowanceA, allowanceB, symbolA, symbolB] =
        await Promise.all([
          getBalanceA(signerAddress, tokenA),
          getBalanceB(signerAddress, tokenB),
          getAllowanceA(signerAddress, UNISWAP_V3_ADAPTER_ADDRESS, tokenA),
          getAllowanceB(signerAddress, UNISWAP_V3_ADAPTER_ADDRESS, tokenB),
          getSymbolA(tokenA),
          getSymbolB(tokenB),
        ]);

      // Update state with fetched values
      setBalanceA(balanceA.toString());
      setBalanceB(balanceB.toString());
      setAllowanceA(allowanceA.toString());
      setAllowanceB(allowanceB.toString());
      setDecimalsA(await getDecimalTokenIn(tokenA));
      setDecimalsB(await getDecimalTokenOut(tokenB));
      setSymbolA(symbolA);
      setSymbolB(symbolB);
    } catch (error) {
      console.error("Error fetching balances and allowances:", error);
      toast.error("Failed to fetch token data");
    }
  }, [
    signer,
    isInitialized,
    isERC20InitializedA,
    isERC20InitializedB,
    tokenA,
    tokenB,
    getBalanceA,
    getBalanceB,
    getAllowanceA,
    getAllowanceB,
  ]);

  // Initial fetch
  useEffect(() => {
    fetchBalancesAndAllowances();
  }, [fetchBalancesAndAllowances]);

  const handleApproveTokenA = async () => {
    if (!amountA) return;
    try {
      setIsProcessing(true);
      await approveA(
        UNISWAP_V3_ADAPTER_ADDRESS,
        ethers.parseUnits(amountA, decimalsA),
        tokenA,
      );
      toast.success("Token A approved successfully");
      await fetchBalancesAndAllowances();
    } catch (error) {
      console.error("Approval failed:", error);
      toast.error("Failed to approve Token A");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveTokenB = async () => {
    if (!amountB) return;
    try {
      setIsProcessing(true);
      await approveB(
        UNISWAP_V3_ADAPTER_ADDRESS,
        ethers.parseUnits(amountB, decimalsB),
        tokenB,
      );
      toast.success("Token B approved successfully");
      await fetchBalancesAndAllowances();
    } catch (error) {
      console.error("Approval failed:", error);
      toast.error("Failed to approve Token B");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddLiquidity = async () => {
    if (
      !tokenA ||
      !tokenB ||
      !amountA ||
      !amountB ||
      !tickLower ||
      !tickUpper
    ) {
      setError("Please fill in all required fields");
      return;
    }

    if (!isInitialized || !isERC20InitializedA || !isERC20InitializedB) {
      setError("Contract not initialized. Please connect your wallet first.");
      return;
    }

    try {
      setError(null);
      setTxHash(null);
      setIsProcessing(true);

      // Check if we need to approve tokens first
      if (!isTokenAApproved()) {
        toast.info("Please approve Token A first");
        return;
      }

      if (!isTokenBApproved()) {
        toast.info("Please approve Token B first");
        return;
      }

      // Double-check balances before proceeding
      if (!hasSufficientBalance()) {
        toast.error("Insufficient balance for one or both tokens");
        return;
      }

      toast.info("Adding liquidity...");
      const receipt = await addLiquidity(
        tokenA,
        tokenB,
        ethers.parseUnits(amountA, decimalsA),
        ethers.parseUnits(amountB, decimalsB),
        Number(tickLower),
        Number(tickUpper),
        fee,
        decimalsA,
        decimalsB,
      );

      toast.success("Liquidity added successfully!");
      setTxHash(receipt.hash);

      // Reset form
      setAmountA("");
      setAmountB("");

      // Refresh balances
      await fetchBalancesAndAllowances();
    } catch (err: any) {
      console.error("Add liquidity failed:", err);
      setError(err.message || "Failed to add liquidity");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const fetchPosition = async () => {
      if (tokenId) {
        const position = await getPosition(tokenId);
        setLiquidity(position.liquidity.toString());
        console.log("Position:", position);
      }
    };
    fetchPosition();
  }, [tokenId]);

  const handleRemoveLiquidity = async () => {
    // Implement remove liquidity logic here
    try {
      setIsProcessing(true);
      console.log("Removing liquidity...");
      const approved = await isApproved(tokenId);
      if (approved.toLowerCase() == UNISWAP_V3_ADAPTER_ADDRESS.toLowerCase()) {
        await withdrawLiquidity(tokenId, liquidity, 0n, 0n);
      } else {
        await approvePosition(UNISWAP_V3_ADAPTER_ADDRESS, tokenId);
        const tx = await withdrawLiquidity(tokenId, liquidity, 0n, 0n);
        console.log("Transaction hash:", tx);
      }
    } catch (err) {
      console.error("Remove liquidity failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSwapTokens = async () => {
    if (!tokenA || !tokenB) return;

    try {
      setIsProcessing(true);

      // Store current values
      const oldTokenA = tokenA;
      const oldTokenB = tokenB;
      const oldAmountA = amountA;
      const oldAmountB = amountB;

      // Swap token addresses and amounts
      setTokenA(oldTokenB);
      setTokenB(oldTokenA);
      setAmountA(oldAmountB);
      setAmountB(oldAmountA);

      // Fetch new balances and allowances for the swapped tokens
      await updateTokenData(oldTokenB, oldTokenA);
    } catch (error) {
      console.error("Error swapping tokens:", error);
      toast.error("Failed to swap tokens");
    } finally {
      setIsProcessing(false);
    }
  };

  const getAmountOut = useCallback(async () => {
    if (!tokenA || !tokenB || !amountA || !signer) {
      setAmountB("");
      return;
    }

    try {
      const decimalsIn = await getDecimalTokenIn(tokenA);
      const decimalsOut = await getDecimalTokenOut(tokenB);

      // Validate amount is a positive number
      if (isNaN(Number(amountA)) || Number(amountA) <= 0) {
        setAmountB("");
        return;
      }

      const quote = await getQuote(
        tokenA,
        tokenB,
        Number(fee),
        amountA,
        decimalsIn,
        decimalsOut,
      );
      setAmountB(quote);
    } catch (err) {
      console.error("Failed to get quote:", err);
      setAmountB("");
    }
  }, [
    tokenA,
    tokenB,
    amountA,
    fee,
    signer,
    getDecimalTokenIn,
    getDecimalTokenOut,
    getQuote,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      getAmountOut();
    }, 500);

    return () => clearTimeout(timer);
  }, [getAmountOut]);

  // Format balance for display
  const formatDisplayBalance = (balance: string, decimals: number) => {
    try {
      return Number(ethers.formatUnits(balance, decimals)).toFixed(4);
    } catch (e) {
      return "0";
    }
  };

  // Get button state
  const getButtonState = () => {
    if (!amountA || !amountB) {
      return {
        disabled: true,
        text: "Enter amounts",
        onClick: () => {},
      };
    }

    if (!hasSufficientBalance()) {
      return {
        disabled: true,
        text: "Insufficient balance",
        onClick: () => {},
      };
    }

    if (!isTokenAApproved()) {
      return {
        disabled: isProcessing,
        text: `Approve ${tokenA === USDC ? "USDC" : "Token A"}`,
        onClick: handleApproveTokenA,
      };
    }

    if (!isTokenBApproved()) {
      return {
        disabled: isProcessing,
        text: `Approve ${tokenB === WETH ? "WETH" : "Token B"}`,
        onClick: handleApproveTokenB,
      };
    }

    return {
      disabled: isProcessing || !hasSufficientBalance(),
      text: "Add Liquidity",
      onClick: handleAddLiquidity,
    };
  };

  const buttonState = getButtonState();

  return (
    <div className="max-w-md mx-auto">
      <ToastContainer position="top-right" autoClose={5000} />
      <div className="p-4 space-y-4">
        {/* Transaction Status */}
        {isProcessing && (
          <div className="p-3 bg-blue-100 text-blue-800 rounded">
            Processing transaction...
          </div>
        )}

        {txHash && (
          <div className="p-3 bg-green-100 text-green-800 rounded">
            <p>Transaction successful!</p>
            <a
              href={`https://arbiscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              View on Arbiscan
            </a>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-100 text-red-800 rounded">{error}</div>
        )}

        <div className="flex border-b mb-4">
          <button
            className={`px-4 py-2 ${activeTab === "add" ? "border-b-2 border-blue-500 font-medium" : "text-gray-500"}`}
            onClick={() => setActiveTab("add")}
          >
            Add Liquidity
          </button>
          <button
            className={`px-4 py-2 ${activeTab === "remove" ? "border-b-2 border-blue-500 font-medium" : "text-gray-500"}`}
            onClick={() => setActiveTab("remove")}
          >
            Remove Liquidity
          </button>
        </div>

        {activeTab === "add" ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Add Liquidity</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium">Token A</label>
                <span className="text-xs text-gray-500">
                  Balance: {formatDisplayBalance(balanceA, decimalsA)} {symbolA}
                </span>
              </div>
              <input
                type="text"
                value={tokenA}
                onChange={(e) => setTokenA(e.target.value)}
                placeholder="Token A address"
                className="w-full p-2 border rounded"
              />

              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium">Token B</label>
                <span className="text-xs text-gray-500">
                  Balance: {formatDisplayBalance(balanceB, decimalsB)} {symbolB}
                </span>
              </div>
              <input
                type="text"
                value={tokenB}
                onChange={(e) => setTokenB(e.target.value)}
                placeholder="Token B address"
                className="w-full p-2 border rounded"
              />
              <div className="flex justify-center -my-2">
                <button
                  onClick={handleSwapTokens}
                  disabled={isProcessing}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full disabled:opacity-50"
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
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Amount A</label>
              <input
                type="text"
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
                placeholder="0.0"
                className="w-full p-2 border rounded"
              />
              {amountA &&
                BigInt(balanceA) <
                  BigInt(formatTokenAmount(amountA, decimalsA)) && (
                  <p className="mt-1 text-xs text-red-500">
                    Insufficient balance
                  </p>
                )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Amount B</label>
              <input
                type="text"
                value={amountB}
                onChange={(e) => setAmountB(e.target.value)}
                placeholder="0.0"
                className="w-full p-2 border rounded"
              />
              {amountB &&
                BigInt(balanceB) <
                  BigInt(formatTokenAmount(amountB, decimalsB)) && (
                  <p className="mt-1 text-xs text-red-500">
                    Insufficient balance
                  </p>
                )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Fee Tier</label>
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

            <div>
              <label className="block text-sm font-medium mb-1">
                Tick Lower
              </label>
              <input
                type="number"
                value={tickLower}
                onChange={(e) => setTickLower(e.target.value)}
                placeholder="Tick lower bound"
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Tick Upper
              </label>
              <input
                type="number"
                value={tickUpper}
                onChange={(e) => setTickUpper(e.target.value)}
                placeholder="Tick upper bound"
                className="w-full p-2 border rounded"
              />
            </div>

            <button
              onClick={buttonState.onClick}
              disabled={buttonState.disabled}
              className={`w-full py-2 px-4 rounded ${
                buttonState.disabled
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              {isProcessing ? "Processing..." : buttonState.text}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Remove Liquidity</h2>

            <div>
              <label className="block text-sm font-medium mb-1">
                Position ID
              </label>
              <input
                type="text"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                placeholder="Position ID"
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Liquidity Amount
              </label>
              <input
                type="text"
                value={liquidity}
                onChange={(e) => setLiquidity(e.target.value)}
                placeholder="0.0"
                className="w-full p-2 border rounded"
              />
            </div>

            <button
              onClick={handleRemoveLiquidity}
              disabled={isProcessing}
              className="w-full bg-red-500 text-white py-2 rounded disabled:opacity-50"
            >
              {isProcessing ? "Processing..." : "Remove Liquidity"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
