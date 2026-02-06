/**
 * React Hook for LI.FI Cross-Chain Swaps
 * Provides easy-to-use interface for getting quotes and executing swaps
 */

import { useState, useCallback } from 'react';
import { useWalletClient, usePublicClient, useSwitchChain } from 'wagmi';
import type { Route } from '@lifi/sdk';
import {
  getLiFiQuote,
  executeLiFiSwap,
  type LiFiQuoteParams,
  type LiFiQuoteResult,
  SUPPORTED_CHAINS,
} from '@/lib/lifiService';

export interface UseLiFiReturn {
  // State
  quote: LiFiQuoteResult | null;
  isLoadingQuote: boolean;
  isExecuting: boolean;
  executionStatus: string | null;
  error: string | null;
  txHash: string | null;

  // Actions
  getQuote: (params: LiFiQuoteParams) => Promise<void>;
  executeSwap: (route?: Route) => Promise<string>;
  reset: () => void;

  // Helpers
  supportedChains: typeof SUPPORTED_CHAINS;
}

export function useLiFi(): UseLiFiReturn {
  const [quote, setQuote] = useState<LiFiQuoteResult | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { switchChain } = useSwitchChain();

  /**
   * Get a quote for cross-chain swap
   */
  const getQuote = useCallback(async (params: LiFiQuoteParams) => {
    setIsLoadingQuote(true);
    setError(null);
    setQuote(null);

    try {
      console.log('📊 Fetching LI.FI quote...', params);
      const result = await getLiFiQuote(params);
      
      console.log('✅ Quote received:', {
        routes: result.routes.length,
        estimatedTime: `${result.estimatedTime}s`,
        estimatedGas: `$${result.estimatedGas}`,
        toAmount: result.toAmount,
      });

      setQuote(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get quote';
      console.error('❌ Quote error:', errorMsg);
      setError(errorMsg);
    } finally {
      setIsLoadingQuote(false);
    }
  }, []);

  /**
   * Execute a cross-chain swap
   */
  const executeSwap = useCallback(async (route?: Route): Promise<string> => {
    if (!walletClient) {
      throw new Error('Wallet not connected');
    }

    if (!publicClient) {
      throw new Error('Public client not available');
    }

    const routeToExecute = route || quote?.selectedRoute;
    if (!routeToExecute) {
      throw new Error('No route available. Get a quote first.');
    }

    setIsExecuting(true);
    setError(null);
    setExecutionStatus('Starting swap...');
    setTxHash(null);

    try {
      console.log('🚀 Executing LI.FI swap...');

      const resultTxHash = await executeLiFiSwap(
        routeToExecute,
        walletClient,
        publicClient,
        (status, data) => {
          console.log('📡 Status update:', status, data);
          
          switch (status) {
            case 'executing':
              setExecutionStatus(`Executing: ${data.action}`);
              break;
            case 'chain_switched':
              setExecutionStatus(`Switched to chain ${data.chainId}`);
              break;
            case 'success':
              setExecutionStatus('Swap completed!');
              setTxHash(data.txHash);
              break;
            case 'error':
              setExecutionStatus('Swap failed');
              setError(data.error?.message || 'Unknown error');
              break;
          }
        }
      );

      console.log('✅ Swap successful:', resultTxHash);
      setTxHash(resultTxHash);
      return resultTxHash;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Swap execution failed';
      console.error('❌ Execution error:', errorMsg);
      setError(errorMsg);
      setExecutionStatus('Failed');
      throw err;
    } finally {
      setIsExecuting(false);
    }
  }, [walletClient, publicClient, quote]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setQuote(null);
    setError(null);
    setExecutionStatus(null);
    setTxHash(null);
    setIsLoadingQuote(false);
    setIsExecuting(false);
  }, []);

  return {
    // State
    quote,
    isLoadingQuote,
    isExecuting,
    executionStatus,
    error,
    txHash,

    // Actions
    getQuote,
    executeSwap,
    reset,

    // Helpers
    supportedChains: SUPPORTED_CHAINS,
  };
}
