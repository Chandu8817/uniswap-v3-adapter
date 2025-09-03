import { useState } from 'react';
import { useMetaMask } from './hooks/useMetaMask';
import { SwapTab } from './components/SwapTab';
import { LiquidityTab } from './components/LiquidityTab';
import './App.css';
import Transactions from './components/Transactions';

type TabType = 'swap' | 'liquidity' | 'transactions';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('swap');
  const { account, connect, isConnecting, error, signer } = useMetaMask();

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="flex-1 flex flex-col">
        <div className="max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Uniswap V3 Adapter</h1>
          {account ? (
            <div className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full px-4 py-2 text-sm font-medium">
              {formatAddress(account)}
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
      
          
        </header>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('swap')}
            className={`${
              activeTab === 'swap'
                ? 'text-blue-600 border-blue-500 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            } flex-1 py-4 text-center border-b-2 font-medium text-sm`}
          >
            Swap
          </button>
          <button
            onClick={() => setActiveTab('liquidity')}
            className={`${
              activeTab === 'liquidity'
                ? 'text-blue-600 border-blue-500 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            } flex-1 py-4 text-center border-b-2 font-medium text-sm`}
          >
            Liquidity
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`${
              activeTab === 'transactions'
                ? 'text-blue-600 border-blue-500 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            } flex-1 py-4 text-center border-b-2 font-medium text-sm`}
          >
            Transactions
          </button>
        </div>

        {/* Mobile menu */}
        <div className="sm:hidden mb-6">
          {!account && (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium disabled:opacity-50 mb-4"
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {!account ? (
            <div className="p-8 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No wallet connected</h3>
              <p className="mt-1 text-sm text-gray-500">Connect your wallet to start using the Uniswap V3 Adapter.</p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={connect}
                  disabled={isConnecting}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <svg
                    className="-ml-1 mr-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {activeTab === 'swap' ? (
                <SwapTab signer={signer} />
              ) :
              (activeTab === 'liquidity' ? (
                <LiquidityTab signer={signer} />
              ) :
              (activeTab === 'transactions' ? (
                  <Transactions />
                ) : null))}

            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
