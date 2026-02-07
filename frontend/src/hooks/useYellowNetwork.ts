/**
 * useYellowNetwork Hook
 * 
 * React hook for integrating Yellow Network / Nitrolite SDK
 * Provides gasless, instant off-chain transactions for TradeX
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useWalletClient, usePublicClient, useWriteContract } from 'wagmi';
import { parseUnits, keccak256, encodePacked } from 'viem';
import {
    YellowNetworkClient,
    createYellowClient,
    YellowSession,
    YELLOW_CONTRACTS,
    CUSTODY_ABI,
    ERC20_APPROVE_ABI
} from '@/lib/yellowNetwork';
import type { Address, Hex } from 'viem';

interface UseYellowNetworkReturn {
    // State
    session: YellowSession;
    isConnected: boolean;
    isReady: boolean;
    isLoading: boolean;
    error: string | null;
    depositHash: string | null; // On-chain deposit tx hash
    channelTxHash: string | null; // On-chain channel creation tx hash
    hasPendingChannel: boolean; // Ready for on-chain submission

    // Actions
    connect: () => Promise<void>;
    authenticate: () => Promise<void>;
    openSession: (partnerAddress: Address, depositAmount?: string) => Promise<void>;
    sendPayment: (amount: string, recipient: Address) => Promise<void>;
    closeSession: () => void;
    closeChannel: () => Promise<string | null>; // Close channel and withdraw funds, returns tx hash
    requestTestTokens: () => Promise<boolean>;
    depositToChannel: (amount: string) => Promise<string | null>; // Returns tx hash
    requestChannelCreation: () => Promise<void>; // Request channel via WebSocket
    createChannelOnChain: () => Promise<string | null>; // Submit to blockchain, returns tx hash
    disableReconnect: () => void; // Disable auto-reconnect after swap success

    // Info
    sessionId: string | null;
    contractAddresses: typeof YELLOW_CONTRACTS;
}

export function useYellowNetwork(): UseYellowNetworkReturn {
    const { address, isConnected: walletConnected } = useAccount();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();
    const { writeContractAsync } = useWriteContract();

    const clientRef = useRef<YellowNetworkClient | null>(null);
    const [session, setSession] = useState<YellowSession>({ 
        state: 'disconnected',
        environment: 'sandbox',
        channelsEnabled: false,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [depositHash, setDepositHash] = useState<string | null>(null);

    // Initialize client when wallet is connected
    useEffect(() => {
        if (walletConnected && address && walletClient) {
            // Cleanup old client
            if (clientRef.current) {
                clientRef.current.disconnect();
            }

            // Create new client with publicClient for NitroliteClient
            const client = createYellowClient(walletClient as any, address, publicClient, true);

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
            console.log('⏭️  Next: Authenticate with Yellow Network');
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
     * Close active channel and withdraw funds (ON-CHAIN!)
     */
    const closeChannel = useCallback(async (): Promise<string | null> => {
        if (!clientRef.current) {
            setError('Not connected');
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            const txHash = await clientRef.current.closeChannel();
            console.log('✅ Channel closed and funds withdrawn:', txHash);
            return txHash;
        } catch (err) {
            console.error('Failed to close channel:', err);
            setError(err instanceof Error ? err.message : 'Channel close failed');
            return null;
        } finally {
            setIsLoading(false);
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

    /**
     * Deposit ETH to Yellow Network Custody Contract (ON-CHAIN!)
     * This creates a verifiable on-chain transaction
     * Note: Using ETH deposit for simplicity since Custody Contract ABI is unverified
     */
    const depositToChannel = useCallback(async (amountEth: string): Promise<string | null> => {
        if (!address || !publicClient) {
            setError('Wallet not connected');
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            const amountInWei = parseUnits(amountEth, 18); // ETH has 18 decimals

            // Generate a channel ID from user address + timestamp
            const channelId = keccak256(
                encodePacked(['address', 'uint256'], [address, BigInt(Date.now())])
            ) as Hex;

            console.log('🔒 Depositing ETH to Custody Contract...');
            console.log('   Amount:', amountEth, 'ETH');
            console.log('   Channel ID:', channelId);
            console.log('   Custody:', YELLOW_CONTRACTS.CUSTODY);

            // Deposit ETH directly (no approval needed for ETH)
            console.log('📝 Depositing ETH to Custody...');
            const depositTxHash = await writeContractAsync({
                address: YELLOW_CONTRACTS.CUSTODY,
                abi: CUSTODY_ABI,
                functionName: 'depositETH',
                args: [channelId],
                value: amountInWei,
            });

            console.log('⏳ Waiting for deposit confirmation...');
            await publicClient.waitForTransactionReceipt({ hash: depositTxHash });

            console.log('🎉 ON-CHAIN DEPOSIT CONFIRMED!');
            console.log('   TX Hash:', depositTxHash);
            console.log('   View on Etherscan: https://sepolia.etherscan.io/tx/' + depositTxHash);

            // Store the hash for display
            setDepositHash(depositTxHash);

            // Update session with channelOpenHash
            setSession(prev => ({
                ...prev,
                channelOpenHash: depositTxHash
            }));

            return depositTxHash;
        } catch (err: any) {
            console.error('Deposit failed:', err);
            setError(err?.message || 'Deposit to Custody failed');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [address, publicClient, writeContractAsync]);

    // New channel creation methods
    const requestChannelCreation = useCallback(async () => {
        if (!clientRef.current) {
            setError('Client not initialized');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await clientRef.current.requestChannelCreation();
        } catch (err: any) {
            console.error('Request channel creation failed:', err);
            setError(err?.message || 'Failed to request channel creation');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createChannelOnChain = useCallback(async (): Promise<string | null> => {
        if (!clientRef.current) {
            setError('Client not initialized');
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            const txHash = await clientRef.current.createChannelOnChain();
            console.log('🎉 Channel created on-chain! TX Hash:', txHash);
            
            // Update session with channel hash
            setSession(prev => ({
                ...prev,
                channelOpenHash: txHash,
                state: 'session_ready'
            }));
            
            setDepositHash(txHash);
            return txHash;
        } catch (err: any) {
            console.error('Create channel on-chain failed:', err);
            setError(err?.message || 'Failed to create channel on-chain');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Derived state
    // Disable reconnect (e.g. after a successful swap to prevent auth loops)
    const disableReconnect = useCallback(() => {
        clientRef.current?.disableReconnect();
    }, []);

    const isConnected = session.state !== 'disconnected' && session.state !== 'error';
    const isReady = session.state === 'session_ready' || session.state === 'authenticated';
    const hasPendingChannel = clientRef.current?.hasPendingChannel() || false;

    return {
        // State
        session,
        isConnected,
        isReady,
        isLoading,
        error,
        depositHash,
        channelTxHash: session.channelOpenHash || null,
        hasPendingChannel,

        // Actions
        connect,
        authenticate,
        openSession,
        sendPayment,
        closeSession,
        closeChannel,
        requestTestTokens,
        depositToChannel,
        requestChannelCreation,
        createChannelOnChain,
        disableReconnect,

        // Info
        sessionId: session.sessionId || null,
        contractAddresses: YELLOW_CONTRACTS,
    };
}
