import { useState } from 'react';
import { ethers, JsonRpcSigner } from 'ethers';
import { useUniswapV3Adapter } from '../hooks/useUniswapV3Adapter';
import { useERC20 } from '../hooks/useERC20';
interface SwapTabProps {
  signer: JsonRpcSigner | null;
}
const UNISWAP_V3_ADAPTER_ADDRESS = import.meta.env.VITE_UNISWAP_V3_ADAPTER_ADDRESS;

const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
export const SwapTab = ({ signer }: SwapTabProps) => {
  const [tokenIn, setTokenIn] = useState(USDC);
  const [tokenOut, setTokenOut] = useState(WETH);
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [fee, setFee] = useState(3000); // 0.3% fee tier
  const [isSwapping, setIsSwapping] = useState(false);

  const { getQuote, swap, loading: quoteLoading, } = useUniswapV3Adapter(signer);
  const { approve: approveTokenIn, getAllowance: allowanceTokenIn, getDecimal: getDecimalTokenIn } = useERC20(signer, tokenIn);
  const { approve: approveTokenOut, getAllowance: allowanceTokenOut, getDecimal: getDecimalTokenOut } = useERC20(signer, tokenOut);


  const handleGetQuote = async () => {
    if (!tokenIn || !tokenOut || !amountIn) return;

    try {
      const decimalsIn = await getDecimalTokenIn();
      const decimalsOut = await getDecimalTokenOut();
      const quote = await getQuote(tokenIn, tokenOut, Number(fee), amountIn, decimalsIn, decimalsOut);
      setAmountOut(quote);
    } catch (err) {
      console.error('Failed to get quote:', err);
    }
  };

  const handleSwap = async () => {
    if (!tokenIn || !tokenOut || !amountIn || !amountOut) return;

    try {
      setIsSwapping(true);
      // Implement swap logic here
      
      console.log('Swapping...');
      const signerAddress = await (signer as ethers.JsonRpcSigner).getAddress();
      const allowanceTokenInValue = await allowanceTokenIn(signerAddress, UNISWAP_V3_ADAPTER_ADDRESS);
      const allowanceTokenOutValue = await allowanceTokenOut(signerAddress, UNISWAP_V3_ADAPTER_ADDRESS);
      if (Number(allowanceTokenInValue) < Number(ethers.parseUnits(amountIn, await getDecimalTokenIn()))) {
        await approveTokenIn(UNISWAP_V3_ADAPTER_ADDRESS, ethers.parseUnits(amountIn, await getDecimalTokenIn()).toString());
      }
      if (Number(allowanceTokenOutValue) < Number(ethers.parseUnits(amountOut, await getDecimalTokenOut()))) {
        await approveTokenOut(UNISWAP_V3_ADAPTER_ADDRESS, ethers.parseUnits(amountOut, await getDecimalTokenOut()).toString());
      }
      const tx = await swap(tokenIn, tokenOut, Number(fee), ethers.parseUnits(amountIn, await getDecimalTokenIn()), ethers.parseUnits(amountOut, await getDecimalTokenOut()));
      console.log('Transaction hash:', tx);
    } catch (err) {
      console.error('Swap failed:', err);
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold mb-4">Swap Tokens</h2>

      <div className="space-y-4">
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

        <div>
          <label className="block text-sm font-medium mb-1">Amount In</label>
          <input
            type="text"
            value={amountIn}
            onChange={(e) => setAmountIn(e.target.value)}
            placeholder="0.0"
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Fee Tier (0.05%, 0.3%, or 1%)</label>
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
          <label className="block text-sm font-medium mb-1">Slippage Tolerance</label>
          <div className="flex items-center">
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              className="flex-1 mr-2"
            />
            <span className="w-16 text-right">{slippage}%</span>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleGetQuote}
            disabled={quoteLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded flex-1 disabled:opacity-50"
          >
            {quoteLoading ? 'Fetching...' : 'Get Quote'}
          </button>

          <button
            onClick={handleSwap}
            disabled={!amountOut || isSwapping}
            className="bg-green-500 text-white px-4 py-2 rounded flex-1 disabled:opacity-50"
          >
            {isSwapping ? 'Swapping...' : 'Swap'}
          </button>
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
