import { useState, useEffect } from 'react';
import { ethers, JsonRpcSigner } from 'ethers';
import { useUniswapV3Adapter } from '../hooks/useUniswapV3Adapter';
import { usePositionManager } from '../hooks/usePositionManager';
import { useERC20 } from '../hooks/useERC20';
import { ToastContainer, toast } from 'react-toastify';
const UNISWAP_V3_ADAPTER_ADDRESS = import.meta.env.VITE_UNISWAP_V3_ADAPTER_ADDRESS;

interface LiquidityTabProps {
  signer: JsonRpcSigner | null;
}
type TabType = 'add' | 'remove';
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
export const LiquidityTab = ({ signer }: LiquidityTabProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('add');
  const [tokenA, setTokenA] = useState(USDC);
  const [tokenB, setTokenB] = useState(WETH);
  const [tokenId, setTokenId] = useState('');
  const [liquidity, setLiquidity] = useState('');
  const [amountA, setAmountA] = useState('1000');
  const [amountB, setAmountB] = useState('1');
  const [fee, setFee] = useState(3000); // 0.3% fee tier
  const [tickLower, setTickLower] = useState('-60000');
  const [tickUpper, setTickUpper] = useState('60000');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { addLiquidity, withdrawLiquidity, isInitialized } = useUniswapV3Adapter(signer);
  const {getBalance: getBalanceA, getAllowance: getAllowanceA, approve: approveA, isInitialized: isERC20InitializedA } = useERC20(signer, tokenA);
  const {getBalance: getBalanceB, getAllowance: getAllowanceB, approve: approveB, isInitialized: isERC20InitializedB } = useERC20(signer, tokenB);
  const { getPosition, approve: approvePosition, isApproved } = usePositionManager(signer);

  const handleAddLiquidity = async () => {
    if (!tokenA || !tokenB || !amountA || !amountB || !tickLower || !tickUpper) {
      setError('Please fill in all fields');
      return;
    }

    if (!isInitialized || !isERC20InitializedA || !isERC20InitializedB) {
      setError('Contract not initialized. Please connect your wallet first.');
      return;
    }

    try {
      setError(null);
      setTxHash(null);
      setIsProcessing(true);
      debugger
      const signerAddress = await (signer as ethers.JsonRpcSigner).getAddress();
      const balanceA = await getBalanceA(signerAddress);
      const balanceB = await getBalanceB(signerAddress);
      if(Number(ethers.formatUnits(balanceA, 6)) < Number(amountA)){
        toast.error('Insufficient balance for token A');
        return;
      }
      if(Number(ethers.formatUnits(balanceB, 18)) < Number(amountB)){
        toast.error('Insufficient balance for token B');
        return;
      }
      
      
      const allowanceA = await getAllowanceA(signerAddress, UNISWAP_V3_ADAPTER_ADDRESS);
      const allowanceB = await getAllowanceB(signerAddress, UNISWAP_V3_ADAPTER_ADDRESS);
      if (Number(allowanceA) < Number(amountA)) {
        await approveA(UNISWAP_V3_ADAPTER_ADDRESS, amountA);

      }
      if (Number(allowanceB) < Number(amountB)) {

        await approveB(UNISWAP_V3_ADAPTER_ADDRESS, amountB);
      }


      console.log('Adding liquidity...');
      const receipt = await addLiquidity(
        tokenA,
        tokenB,
        amountA,
        amountB,
        Number(tickLower),
        Number(tickUpper),
        fee
      );

      console.log('Transaction successful:', receipt);
      setTxHash(receipt.hash);

      
      setAmountA('');
      setAmountB('');

    } catch (err: any) {
      console.error('Add liquidity failed:', err);
      setError(err.message || 'Failed to add liquidity');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const fetchPosition = async () => {
      if (tokenId) {
        const position = await getPosition(tokenId);
        setLiquidity(position.liquidity.toString());
        console.log('Position:', position);
      }
    };
    fetchPosition();
  }, [tokenId]);



  const handleRemoveLiquidity = async () => {
    // Implement remove liquidity logic here
    try {
      setIsProcessing(true);
      console.log('Removing liquidity...');
      const approved = await isApproved(tokenId);
      if(approved.toLowerCase()==UNISWAP_V3_ADAPTER_ADDRESS.toLowerCase()){
        await withdrawLiquidity(tokenId, liquidity, "0", "0");
      }else{
        await approvePosition(UNISWAP_V3_ADAPTER_ADDRESS, tokenId);
        const tx = await withdrawLiquidity(tokenId, liquidity, "0", "0");
        console.log('Transaction hash:', tx);
      }
      
    } catch (err) {
      console.error('Remove liquidity failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="p-4 space-y-4">
      {/* Transaction Status */}
      {isProcessing && (
        <div className=" p-3 bg-blue-100 text-blue-800 rounded">
          Processing transaction...
        </div>
      )}

      {txHash && (
        <div className=" p-3 bg-green-100 text-green-800 rounded">
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
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
          {error}
        </div>
      )}

      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 ${activeTab === 'add' ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-500'}`}
          onClick={() => setActiveTab('add')}
        >
          Add Liquidity
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'remove' ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-500'}`}
          onClick={() => setActiveTab('remove')}
        >
          Remove Liquidity
        </button>
      </div>

      {activeTab === 'add' ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Add Liquidity</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Token A</label>
            <input
              type="text"
              value={tokenA}
              onChange={(e) => setTokenA(e.target.value)}
              placeholder="Token A address"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Token B</label>
            <input
              type="text"
              value={tokenB}
              onChange={(e) => setTokenB(e.target.value)}
              placeholder="Token B address"
              className="w-full p-2 border rounded"
            />
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
            <label className="block text-sm font-medium mb-1">Tick Lower</label>
            <input
              type="number"
              value={tickLower}
              onChange={(e) => setTickLower(e.target.value)}
              placeholder="Tick lower bound"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tick Upper</label>
            <input
              type="number"
              value={tickUpper}
              onChange={(e) => setTickUpper(e.target.value)}
              placeholder="Tick upper bound"
              className="w-full p-2 border rounded"
            />
          </div>

          <button
            onClick={handleAddLiquidity}
            disabled={!tokenA || !tokenB || !amountA || !amountB || !tickLower || !tickUpper || isProcessing}
            className="w-full bg-blue-500 text-white py-2 rounded disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Add Liquidity'}
            <ToastContainer />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Remove Liquidity</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Position ID</label>
            <input
              type="text"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="Position ID"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Liquidity Amount</label>
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
            {isProcessing ? 'Processing...' : 'Remove Liquidity'}
          </button>
        </div>
      )}
      </div>
    </div>
  );
};
