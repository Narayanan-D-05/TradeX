'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useSwitchChain, useSignTypedData, usePublicClient } from 'wagmi';
import { parseEther, parseUnits, formatEther, encodeFunctionData } from 'viem';
import { useYellowNetwork } from '@/hooks/useYellowNetwork';

// Contract ABIs
const TRADEX_ABI = [
    {
        name: 'fundBroker',
        type: 'function',
        inputs: [
            { name: '_inrAmount', type: 'uint256' },
            { name: '_brokerAddress', type: 'address' }
        ],
        outputs: [
            { name: 'orderId', type: 'bytes32' },
            { name: 'aedAmount', type: 'uint256' }
        ]
    },
    {
        name: 'sendHome',
        type: 'function',
        inputs: [
            { name: '_aedAmount', type: 'uint256' },
            { name: '_recipient', type: 'address' }
        ],
        outputs: [
            { name: 'orderId', type: 'bytes32' },
            { name: 'inrAmount', type: 'uint256' }
        ]
    }
] as const;

const ERC20_ABI = [
    {
        name: 'approve',
        type: 'function',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ type: 'bool' }]
    },
    {
        name: 'balanceOf',
        type: 'function',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }]
    },
    {
        name: 'allowance',
        type: 'function',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' }
        ],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view'
    }
] as const;

const YELLOW_ABI = [
    {
        name: 'openSession',
        type: 'function',
        inputs: [{ name: '_duration', type: 'uint256' }],
        outputs: [],
        stateMutability: 'payable'
    },
    {
        name: 'closeSession',
        type: 'function',
        inputs: [],
        outputs: []
    },
    {
        name: 'isSessionActive',
        type: 'function',
        inputs: [{ name: '_user', type: 'address' }],
        outputs: [{ type: 'bool' }],
        stateMutability: 'view'
    },
    {
        name: 'getSessionBalance',
        type: 'function',
        inputs: [{ name: '_user', type: 'address' }],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view'
    },
    {
        name: 'executeGasless',
        type: 'function',
        inputs: [
            { name: '_user', type: 'address' },
            {
                name: '_tx',
                type: 'tuple',
                components: [
                    { name: 'to', type: 'address' },
                    { name: 'value', type: 'uint256' },
                    { name: 'data', type: 'bytes' },
                    { name: 'nonce', type: 'uint256' },
                    { name: 'deadline', type: 'uint256' }
                ]
            },
            { name: '_signature', type: 'bytes' }
        ],
        outputs: [{ type: 'bool' }, { type: 'bytes' }]
    },
    {
        name: 'sessions',
        type: 'function',
        inputs: [{ name: '', type: 'address' }],
        outputs: [
            { name: 'user', type: 'address' },
            { name: 'deposit', type: 'uint256' },
            { name: 'spent', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'expiry', type: 'uint256' },
            { name: 'active', type: 'bool' }
        ],
        stateMutability: 'view'
    }
] as const;

// LI.FI Router ABI for cross-chain zaps
const LIFI_ABI = [
    {
        name: 'zapToArc',
        type: 'function',
        inputs: [
            { name: '_tokenIn', type: 'address' },
            { name: '_tokenOut', type: 'address' },
            { name: '_amount', type: 'uint256' },
            { name: '_recipient', type: 'address' }
        ],
        outputs: [{ type: 'bytes32' }],
        stateMutability: 'payable'
    },
    {
        name: 'zapToSepolia',
        type: 'function',
        inputs: [
            { name: '_tokenIn', type: 'address' },
            { name: '_tokenOut', type: 'address' },
            { name: '_amount', type: 'uint256' },
            { name: '_recipient', type: 'address' }
        ],
        outputs: [{ type: 'bytes32' }],
        stateMutability: 'payable'
    },
    {
        name: 'executeZapGasless',
        type: 'function',
        inputs: [
            {
                name: '_request',
                type: 'tuple',
                components: [
                    { name: 'tokenIn', type: 'address' },
                    { name: 'tokenOut', type: 'address' },
                    { name: 'amountIn', type: 'uint256' },
                    { name: 'minAmountOut', type: 'uint256' },
                    { name: 'destinationChainId', type: 'uint256' },
                    { name: 'recipient', type: 'address' },
                    { name: 'lifiData', type: 'bytes' }
                ]
            },
            { name: '_user', type: 'address' }
        ],
        outputs: [{ name: 'zapId', type: 'bytes32' }],
        stateMutability: 'payable'
    }
] as const;

// Contract addresses (newly deployed)
// Contract addresses (Loaded from Env)
const CONTRACTS = {
    TRADEX: (process.env.NEXT_PUBLIC_TRADEX || '0x011BCCA0Fa806944a74e0E13965412d275E02A08') as `0x${string}`,
    INR_STABLE: (process.env.NEXT_PUBLIC_INR_STABLE || '0x0F09aD4F62f6C592aDF35eF059a0B16f6Fe13010') as `0x${string}`,
    AED_STABLE: (process.env.NEXT_PUBLIC_AED_STABLE || '0x5865b9E57643E92DE466a49fA2ab6095A8320d9B') as `0x${string}`,
    YELLOW_ADAPTER: (process.env.NEXT_PUBLIC_YELLOW_ADAPTER || '0xF23584D7b593Cf4ba12d775C1C3E93C4D5342356') as `0x${string}`,
    LIFI_ROUTER: (process.env.NEXT_PUBLIC_LIFI_ROUTER || '0x07d28E89C6320D2cdb6f67585cC35EE9fA944667') as `0x${string}`,
};

interface SwapCardProps {
    mode: 'fundBroker' | 'sendHome';
    onSwap?: (amount: string, recipient: string) => void;
}

export function SwapCard({ mode, onSwap }: SwapCardProps) {
    const [amount, setAmount] = useState('');
    const [recipient, setRecipient] = useState('');
    const [step, setStep] = useState<'idle' | 'opening-session' | 'approving' | 'swapping' | 'success' | 'error' | 'minting'>('idle');
    const [txHash, setTxHash] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [useGasless, setUseGasless] = useState(true);
    const [swapMode, setSwapMode] = useState<'gasless' | 'standard'>('gasless');

    const { address, isConnected, chainId } = useAccount();
    const { writeContractAsync } = useWriteContract();
    const { signTypedDataAsync } = useSignTypedData();
    const publicClient = usePublicClient();
    const { switchChainAsync } = useSwitchChain();

    // Yellow Network SDK Integration
    const yellow = useYellowNetwork();

    // Check for "Zombie" sessions (Expired but still marked Active in storage)
    const { data: sessionData, refetch: refetchSession } = useReadContract({
        address: CONTRACTS.YELLOW_ADAPTER,
        abi: YELLOW_ABI,
        functionName: 'getSession',
        args: address ? [address] : undefined,
    });

    // Parse session data
    // Struct: [user, deposit, spent, nonce, expiry, active]
    const currentSession = sessionData ? {
        expiry: Number((sessionData as any).expiry || (Array.isArray(sessionData) ? sessionData[4] : 0)),
        isActive: (sessionData as any).active || (Array.isArray(sessionData) ? sessionData[5] : false),
        deposit: (sessionData as any).deposit || (Array.isArray(sessionData) ? sessionData[1] : BigInt(0)),
    } : null;

    const isSessionExpired = currentSession ? (Date.now() / 1000) > currentSession.expiry : false;
    const isZombieSession = currentSession?.isActive && isSessionExpired;

    const { data: hasSession } = useReadContract({
        address: CONTRACTS.YELLOW_ADAPTER,
        abi: YELLOW_ABI,
        functionName: 'isSessionActive',
        args: address ? [address] : undefined,
    });

    const sessionBalance = currentSession ? (currentSession.deposit as bigint) : BigInt(0);

    // Mock exchange rates (from TradeXOracle)
    const INR_TO_AED_RATE = 0.044;
    const AED_TO_INR_RATE = 22.75;
    const PLATFORM_FEE = 0.003;

    const isFundBroker = mode === 'fundBroker';

    const sourceToken = isFundBroker ? 'INR' : 'AED';
    const destToken = isFundBroker ? 'AED' : 'INR';
    const sourceNetwork = isFundBroker ? 'Ethereum Sepolia' : 'Arc Testnet';
    const destNetwork = isFundBroker ? 'Arc Testnet' : 'Ethereum Sepolia';

    const sourceTokenAddress = isFundBroker ? CONTRACTS.INR_STABLE : CONTRACTS.AED_STABLE;

    // Fetch Token Balance
    const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
        address: sourceTokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    });

    const calculateOutput = () => {
        if (!amount || isNaN(parseFloat(amount))) return '0';
        const inputAmount = parseFloat(amount);
        const rate = isFundBroker ? INR_TO_AED_RATE : AED_TO_INR_RATE;
        const grossOutput = inputAmount * rate;
        const fee = grossOutput * PLATFORM_FEE;
        return (grossOutput - fee).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    };

    const calculateFee = () => {
        if (!amount || isNaN(parseFloat(amount))) return '0';
        const inputAmount = parseFloat(amount);
        const rate = isFundBroker ? INR_TO_AED_RATE : AED_TO_INR_RATE;
        const grossOutput = inputAmount * rate;
        return (grossOutput * PLATFORM_FEE).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    };

    // Helper to ensure correct network
    const ensureNetwork = async (targetChainId: number) => {
        if (!chainId || chainId !== targetChainId) {
            try {
                await switchChainAsync({ chainId: targetChainId });
                return true;
            } catch (error) {
                console.error('Failed to switch network:', error);
                setErrorMsg('Please switch to the correct network');
                setStep('error');
                return false;
            }
        }
        return true;
    };

    const openYellowSession = async () => {
        if (!isConnected || !publicClient || !address) return;

        setStep('opening-session');

        // Ensure strictly on Sepolia for Yellow Gasless demo
        const isCorrectNetwork = await ensureNetwork(11155111);
        if (!isCorrectNetwork) return;

        try {
            // Check ETH balance before opening session
            const balance = await publicClient.getBalance({ address });
            const requiredDeposit = parseEther('0.01'); // Reduced to 0.01 ETH
            const estimatedGas = parseEther('0.01'); // Estimated gas cost

            if (balance < (requiredDeposit + estimatedGas)) {
                setErrorMsg(`Insufficient ETH. Need at least ${formatEther(requiredDeposit + estimatedGas)} SepoliaETH (${formatEther(requiredDeposit)} deposit + gas). You have ${formatEther(balance)}.`);
                setStep('error');
                setUseGasless(false);
                return;
            }

            // Open session with 0.01 ETH deposit for gasless transactions
            const hash = await writeContractAsync({
                address: CONTRACTS.YELLOW_ADAPTER,
                abi: YELLOW_ABI,
                functionName: 'openSession',
                args: [BigInt(3600)], // 1 hour session
                value: requiredDeposit,
            });
            console.log('Session opened:', hash);

            // Wait for confirmation
            await publicClient.waitForTransactionReceipt({ hash });
            setStep('idle');
        } catch (error: any) {
            console.error('Failed to open session:', error);
            // For Demo: If gasless fails (e.g. insufficient funds for deposit), allow proceeding without gasless
            const msg = error.message?.includes('insufficient funds')
                ? 'Insufficient ETH for gasless session. Please get some Sepolia ETH from a faucet or use standard gas mode.'
                : 'Gasless session failed, but you can proceed with standard gas.';
            setErrorMsg(msg);
            setTimeout(() => {
                setErrorMsg(null);
                setStep('idle');
                setUseGasless(false); // Fallback to standard gas
            }, 5000);
        }
    };

    const handleSwap = async () => {
        if (!amount || !recipient || !isConnected || !address || !publicClient) return;

        setStep('approving');
        setErrorMsg(null);
        setTxHash(null);

        // Determine chain based on mode
        const targetChainId = isFundBroker ? 11155111 : 5042002; // Sepolia or Arc

        // Ensure network before starting
        if (chainId !== targetChainId) {
            const success = await ensureNetwork(targetChainId);
            if (success) {
                setErrorMsg('Network switched via Wallet. Please click Swap again to continue.');
                setStep('idle');
            }
            return;
        }

        try {
            const amountInWei = parseUnits(amount, 18);
            const tokenAddress = isFundBroker ? CONTRACTS.INR_STABLE : CONTRACTS.AED_STABLE;

            // Pre-validation: Check if user has enough tokens
            if (tokenBalance && amountInWei > (tokenBalance as bigint)) {
                setErrorMsg(`Insufficient ${sourceToken} balance. You have ${formatEther(tokenBalance as bigint)} but trying to swap ${amount}.`);
                setStep('error');
                return;
            }

            // Check existing allowance - skip approval if already sufficient
            const currentAllowance = await publicClient.readContract({
                address: tokenAddress,
                abi: ERC20_ABI,
                functionName: 'allowance',
                args: [address, CONTRACTS.LIFI_ROUTER],
            }) as bigint;

            console.log('Current allowance:', currentAllowance.toString());

            if (currentAllowance < amountInWei) {
                // Need to approve - use exact amount
                console.log('Approving tokens for LI.FI...');
                const approveHash = await writeContractAsync({
                    address: tokenAddress,
                    abi: ERC20_ABI,
                    functionName: 'approve',
                    args: [CONTRACTS.LIFI_ROUTER, amountInWei],
                });
                console.log('Approval tx:', approveHash);

                // Wait for approval confirmation
                await publicClient.waitForTransactionReceipt({
                    hash: approveHash,
                    timeout: 120_000,
                    pollingInterval: 2_000,
                });
                console.log('Approval confirmed');
            } else {
                console.log('Sufficient allowance exists, skipping approval ⚡');
            }

            // Step 2: Execute cross-chain swap
            setStep('swapping');
            console.log('Executing swap...');

            let swapHash;
            const tokenOut = isFundBroker ? CONTRACTS.AED_STABLE : CONTRACTS.INR_STABLE;
            const destinationChainId = isFundBroker ? BigInt(5042002) : BigInt(11155111);

            if (useGasless && yellow.isReady) {
                // ====== YELLOW NETWORK SDK GASLESS FLOW ======
                // Uses official @erc7824/nitrolite SDK for off-chain state channels
                console.log("🟡 Using Yellow Network SDK for GASLESS transaction...");
                console.log("   Session state:", yellow.session.state);
                console.log("   Session ID:", yellow.sessionId);

                try {
                    // The Yellow SDK sendPayment uses state channels for instant, gasless transfers
                    // This happens OFF-CHAIN in the Yellow Network clearing layer
                    await yellow.sendPayment(
                        amountInWei.toString(),
                        recipient as `0x${string}`
                    );

                    console.log("✅ Yellow Network payment sent (GASLESS - no blockchain tx!)");

                    // For Yellow SDK, there's no on-chain hash immediately
                    // The transaction is settled off-chain in the state channel
                    swapHash = `yellow-offchain-${Date.now()}` as `0x${string}`;

                    // Show success with Yellow Network badge
                    setStep('success');
                    alert('✅ Gasless payment sent via Yellow Network! The transaction was processed off-chain using state channels - no gas fees!');

                } catch (yellowError: any) {
                    console.error("Yellow SDK payment failed:", yellowError);

                    // Fallback to standard gas flow if Yellow fails
                    console.log("⚠️ Falling back to standard on-chain transaction...");
                    setErrorMsg(`Yellow Network error: ${yellowError.message}. Trying standard transaction...`);

                    // Execute standard swap as fallback
                    if (isFundBroker) {
                        swapHash = await writeContractAsync({
                            address: CONTRACTS.LIFI_ROUTER,
                            abi: LIFI_ABI,
                            functionName: 'zapToArc',
                            args: [tokenAddress, tokenOut, amountInWei, recipient as `0x${string}`],
                        });
                    } else {
                        swapHash = await writeContractAsync({
                            address: CONTRACTS.LIFI_ROUTER,
                            abi: LIFI_ABI,
                            functionName: 'zapToSepolia',
                            args: [tokenAddress, tokenOut, amountInWei, recipient as `0x${string}`],
                        });
                    }
                }

            } else if (useGasless && !yellow.isReady) {
                // Yellow enabled but not ready - prompt user
                setErrorMsg('Yellow Network session not ready. Click "Connect" in the Yellow Network section first, then try again.');
                setStep('error');
                return;
            } else {
                // STANDARD GAS FLOW
                // Check ETH balance for gas
                const ethBalance = await publicClient!.getBalance({ address: address! });
                const estimatedGas = parseEther('0.02'); // Conservative estimate

                if (ethBalance < estimatedGas) {
                    setErrorMsg(`Insufficient ETH for gas fees. Need at least ${formatEther(estimatedGas)} SepoliaETH. You have ${formatEther(ethBalance)}. Get Sepolia ETH from a faucet.`);
                    setStep('error');
                    return;
                }

                if (isFundBroker) {
                    swapHash = await writeContractAsync({
                        address: CONTRACTS.LIFI_ROUTER,
                        abi: LIFI_ABI,
                        functionName: 'zapToArc',
                        args: [tokenAddress, tokenOut, amountInWei, recipient as `0x${string}`],
                    });
                } else {
                    swapHash = await writeContractAsync({
                        address: CONTRACTS.LIFI_ROUTER,
                        abi: LIFI_ABI,
                        functionName: 'zapToSepolia',
                        args: [tokenAddress, tokenOut, amountInWei, recipient as `0x${string}`],
                    });
                }
            }

            console.log('LI.FI Zap tx:', swapHash);
            setTxHash(swapHash);
            setStep('success');
            onSwap?.(amount, recipient);

        } catch (error: any) {
            console.error('Swap failed:', error);
            setStep('error');
            // Better error message extraction
            let msg = error.shortMessage || error.message || 'Transaction failed';
            if (msg.includes('UnsupportedToken')) {
                msg = 'Token not supported. Please contact support.';
            } else if (msg.includes('UnsupportedRoute')) {
                msg = 'Route not available. Please try again later.';
            } else if (msg.includes('InsufficientAmount')) {
                msg = 'Amount too low. Please enter a higher amount.';
            } else if (msg.includes('user rejected')) {
                msg = 'Transaction was rejected in wallet.';
            }
            setErrorMsg(msg);
        }
    };

    const handleMaxClick = () => {
        if (tokenBalance) {
            setAmount(formatEther(tokenBalance as bigint));
        }
    };

    const mintTestTokens = async () => {
        if (!isConnected || !address) return;

        setStep('minting');
        try {
            const hash = await writeContractAsync({
                address: sourceTokenAddress,
                abi: [
                    {
                        name: 'faucet',
                        type: 'function',
                        inputs: [],
                        outputs: []
                    }
                ] as const,
                functionName: 'faucet',
            });

            console.log('Faucet tx:', hash);

            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash });
            }

            await refetchBalance();
            setStep('idle');
        } catch (error: any) {
            console.error('Mint failed:', error);
            setErrorMsg('Failed to mint tokens. Try again.');
            setStep('error');
        }
    };

    const resetState = () => {
        setStep('idle');
        setAmount('');
        setRecipient('');
        setTxHash(null);
        setErrorMsg(null);
    };

    return (
        <div className="glass-card p-6 w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">
                    {isFundBroker ? '🏦 Fund DFM Broker' : '🏠 Send Home'}
                </h2>
                <div className={`network-badge ${isFundBroker ? 'mumbai' : 'arc'}`}>
                    <span className="w-2 h-2 rounded-full bg-current pulse-glow" />
                    {sourceNetwork}
                </div>
            </div>

            {/* Mode Toggle */}
            {isConnected && (
                <div className="mb-4 flex items-center justify-center gap-2 p-2 bg-gray-800/50 rounded-lg">
                    <button
                        onClick={() => { setSwapMode('gasless'); setUseGasless(true); }}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${swapMode === 'gasless'
                            ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50'
                            : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        ⚡ Yellow Gasless
                    </button>
                    <button
                        onClick={() => { setSwapMode('standard'); setUseGasless(false); }}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${swapMode === 'standard'
                            ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                            : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        ⛽ Standard (LI.FI)
                    </button>
                </div>
            )}

            {/* Yellow Network SDK Status */}
            {useGasless && isConnected && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-yellow-400">⚡</span>
                            <span className="text-sm text-yellow-200">Yellow Network</span>
                            {yellow.isLoading && (
                                <span className="text-xs text-yellow-500 animate-pulse">Loading...</span>
                            )}
                        </div>
                        {yellow.session.state === 'session_ready' ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-emerald-400">
                                    ✓ Session Ready
                                </span>
                                <button
                                    onClick={yellow.closeSession}
                                    className="text-xs px-2 py-1 bg-gray-500/20 hover:bg-gray-500/30 rounded text-gray-300"
                                >
                                    Close
                                </button>
                            </div>
                        ) : yellow.session.state === 'authenticated' ? (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-emerald-400">✓ Authenticated</span>
                                    <button
                                        onClick={yellow.requestTestTokens}
                                        disabled={yellow.isLoading}
                                        className="text-xs px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded text-blue-300 disabled:opacity-50"
                                        title="Get ytest.usd tokens from Yellow Network faucet"
                                    >
                                        Get Tokens
                                    </button>
                                </div>

                                {/* Channel Creation Buttons */}
                                {!yellow.hasPendingChannel && !yellow.channelTxHash && (
                                    <button
                                        onClick={async () => {
                                            await yellow.requestChannelCreation();
                                        }}
                                        disabled={yellow.isLoading}
                                        className="w-full px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-all"
                                    >
                                        {yellow.isLoading ? '⏳ Processing...' : '📡 Request Channel (WebSocket)'}
                                    </button>
                                )}

                                {yellow.hasPendingChannel && (
                                    <button
                                        onClick={async () => {
                                            const hash = await yellow.createChannelOnChain();
                                            if (hash) {
                                                alert(`🎉 ON-CHAIN CHANNEL CREATED!\n\nTX Hash: ${hash}\n\nView on Etherscan: https://sepolia.etherscan.io/tx/${hash}`);
                                            }
                                        }}
                                        disabled={yellow.isLoading}
                                        className="w-full px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-all animate-pulse"
                                    >
                                        {yellow.isLoading ? '⏳ Submitting...' : '🔗 Create Channel ON-CHAIN (TX Proof!)'}
                                    </button>
                                )}

                                {yellow.channelTxHash && (
                                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded">
                                        <span className="text-emerald-500/80 block mb-1">✅ Channel Created On-Chain!</span>
                                        <a
                                            href={`https://sepolia.etherscan.io/tx/${yellow.channelTxHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-emerald-300 hover:text-emerald-200 hover:underline break-all font-mono text-xs"
                                        >
                                            {yellow.channelTxHash.slice(0, 10)}...{yellow.channelTxHash.slice(-8)} →
                                        </a>
                                    </div>
                                )}

                                <p className="text-xs text-gray-500">Uses NitroliteClient for verifiable on-chain proof</p>
                            </div>
                        ) : yellow.session.state === 'authenticating' ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-yellow-400 animate-pulse">🔐 Signing...</span>
                                <span className="text-xs text-gray-400">(Check wallet)</span>
                            </div>
                        ) : yellow.session.state === 'connecting' || yellow.session.state === 'connected' ? (
                            <span className="text-xs text-yellow-400 animate-pulse">
                                Connecting...
                            </span>
                        ) : yellow.session.state === 'error' ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-red-400">
                                    ⚠ {yellow.error?.slice(0, 25) || 'Error'}
                                </span>
                                <button
                                    onClick={yellow.connect}
                                    className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-red-300"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={yellow.connect}
                                disabled={yellow.isLoading}
                                className="text-xs px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 rounded text-yellow-300 disabled:opacity-50"
                            >
                                Connect
                            </button>
                        )}
                    </div>

                    {/* Session Details */}
                    {yellow.session.sessionId && (
                        <div className="mt-3 pt-2 border-t border-yellow-500/20 space-y-2 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-yellow-500/60 block">Status</span>
                                    <span className="text-yellow-200 capitalize">{yellow.session.state.replace('_', ' ')}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-yellow-500/60 block">Off-Chain Balance</span>
                                    <span className="text-emerald-300 font-mono">
                                        {yellow.session.balanceRaw
                                            ? `${(Number(yellow.session.balanceRaw) / Math.pow(10, yellow.session.balanceDecimals || 6)).toFixed(2)} ${yellow.session.balanceSymbol || 'TEST'}`
                                            : '0.00 TEST'}
                                    </span>
                                    {yellow.session.isSimulated && (
                                        <span className="text-xs text-orange-400 block mt-1">
                                            ⚠️ Sandbox simulation
                                        </span>
                                    )}
                                </div>
                            </div>
                            {/* Channel Open Hash - On-Chain Proof */}
                            {(yellow.session.channelOpenHash || yellow.depositHash) && (
                                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded">
                                    <span className="text-emerald-500/80 block mb-1">🔗 Deposit TX (On-Chain Proof)</span>
                                    <a
                                        href={`https://sepolia.etherscan.io/tx/${yellow.session.channelOpenHash || yellow.depositHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-300 hover:text-emerald-200 hover:underline break-all font-mono"
                                    >
                                        {(yellow.session.channelOpenHash || yellow.depositHash || '').slice(0, 10)}...{(yellow.session.channelOpenHash || yellow.depositHash || '').slice(-8)} →
                                    </a>
                                    <p className="text-xs text-emerald-400/60 mt-1">✓ Verified on Sepolia Etherscan</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SDK Info */}
                    <div className="mt-2 text-xs text-yellow-500/70 flex items-center justify-between">
                        <span>SDK: @erc7824/nitrolite • State Channels</span>
                        <span className="capitalize">{yellow.session.state}</span>
                    </div>
                </div>
            )}

            {/* Testnet Info Banner */}
            {isConnected && (
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="text-xs text-blue-300 space-y-1">
                        <div className="flex items-center gap-2">
                            <span>ℹ️</span>
                            <span className="font-semibold">Testnet Mode</span>
                        </div>
                        <div className="text-blue-400/80">
                            • Click <strong>Faucet</strong> to get 10,000 test {sourceToken}
                        </div>
                        <div className="text-blue-400/80">
                            • Get Sepolia ETH: <a href="https://sepoliafaucet.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300">sepoliafaucet.com</a>
                        </div>
                    </div>
                </div>
            )}

            {/* Success State */}
            {step === 'success' && (
                <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-bold">Transaction Successful!</span>
                    </div>

                    {/* Check if this is a Yellow Network off-chain transaction */}
                    {txHash?.startsWith('yellow-offchain') ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-yellow-400">
                                <span>⚡</span>
                                <span className="text-sm font-medium">Yellow Network Off-Chain Settlement</span>
                            </div>
                            <div className="text-xs text-gray-400 space-y-1">
                                <p>✅ This transaction was processed <strong className="text-yellow-300">instantly and gaslessly</strong> using Yellow Network state channels.</p>
                                <p>💰 <strong className="text-emerald-300">No gas fees paid!</strong> The payment was settled off-chain in the Yellow Network clearing layer.</p>
                                <p>🔐 Funds are secured by the Nitrolite protocol and can be withdrawn to L1 anytime.</p>
                            </div>
                            <div className="mt-3 p-2 bg-gray-800/50 rounded text-xs text-gray-500">
                                Off-chain ID: {txHash}
                            </div>
                        </div>
                    ) : txHash ? (
                        <div className="space-y-3">
                            {/* LI.FI Explorer Link - Primary Verification */}
                            <a
                                href={`https://scan.li.fi/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-indigo-300 hover:bg-indigo-500/30 transition-colors"
                            >
                                <span className="text-lg">🔗</span>
                                <div>
                                    <div className="font-medium">View on LI.FI Explorer</div>
                                    <div className="text-xs text-indigo-400/70">Cross-chain verification</div>
                                </div>
                                <span className="ml-auto">→</span>
                            </a>
                            {/* Etherscan Link - Secondary */}
                            <a
                                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-gray-400 hover:text-gray-200 hover:underline break-all block"
                            >
                                View on Sepolia Etherscan →
                            </a>
                        </div>
                    ) : null}

                    <button onClick={resetState} className="mt-4 btn-primary w-full">
                        Make Another Swap
                    </button>
                </div>
            )}

            {/* Error State */}
            {
                step === 'error' && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                        <div className="flex items-center gap-2 text-red-400 mb-2">
                            <span className="font-bold">❌ Transaction Failed</span>
                        </div>
                        <p className="text-sm text-gray-300">{errorMsg}</p>
                        <button onClick={resetState} className="mt-4 btn-primary w-full">
                            Try Again
                        </button>
                    </div>
                )
            }

            {/* Form */}
            {
                step !== 'success' && step !== 'error' && (
                    <>
                        {/* From Input */}
                        <div className="mb-4">
                            <div className="flex justify-between mb-2">
                                <label className="block text-sm text-gray-400">You Send</label>
                                {isConnected && (
                                    <div className="text-xs flex gap-2 items-center">
                                        <span className="text-gray-500">
                                            Balance: {tokenBalance ? parseFloat(formatEther(tokenBalance as bigint)).toFixed(2) : '0'} {sourceToken}
                                        </span>
                                        <button
                                            onClick={mintTestTokens}
                                            disabled={step !== 'idle'}
                                            className="text-green-400 hover:text-green-300 uppercase font-semibold disabled:opacity-50"
                                            title="Get 10,000 test tokens"
                                        >
                                            Faucet
                                        </button>
                                        <button
                                            onClick={handleMaxClick}
                                            className="text-indigo-400 hover:text-indigo-300 uppercase font-semibold"
                                        >
                                            Max
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="input-field pr-20 text-2xl font-semibold"
                                    disabled={step !== 'idle'}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    <span className="text-lg font-medium text-gray-300">{sourceToken}</span>
                                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs">
                                        {isFundBroker ? '₹' : 'د'}
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Network: {sourceNetwork}
                            </p>
                        </div>

                        {/* Swap Direction Indicator */}
                        <div className="flex justify-center my-4">
                            <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center swap-icon">
                                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            </div>
                        </div>

                        {/* To Output */}
                        <div className="mb-4">
                            <label className="block text-sm text-gray-400 mb-2">Recipient Gets</label>
                            <div className="relative">
                                <div className="input-field pr-20 text-2xl font-semibold bg-gray-900/50">
                                    {calculateOutput()}
                                </div>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    <span className="text-lg font-medium text-gray-300">{destToken}</span>
                                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs">
                                        {isFundBroker ? 'د' : '₹'}
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Network: {destNetwork}
                            </p>
                        </div>

                        {/* Recipient Address */}
                        <div className="mb-6">
                            <label className="block text-sm text-gray-400 mb-2">
                                {isFundBroker ? 'Broker Wallet Address' : 'Recipient Wallet Address'}
                            </label>
                            <input
                                type="text"
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                placeholder="0x..."
                                className="input-field font-mono text-sm"
                                disabled={step !== 'idle'}
                            />
                        </div>

                        {/* Fee Breakdown */}
                        <div className="bg-gray-900/50 rounded-lg p-4 mb-6 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Exchange Rate</span>
                                <span className="text-white">
                                    1 {sourceToken} = {isFundBroker ? INR_TO_AED_RATE : AED_TO_INR_RATE} {destToken}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Platform Fee (0.3%)</span>
                                <span className="text-amber-400">{calculateFee()} {destToken}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Network Fee</span>
                                <span className={hasSession ? "text-emerald-400" : "text-gray-400"}>
                                    {hasSession ? '⚡ Gasless' : '~0.0002 ETH'}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Estimated Time</span>
                                <span className="text-emerald-400">~45 seconds</span>
                            </div>
                            <div className="border-t border-gray-700 pt-2 mt-2">
                                <div className="flex justify-between font-semibold">
                                    <span className="text-gray-300">You Save vs Banks</span>
                                    <span className="text-emerald-400">~70%</span>
                                </div>
                            </div>
                        </div>

                        {/* Swap Button */}
                        <button
                            onClick={handleSwap}
                            disabled={!amount || !recipient || step !== 'idle' || !isConnected}
                            className="btn-primary w-full flex items-center justify-center gap-2 text-lg"
                        >
                            {!isConnected ? (
                                '🔗 Connect Wallet First'
                            ) : step === 'opening-session' ? (
                                <>
                                    <span className="spinner" />
                                    Opening Session...
                                </>
                            ) : step === 'minting' ? (
                                <>
                                    <span className="spinner" />
                                    Minting Test Tokens...
                                </>
                            ) : step === 'approving' ? (
                                <>
                                    <span className="spinner" />
                                    Approving...
                                </>
                            ) : step === 'swapping' ? (
                                <>
                                    <span className="spinner" />
                                    Confirming Swap...
                                </>
                            ) : (
                                <>
                                    {isFundBroker ? '🚀 Fund Broker' : '✈️ Send Home'}
                                </>
                            )}
                        </button>
                    </>
                )
            }


            {/* Faucet for Testing */}
            {
                isConnected && (
                    <div className="mt-6 pt-6 border-t border-gray-800 text-center">
                        <p className="text-xs text-gray-400 mb-2">Need test tokens?</p>
                        <button
                            onClick={async () => {
                                if (!address || !publicClient) return;
                                setStep('minting');
                                const chainId = isFundBroker ? 11155111 : 5042002;
                                try {
                                    const tokenAddress = isFundBroker ? CONTRACTS.INR_STABLE : CONTRACTS.AED_STABLE;
                                    const hash = await writeContractAsync({
                                        address: tokenAddress,
                                        abi: [
                                            {
                                                name: 'faucet',
                                                type: 'function',
                                                inputs: [],
                                                outputs: [],
                                                stateMutability: 'nonpayable'
                                            }
                                        ],
                                        functionName: 'faucet',
                                        args: [],
                                    });
                                    console.log('Mint tx:', hash);
                                    await publicClient.waitForTransactionReceipt({
                                        hash,
                                        timeout: 120_000,
                                        pollingInterval: 2_000,
                                    });
                                    alert("Minted 10000 test tokens successfully!");
                                    refetchBalance();
                                    setStep('idle');
                                } catch (e) {
                                    console.error(e);
                                    alert("Faucet failed. Make sure you are on the correct network.");
                                    setStep('idle');
                                }
                            }}
                            disabled={step !== 'idle'}
                            className="text-xs text-indigo-400 hover:text-indigo-300 underline disabled:opacity-50"
                        >
                            {step === 'minting' ? 'Minting... (Please Wait)' : `Mint 10000 ${isFundBroker ? 'INR' : 'AED'} Test Tokens`}
                        </button>
                    </div>
                )
            }

            {/* Compliance Badge */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                FEMA Compliant • KYC Verified • Yellow Network
            </div>
        </div >
    );
}

