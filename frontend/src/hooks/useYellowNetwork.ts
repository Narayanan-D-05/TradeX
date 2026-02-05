/**
 * useYellowNetwork Hook
 * 
 * React hook for integrating Yellow Network / Nitrolite SDK
 * Provides gasless, instant off-chain transactions for TradeX
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import {
    YellowNetworkClient,
    createYellowClient,
    YellowSession,
    YELLOW_CONTRACTS
} from '@/lib/yellowNetwork';
import type { Address } from 'viem';

interface UseYellowNetworkReturn {
    // State
    session: YellowSession;
    isConnected: boolean;
    isReady: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    connect: () => Promise<void>;
    authenticate: () => Promise<void>;
    openSession: (partnerAddress: Address, depositAmount?: string) => Promise<void>;
    sendPayment: (amount: string, recipient: Address) => Promise<void>;
    closeSession: () => void;
    requestTestTokens: () => Promise<boolean>;

    // Info
    sessionId: string | null;
    contractAddresses: typeof YELLOW_CONTRACTS;
}

export function useYellowNetwork(): UseYellowNetworkReturn {
    const { address, isConnected: walletConnected } = useAccount();
    const { data: walletClient } = useWalletClient();

    const clientRef = useRef<YellowNetworkClient | null>(null);
    const [session, setSession] = useState<YellowSession>({ state: 'disconnected' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize client when wallet is connected
    useEffect(() => {
        if (walletConnected && address && walletClient) {
            // Cleanup old client
            if (clientRef.current) {
                clientRef.current.disconnect();
            }

            // Create new client
            const client = createYellowClient(walletClient, address, true);

            // Subscribe to session changes
            client.onSessionChange((newSession) => {
                setSession(newSession);
                if (newSession.error) {
                    setError(newSession.error);
                }
            });

            clientRef.current = client;
            console.log('🟡 Yellow Network client initialized for:', address);
        }

        return () => {
            if (clientRef.current) {
                clientRef.current.disconnect();
                clientRef.current = null;
            }
        };
    }, [walletConnected, address, walletClient]);

    /**
     * Connect to Yellow Network ClearNode and start authentication
     */
    const connect = useCallback(async () => {
        if (!clientRef.current) {
            setError('Wallet not connected');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await clientRef.current.connect();
            console.log('✅ Connected to Yellow Network');

            // Automatically start authentication after connecting
            await clientRef.current.authenticate();
            console.log('✅ Authentication started...');
        } catch (err) {
            console.error('Failed to connect:', err);
            setError(err instanceof Error ? err.message : 'Connection failed');
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Authenticate with Yellow Network
     */
    const authenticate = useCallback(async () => {
        if (!clientRef.current) {
            setError('Not connected');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await clientRef.current.authenticate();
            console.log('✅ Authenticating with Yellow Network...');
        } catch (err) {
            console.error('Authentication failed:', err);
            setError(err instanceof Error ? err.message : 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Open a Yellow Network session
     */
    const openSession = useCallback(async (partnerAddress: Address, depositAmount: string = '1000000') => {
        if (!clientRef.current) {
            setError('Not initialized');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Connect if not connected
            if (session.state === 'disconnected') {
                await clientRef.current.connect();
            }

            // Authenticate if needed
            if (session.state === 'connected') {
                await clientRef.current.authenticate();
                // Wait a bit for auth to complete
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Create app session
            await clientRef.current.createAppSession(partnerAddress, depositAmount);
            console.log('✅ Yellow Network session opened!');
        } catch (err) {
            console.error('Failed to open session:', err);
            setError(err instanceof Error ? err.message : 'Session open failed');
        } finally {
            setIsLoading(false);
        }
    }, [session.state]);

    /**
     * Send instant off-chain payment (GASLESS!)
     */
    const sendPayment = useCallback(async (amount: string, recipient: Address) => {
        if (!clientRef.current) {
            setError('Not connected');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await clientRef.current.sendPayment(amount, recipient);
            console.log('💸 Payment sent instantly via Yellow Network!');
        } catch (err) {
            console.error('Payment failed:', err);
            setError(err instanceof Error ? err.message : 'Payment failed');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Close Yellow Network session
     */
    const closeSession = useCallback(() => {
        if (clientRef.current) {
            clientRef.current.disconnect();
        }
    }, []);

    /**
     * Request test tokens from Yellow Network faucet
     */
    const requestTestTokens = useCallback(async (): Promise<boolean> => {
        if (!clientRef.current) {
            setError('Not connected');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            const success = await clientRef.current.requestTestTokens();
            if (success) {
                console.log('✅ Test tokens requested');
            }
            return success;
        } catch (err) {
            console.error('Failed to request tokens:', err);
            setError(err instanceof Error ? err.message : 'Faucet request failed');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Derived state
    const isConnected = session.state !== 'disconnected' && session.state !== 'error';
    const isReady = session.state === 'session_ready' || session.state === 'authenticated';

    return {
        // State
        session,
        isConnected,
        isReady,
        isLoading,
        error,

        // Actions
        connect,
        authenticate,
        openSession,
        sendPayment,
        closeSession,
        requestTestTokens,

        // Info
        sessionId: session.sessionId || null,
        contractAddresses: YELLOW_CONTRACTS,
    };
}
