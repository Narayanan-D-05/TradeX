/**
 * useCircleWallet Hook
 * 
 * React hook for Circle Programmable Wallets - Fully embedded Web3 wallet
 * Real private key management, network switching, and transaction signing
 */

'use client';

import { useState, useCallback } from 'react';
import { circleWallets, CircleWalletSession, CircleTransaction } from '@/lib/circleWallets';
import type { Address } from 'viem';

export interface UseCircleWalletReturn {
  // State
  session: CircleWalletSession | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Connection
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  refreshBalance: () => Promise<void>;

  // Transactions
  sendTransaction: (tx: CircleTransaction) => Promise<`0x${string}` | null>;
  signTypedData: (domain: any, types: any, message: any) => Promise<`0x${string}` | null>;
  signMessage: (message: string) => Promise<`0x${string}` | null>;

  // Info
  address: string | null;
  chainId: number | null;
  chainName: string | null;
  balance: string | null;
}

export function useCircleWallet(): UseCircleWalletReturn {
  const [session, setSession] = useState<CircleWalletSession | null>(
    circleWallets.getSession()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newSession = await circleWallets.initialize();
      setSession(newSession);
      console.log('✅ Circle Wallet Connected:', newSession.address);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to connect Circle Wallet';
      setError(errorMsg);
      console.error('❌ Circle Wallet connection failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    circleWallets.disconnect();
    setSession(null);
    setError(null);
    console.log('🔌 Circle Wallet disconnected');
  }, []);

  const switchNetwork = useCallback(async (chainId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const newSession = await circleWallets.switchChain(chainId);
      setSession(newSession);
      console.log(`🔄 Switched to ${newSession.chainName} (${newSession.chainId})`);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to switch network';
      setError(errorMsg);
      console.error('❌ Network switch failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!session) return;
    
    try {
      const balance = await circleWallets.fetchBalance();
      setSession(prev => prev ? { ...prev, balance } : null);
    } catch (err) {
      console.error('Balance refresh failed:', err);
    }
  }, [session]);

  const sendTransaction = useCallback(async (tx: CircleTransaction): Promise<`0x${string}` | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const hash = await circleWallets.sendTransaction(tx);
      console.log('✅ Transaction sent:', hash);
      await refreshBalance();
      return hash;
    } catch (err: any) {
      const errorMsg = err?.message || 'Transaction failed';
      setError(errorMsg);
      console.error('❌ Transaction failed:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [refreshBalance]);

  const signTypedData = useCallback(async (
    domain: any,
    types: any,
    message: any
  ): Promise<`0x${string}` | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const signature = await circleWallets.signTypedData(domain, types, message);
      console.log('✅ Typed data signed');
      return signature;
    } catch (err: any) {
      const errorMsg = err?.message || 'Signing failed';
      setError(errorMsg);
      console.error('❌ TypedData signing failed:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signMessage = useCallback(async (message: string): Promise<`0x${string}` | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const signature = await circleWallets.signMessage(message);
      console.log('✅ Message signed');
      return signature;
    } catch (err: any) {
      const errorMsg = err?.message || 'Signing failed';
      setError(errorMsg);
      console.error('❌ Message signing failed:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // State
    session,
    isConnected: !!session?.isConnected,
    isLoading,
    error,

    // Actions
    connect,
    disconnect,
    switchNetwork,
    refreshBalance,
    sendTransaction,
    signTypedData,
    signMessage,

    // Info
    address: session?.address || null,
    chainId: session?.chainId || null,
    chainName: session?.chainName || null,
    balance: session?.balance || null,
  };
}
