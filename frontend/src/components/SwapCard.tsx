'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useSwitchChain, useSignTypedData, usePublicClient } from 'wagmi';
import { parseEther, parseUnits, formatEther, encodeFunctionData } from 'viem';

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

    const { address, isConnected, chainId } = useAccount();
    const { writeContractAsync } = useWriteContract();
    const { signTypedDataAsync } = useSignTypedData();
    const publicClient = usePublicClient();
    const { switchChainAsync } = useSwitchChain();

    // Check if user has active Yellow session
    const { data: hasSession } = useReadContract({
        address: CONTRACTS.YELLOW_ADAPTER,
        abi: YELLOW_ABI,
        functionName: 'isSessionActive',
        args: address ? [address] : undefined,
    });

    const { data: sessionBalance } = useReadContract({
        address: CONTRACTS.YELLOW_ADAPTER,
        abi: YELLOW_ABI,
        functionName: 'getSessionBalance',
        args: address ? [address] : undefined,
    });

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
        if (!isConnected) return;

        setStep('opening-session');

        // Ensure strictly on Sepolia for Yellow Gasless demo
        const isCorrectNetwork = await ensureNetwork(11155111);
        if (!isCorrectNetwork) return;

        try {
            // Open session with 0.01 ETH deposit (min requirement) for ~20 gasless transactions
            const hash = await writeContractAsync({
                address: CONTRACTS.YELLOW_ADAPTER,
                abi: YELLOW_ABI,
                functionName: 'openSession',
                args: [BigInt(3600)], // 1 hour session
                value: parseEther('0.05'), // Match contract minDeposit
            });
            console.log('Session opened:', hash);
            setStep('idle');
        } catch (error: any) {
            console.error('Failed to open session:', error);
            // For Demo: If gasless fails (e.g. insufficient funds for deposit), allow proceeding without gasless
            setErrorMsg('Gasless session failed, but you can proceed with standard gas.');
            setTimeout(() => {
                setErrorMsg(null);
                setStep('idle');
                setUseGasless(false); // Fallback to standard gas
            }, 3000);
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
        const isCorrectNetwork = await ensureNetwork(targetChainId);
        if (!isCorrectNetwork) return;

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

            if (useGasless && hasSession) {
                // YELLOW GASLESS FLOW
                console.log("Preparing Gasless Transaction...");

                // 1. Get Nonce
                const sessionData = await publicClient.readContract({
                    address: CONTRACTS.YELLOW_ADAPTER,
                    abi: YELLOW_ABI,
                    functionName: 'sessions',
                    args: [address]
                }) as any; // Cast to any because wagmi return types can be array or object

                // Assuming sessionData is array [user, deposit, spent, nonce, ...] based on ABI order
                // Need to verify if it returns object or array. Usually array for struct mapping.
                // Safest to access by index if array, or check structure.
                // 0n is falsy, so we must use nullish coalescing (??) instead of OR (||)
                const userNonce = sessionData.nonce ?? sessionData[3];
                console.log('Session Nonce:', userNonce);

                // 2. Prepare Zap Request
                const zapRequest = {
                    tokenIn: tokenAddress,
                    tokenOut: tokenOut,
                    amountIn: amountInWei,
                    minAmountOut: (amountInWei * BigInt(97)) / BigInt(100), // 3% slippage
                    destinationChainId: destinationChainId,
                    recipient: recipient as `0x${string}`,
                    lifiData: "0x" as `0x${string}`
                };

                // 3. Encode Function Call
                const encodedData = encodeFunctionData({
                    abi: LIFI_ABI,
                    functionName: 'executeZapGasless',
                    args: [zapRequest, address]
                });

                // 4. Create MetaTransaction
                const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
                const metaTx = {
                    to: CONTRACTS.LIFI_ROUTER,
                    value: BigInt(0),
                    data: encodedData,
                    nonce: userNonce,
                    deadline: deadline
                };

                // 5. Sign Typed Data
                const signature = await signTypedDataAsync({
                    domain: {
                        name: "TradeX Yellow Adapter",
                        version: "1",
                        chainId: chainId,
                        verifyingContract: CONTRACTS.YELLOW_ADAPTER
                    },
                    types: {
                        MetaTransaction: [
                            { name: 'to', type: 'address' },
                            { name: 'value', type: 'uint256' },
                            { name: 'data', type: 'bytes' },
                            { name: 'nonce', type: 'uint256' },
                            { name: 'deadline', type: 'uint256' }
                        ]
                    },
                    primaryType: 'MetaTransaction',
                    message: metaTx
                });

                console.log("Signature obtained:", signature);

                // 6. Relayer Submission (Simulated by User)
                // In production, send `metaTx` and `signature` to Relayer API
                swapHash = await writeContractAsync({
                    address: CONTRACTS.YELLOW_ADAPTER,
                    abi: YELLOW_ABI,
                    functionName: 'executeGasless',
                    args: [address, metaTx, signature],
                    gas: BigInt(500000)
                });

            } else {
                // STANDARD GAS FLOW
                if (isFundBroker) {
                    swapHash = await writeContractAsync({
                        address: CONTRACTS.LIFI_ROUTER,
                        abi: LIFI_ABI,
                        functionName: 'zapToArc',
                        args: [tokenAddress, tokenOut, amountInWei, recipient as `0x${string}`],
                        gas: BigInt(500000),
                    });
                } else {
                    swapHash = await writeContractAsync({
                        address: CONTRACTS.LIFI_ROUTER,
                        abi: LIFI_ABI,
                        functionName: 'zapToSepolia',
                        args: [tokenAddress, tokenOut, amountInWei, recipient as `0x${string}`],
                        gas: BigInt(500000),
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

            {/* Yellow Session Status */}
            {useGasless && isConnected && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-yellow-400">⚡</span>
                            <span className="text-sm text-yellow-200">Yellow Gasless</span>
                        </div>
                        {hasSession ? (
                            <span className="text-xs text-emerald-400">
                                Session Active • {sessionBalance ? formatEther(sessionBalance as bigint) : '0'} ETH
                            </span>
                        ) : (
                            <button
                                onClick={openYellowSession}
                                disabled={step !== 'idle'}
                                className="text-xs px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 rounded text-yellow-300"
                            >
                                Open Session (0.05 ETH)
                            </button>
                        )}
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
                    {txHash && (
                        <a
                            href={`https://sepolia.etherscan.io/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-indigo-400 hover:underline break-all"
                        >
                            View on Etherscan →
                        </a>
                    )}
                    <button onClick={resetState} className="mt-4 btn-primary w-full">
                        Make Another Swap
                    </button>
                </div>
            )}

            {/* Error State */}
            {step === 'error' && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <div className="flex items-center gap-2 text-red-400 mb-2">
                        <span className="font-bold">❌ Transaction Failed</span>
                    </div>
                    <p className="text-sm text-gray-300">{errorMsg}</p>
                    <button onClick={resetState} className="mt-4 btn-primary w-full">
                        Try Again
                    </button>
                </div>
            )}

            {/* Form */}
            {step !== 'success' && step !== 'error' && (
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
            )}


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

