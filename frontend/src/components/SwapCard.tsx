'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useSwitchChain, useSignTypedData, usePublicClient, useEnsName, useEnsAddress } from 'wagmi';
import { parseEther, parseUnits, formatEther, formatUnits, encodeFunctionData, isAddress } from 'viem';
import { useYellowNetwork } from '@/hooks/useYellowNetwork';
import { useContacts } from '@/hooks/useContacts';
import { ENSProfile } from '@/components/ENSProfile';
import { getSwapQuote, checkPoolExists, TOKENS, getINRAEDPool, UNISWAP_V4_CONTRACTS, TRADEX_V4_ROUTER_ABI, getV4SwapParams, V4_POOL_TX } from '@/lib/uniswapV4Service';
import { captureFixingRate, recordSettlement, getProtocolStats, createAttestation, PRISM_CONSTANTS, type PRISMFixingRate, type PRISMAttestation } from '@/lib/prismService';
import { PRISM_HOOK_CONFIG, PRISM_HOOK_ABI, formatAttestationForSubmit, isPRISMHookDeployed, getAttestationTxLink, getPoolKey } from '@/lib/prismHookService';

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

// Contract addresses (newly deployed - 6 decimal INR/AED)
// Contract addresses (Loaded from Env)
const CONTRACTS = {
    TRADEX: (process.env.NEXT_PUBLIC_TRADEX || '0x3c3fbdAfD1796f3DeDC0C34F51bfd905a494247a') as `0x${string}`,
    INR_STABLE: (process.env.NEXT_PUBLIC_INR_STABLE || '0xC6DADFdf4c046D0A91946351A0aceee261DcA517') as `0x${string}`,
    AED_STABLE: (process.env.NEXT_PUBLIC_AED_STABLE || '0x05016024652D0c947E5B49532e4287374720d3b2') as `0x${string}`,
    YELLOW_ADAPTER: (process.env.NEXT_PUBLIC_YELLOW_ADAPTER || '0x2Bc0b16e923Da8D3fc557fF6cF13be061Af3744D') as `0x${string}`,
    UNISWAP_ROUTER: UNISWAP_V4_CONTRACTS.UniversalRouter,
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
    const [swapMode, setSwapMode] = useState<'gasless'>('gasless');
    const [isV4Tx, setIsV4Tx] = useState(false); // Track if current success tx is V4
    const [uniswapQuote, setUniswapQuote] = useState<{ amountOut: string; amountOutRaw: bigint; exchangeRate: string; gasEstimate: bigint; error?: string; } | null>(null);
    const [loadingQuote, setLoadingQuote] = useState(false);
    const [prismFixing, setPrismFixing] = useState<PRISMFixingRate | null>(null);
    const [prismEpoch, setPrismEpoch] = useState(0);
    const [prismAttestation, setPrismAttestation] = useState<PRISMAttestation | null>(null);
    const [showContacts, setShowContacts] = useState(false);
    const [attestationTxHash, setAttestationTxHash] = useState<string | null>(null);
    const [isSubmittingAttestation, setIsSubmittingAttestation] = useState(false);

    // Contacts hook
    const { contacts, getRecentContacts, markContactUsed } = useContacts();

    const { address, isConnected, chainId } = useAccount();
    const { writeContractAsync } = useWriteContract();
    const { signTypedDataAsync } = useSignTypedData();
    const publicClient = usePublicClient();
    const { switchChainAsync } = useSwitchChain();

    // Yellow Network SDK Integration
    const yellow = useYellowNetwork();

    // ENS Resolution
    const isEnsName = recipient.includes('.eth');
    const { data: resolvedAddress } = useEnsAddress({
        name: isEnsName ? recipient : undefined,
        chainId: 1, // ENS is on mainnet, but also works on Sepolia
    });
    const { data: ensName } = useEnsName({
        address: (!isEnsName && isAddress(recipient)) ? (recipient as `0x${string}`) : undefined,
        chainId: 1,
    });

    // Final recipient address (resolved from ENS or direct address)
    const finalRecipient = isEnsName ? (resolvedAddress || recipient) : recipient;

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
    const sourceNetwork = isFundBroker ? 'Ethereum Sepolia' : 'Base Sepolia';
    const destNetwork = isFundBroker ? 'Base Sepolia' : 'Ethereum Sepolia';

    const sourceTokenAddress = isFundBroker ? CONTRACTS.INR_STABLE : CONTRACTS.AED_STABLE;

    // Fetch Uniswap quote when amount changes
    useEffect(() => {
        async function fetchUniswapQuote() {
            if (!amount || parseFloat(amount) <= 0) {
                setUniswapQuote(null);
                return;
            }

            try {
                setLoadingQuote(true);
                const poolKey = getINRAEDPool();
                const tokenIn = isFundBroker ? TOKENS.INR_STABLE : TOKENS.AED_STABLE;
                const tokenOut = isFundBroker ? TOKENS.AED_STABLE : TOKENS.INR_STABLE;

                const quote = await getSwapQuote(poolKey, tokenIn, tokenOut, amount, 6);
                setUniswapQuote(quote);
            } catch (error) {
                console.error('Failed to fetch Uniswap quote:', error);
                setUniswapQuote(null);
            } finally {
                setLoadingQuote(false);
            }
        }

        fetchUniswapQuote();
    }, [amount, isFundBroker]);

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

        // Validate ENS resolution if using ENS name
        if (isEnsName && !resolvedAddress) {
            setErrorMsg('ENS name could not be resolved. Please check the name or use a direct address.');
            setStep('error');
            return;
        }

        setStep('approving');
        setErrorMsg(null);
        setTxHash(null);

        // Determine chain based on mode
        const targetChainId = isFundBroker ? 11155111 : 84532; // Sepolia or Base Sepolia

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
            const amountInWei = parseUnits(amount, 6);
            const tokenAddress = isFundBroker ? CONTRACTS.INR_STABLE : CONTRACTS.AED_STABLE;

            // Pre-validation: Check if user has enough tokens
            if (tokenBalance && amountInWei > (tokenBalance as bigint)) {
                setErrorMsg(`Insufficient ${sourceToken} balance. You have ${formatUnits(tokenBalance as bigint, 6)} but trying to swap ${amount}.`);
                setStep('error');
                return;
            }

            // Step 1: Token Approval (ONLY for standard LI.FI flow, NOT for Yellow Network)
            // Yellow Network uses off-chain state channels and doesn't need Uniswap contract approval
            if (!useGasless || !yellow.isReady) {
                // Standard Uniswap V4 flow requires approval
                setStep('approving');

                // Check existing allowance - skip approval if already sufficient
                const currentAllowance = await publicClient.readContract({
                    address: tokenAddress,
                    abi: ERC20_ABI,
                    functionName: 'allowance',
                    args: [address, CONTRACTS.UNISWAP_ROUTER],
                }) as bigint;

                console.log('Current allowance:', currentAllowance.toString());

                if (currentAllowance < amountInWei) {
                    // Need to approve - use exact amount
                    console.log('Approving tokens for Uniswap V4...');
                    const approveHash = await writeContractAsync({
                        address: tokenAddress,
                        abi: ERC20_ABI,
                        functionName: 'approve',
                        args: [CONTRACTS.UNISWAP_ROUTER, amountInWei],
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
            } else {
                // Yellow Network gasless mode - NO approval needed!
                console.log('⚡ Yellow Network mode: Skipping approval (state channels don\'t need it)');
            }

            // Step 2: Execute cross-chain swap
            setStep('swapping');
            console.log('Executing swap...');

            let swapHash;
            const tokenOut = isFundBroker ? CONTRACTS.AED_STABLE : CONTRACTS.INR_STABLE;
            const destinationChainId = isFundBroker ? BigInt(84532) : BigInt(11155111);

            if (useGasless && yellow.isReady) {
                // ====== UNIFIED: UNISWAP V4 PRICING + YELLOW NETWORK SETTLEMENT ======
                // Step 1: Uniswap V4 pegs the exchange rate (INR→AED or AED→INR)
                // Step 2: Yellow Network transfers the pegged amount gaslessly
                // Step 3: Recipient receives the converted currency
                console.log("� PRISM FLOW: Price Ray → Settlement Ray → Attestation");
                console.log("   Session state:", yellow.session.state);
                console.log("   Session ID:", yellow.sessionId);

                // ===== PRISM STEP 1: Capture Fixing Rate (Price Ray) =====
                console.log("🔷 PRISM Step 1: Capturing fixing rate from V4 pool...");
                const fixing = await captureFixingRate();
                if (fixing) {
                    setPrismFixing(fixing);
                    setPrismEpoch(fixing.epoch);
                    console.log(`🔷 PRISM Fixing Rate #${fixing.epoch}: 1 AED = ${fixing.rateScaled} INR (source: ${fixing.source})`);
                }

                // Get Uniswap V4 exchange rate for pegging
                let peggedAmount = amountInWei.toString();
                let exchangeRateUsed = isFundBroker ? INR_TO_AED_RATE.toString() : AED_TO_INR_RATE.toString();
                let priceSource = 'oracle';

                if (uniswapQuote && !uniswapQuote.error && parseFloat(uniswapQuote.exchangeRate) > 0) {
                    // Use Uniswap V4 live price for pegging
                    peggedAmount = uniswapQuote.amountOutRaw.toString();
                    exchangeRateUsed = uniswapQuote.exchangeRate;
                    priceSource = 'uniswap_v4';
                    console.log("🔷 PRISM Price Ray: V4 pool rate", exchangeRateUsed);
                    console.log("🔷 Input:", amount, sourceToken, "→ Output:", uniswapQuote.amountOut, destToken);
                    console.log("🔷 Pegged amount (raw):", peggedAmount);
                } else {
                    // Fallback to oracle rate if V4 quote unavailable
                    const rate = isFundBroker ? INR_TO_AED_RATE : AED_TO_INR_RATE;
                    const outputAmount = parseFloat(amount) * rate * (1 - PLATFORM_FEE);
                    peggedAmount = parseUnits(outputAmount.toFixed(6), 6).toString();
                    console.log("📊 PRISM: Oracle fallback rate", rate);
                    console.log("📊 Input:", amount, sourceToken, "→ Output:", outputAmount.toFixed(6), destToken);
                }

                try {
                    // ===== PRISM STEP 2: Settlement Ray (Yellow Network) =====
                    console.log("🔷 PRISM Step 2: Settlement Ray via Yellow Network...");
                    console.log("   Amount (converted):", peggedAmount, destToken);
                    console.log("   Recipient:", recipient);
                    console.log("   Fixing Epoch:", fixing?.epoch ?? 'N/A');

                    await yellow.sendPayment(
                        peggedAmount,
                        recipient as `0x${string}`
                    );

                    console.log("✅ PRISM Settlement Ray confirmed (GASLESS!)");
                    console.log("   🔷 Price Ray: V4 pool (INR/AED on Base Sepolia)");
                    console.log("   🔷 Settlement Ray: Yellow Network state channels");

                    // ===== PRISM STEP 3: Record settlement & generate attestation =====
                    if (fixing) {
                        const settlement = recordSettlement(
                            address as `0x${string}`,
                            recipient as `0x${string}`,
                            amountInWei,
                            BigInt(peggedAmount),
                            sourceToken,
                            destToken,
                            fixing
                        );
                        console.log(`🔷 PRISM Settlement recorded: ${settlement.id}`);

                        // Create attestation (generates merkle root)
                        const attestation = createAttestation(fixing.epoch);
                        if (attestation) {
                            setPrismAttestation(attestation);
                            console.log(`🔷 PRISM Attestation: ${attestation.attestationId.slice(0, 18)}...`);
                            console.log(`   Merkle Root: ${attestation.merkleRoot.slice(0, 18)}...`);
                            
                            // Auto-submit attestation to PRISMHook (single tx)
                            (async () => {
                                if (!isPRISMHookDeployed()) {
                                    console.log('⚠️ PRISMHook not deployed - skipping on-chain submission');
                                    return;
                                }
                                
                                try {
                                    setIsSubmittingAttestation(true);
                                    const attestData = formatAttestationForSubmit(attestation);
                                    const poolKey = getPoolKey();
                                    
                                    // Switch to Base Sepolia if needed
                                    if (chainId !== PRISM_HOOK_CONFIG.chainId) {
                                        console.log(`🔄 Switching to Base Sepolia (current: ${chainId})...`);
                                        await switchChainAsync({ chainId: PRISM_HOOK_CONFIG.chainId });
                                        console.log('✅ Switched to Base Sepolia');
                                    }
                                    
                                    // Single tx: captureAndAttest — captures fixing rate + submits attestation
                                    console.log('🔗 Submitting PRISM attestation (captureAndAttest)...');
                                    const hash = await writeContractAsync({
                                        address: PRISM_HOOK_CONFIG.address,
                                        abi: PRISM_HOOK_ABI,
                                        functionName: 'captureAndAttest',
                                        args: [
                                            poolKey,
                                            attestData.merkleRoot,
                                            attestData.settlementCount,
                                            attestData.totalVolume,
                                        ],
                                        chainId: PRISM_HOOK_CONFIG.chainId,
                                    });
                                    
                                    setAttestationTxHash(hash);
                                    console.log('✅ Attestation submitted on-chain:', hash);
                                } catch (error) {
                                    console.error('❌ Failed to auto-submit attestation:', error);
                                } finally {
                                    setIsSubmittingAttestation(false);
                                }
                            })();
                        }

                        // Log protocol stats
                        const stats = getProtocolStats();
                        console.log(`🔷 PRISM Stats: Epoch #${stats.currentEpoch}, Settlements: ${stats.totalSettlements}, Volume: ${stats.totalVolumeProcessed}`);
                    }

                    // Build PRISM-branded result identifier
                    const epochRef = fixing ? fixing.epoch : 0;
                    swapHash = `prism-epoch${epochRef}-${Date.now()}` as `0x${string}`;

                    // Disable auto-reconnect after successful swap — prevents MetaMask auth loops
                    yellow.disableReconnect();

                    setStep('success');

                } catch (yellowError: any) {
                    console.error("Yellow SDK payment failed:", yellowError);
                    const errMsg = yellowError.message || 'Unknown error';
                    setErrorMsg(`Yellow Network payment failed: ${errMsg}. Please try again or check your Yellow Network balance.`);
                    setStep('error');
                    return;
                }

            } else if (useGasless && !yellow.isReady) {
                // Yellow enabled but not ready - prompt user
                setErrorMsg('Yellow Network session not ready. Click "Connect" in the Yellow Network section first, then try again.');
                setStep('error');
                return;
            } else {
                // STANDARD GAS FLOW (TradeX contract)
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
                        address: CONTRACTS.TRADEX,
                        abi: TRADEX_ABI,
                        functionName: 'fundBroker',
                        args: [amountInWei, finalRecipient as `0x${string}`],
                    });
                } else {
                    swapHash = await writeContractAsync({
                        address: CONTRACTS.TRADEX,
                        abi: TRADEX_ABI,
                        functionName: 'sendHome',
                        args: [amountInWei, finalRecipient as `0x${string}`],
                    });
                }
            }

            console.log('TradeX tx:', swapHash);
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
            setAmount(formatUnits(tokenBalance as bigint, 6));
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
        setIsV4Tx(false);
        setPrismAttestation(null);
        setAttestationTxHash(null);
        setIsSubmittingAttestation(false);
    };

    return (
        <div className="glass-card p-6 w-full max-w-md">
            {/* Mode Toggle - At Top */}
            {isConnected && (
                <div className="mb-6 flex items-center justify-center gap-1.5 p-1.5 bg-gray-800/50 rounded-lg border border-gray-700">
                    <button
                        onClick={() => { setSwapMode('gasless'); setUseGasless(true); }}
                        className={`flex-1 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${swapMode === 'gasless'
                            ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50 shadow-lg shadow-yellow-500/20'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <span>🔷</span>
                            <span>PRISM</span>
                        </div>
                        <div className="text-[10px] mt-0.5 opacity-70">V4 Fixing Rate • Gasless</div>
                    </button>
                </div>
            )}

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

            {/* Yellow Network SDK Status - Enhanced UI */}
            {useGasless && isConnected && (
                <div className="mb-4 p-4 bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-amber-500/10 border border-yellow-500/30 rounded-lg">
                    {/* Header with Authentication Status */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">⚡</span>
                            </div>
                            <span className="text-sm font-medium text-yellow-200">Yellow Network</span>
                            {yellow.session.environment && (
                                <span className="text-xs px-2 py-0.5 bg-gray-700/50 rounded text-gray-300 border border-gray-600">
                                    {yellow.session.environment}
                                </span>
                            )}
                        </div>
                        
                        {/* Authentication Icon with Green Tick */}
                        {yellow.session.state === 'authenticated' || yellow.session.state === 'session_ready' ? (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/20 rounded border border-emerald-500/30">
                                <span className="text-emerald-400 text-sm">✓</span>
                                <span className="text-emerald-300 text-xs font-medium">Authenticated</span>
                            </div>
                        ) : yellow.session.state === 'authenticating' ? (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/20 rounded border border-yellow-500/30 animate-pulse">
                                <span className="text-yellow-400 text-xs">🔐</span>
                                <span className="text-yellow-300 text-xs">Signing...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-500/20 rounded border border-gray-600">
                                <span className="text-gray-400 text-xs">○</span>
                                <span className="text-gray-400 text-xs">Not Authenticated</span>
                            </div>
                        )}
                    </div>

                    {/* State-based Content */}
                    {yellow.session.state === 'session_ready' ? (
                        /* CHANNEL IS ACTIVE - Show Channel Info */
                        <div className="space-y-3">
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-emerald-400 text-lg">✓</span>
                                    <span className="text-emerald-300 font-medium">Channel Active</span>
                                </div>
                                <p className="text-emerald-200/80 text-xs">Your Yellow Network state channel is open and ready for gasless transactions!</p>
                            </div>

                            {/* Channel On-Chain Transaction Hash */}
                            {(yellow.session.channelOpenHash || yellow.channelTxHash) && (
                                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                                    <span className="text-blue-400 text-xs font-medium block mb-2">🔗 Channel Creation TX Hash</span>
                                    <a
                                        href={`https://sepolia.etherscan.io/tx/${yellow.session.channelOpenHash || yellow.channelTxHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-300 hover:text-blue-200 hover:underline break-all font-mono text-xs block"
                                    >
                                        {(yellow.session.channelOpenHash || yellow.channelTxHash || '').slice(0, 20)}...{(yellow.session.channelOpenHash || yellow.channelTxHash || '').slice(-20)}
                                    </a>
                                    <p className="text-xs text-blue-400/60 mt-1.5">✓ Verified on Sepolia Etherscan</p>
                                </div>
                            )}

                            {/* Off-Chain Balance */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-2 bg-gray-800/50 rounded border border-gray-700">
                                    <span className="text-gray-400 text-xs block mb-1">Status</span>
                                    <span className="text-emerald-300 text-sm font-medium">Active</span>
                                </div>
                                <div className="p-2 bg-gray-800/50 rounded border border-gray-700">
                                    <span className="text-gray-400 text-xs block mb-1">Off-Chain Balance</span>
                                    <span className="text-emerald-300 font-mono text-sm">
                                        {yellow.session.balanceRaw
                                            ? `${(Number(yellow.session.balanceRaw) / Math.pow(10, yellow.session.balanceDecimals || 6)).toFixed(2)} ${yellow.session.balanceSymbol || 'TEST'}`
                                            : '0.00 TEST'}
                                    </span>
                                </div>
                            </div>

                            {/* Settlement Token Info */}
                            <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                                <p className="text-xs text-blue-300">
                                    ℹ️ <strong>Settlement Token:</strong> Yellow Network uses <code className="text-blue-200 bg-blue-900/30 px-1 rounded">ytest.usd</code> as the cross-chain settlement token. Swaps are executed gaslessly via state channels.
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        if (confirm('Close channel and withdraw funds back to your wallet on-chain? This will cost gas.')) {
                                            try {
                                                const txHash = await yellow.closeChannel();
                                                if (txHash) {
                                                    alert(`✅ Channel closed!\n\nTX: ${txHash}\n\nFunds withdrawn to your wallet.`);
                                                }
                                            } catch (error) {
                                                alert(`Failed to close channel: ${error instanceof Error ? error.message : String(error)}`);
                                            }
                                        }
                                    }}
                                    disabled={yellow.isLoading}
                                    className="flex-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 rounded text-red-300 text-xs font-medium border border-red-500/30 disabled:opacity-50 transition"
                                    title="Close channel and withdraw funds on-chain"
                                >
                                    {yellow.isLoading ? '⏳ Closing...' : '💰 Withdraw & Close'}
                                </button>
                                <button
                                    onClick={yellow.closeSession}
                                    className="px-3 py-2 bg-gray-500/20 hover:bg-gray-500/30 rounded text-gray-300 text-xs font-medium border border-gray-600 transition"
                                >
                                    Disconnect
                                </button>
                            </div>
                        </div>
                    ) : yellow.session.state === 'authenticated' ? (
                        /* AUTHENTICATED BUT NO CHANNEL - Show Create Channel Button */
                        <div className="space-y-3">
                            {/* Info Message */}
                            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                                <div className="flex items-start gap-2">
                                    <span className="text-blue-400">💡</span>
                                    <div>
                                        <p className="text-blue-300 text-sm font-medium mb-1">Ready to Create Channel</p>
                                        <p className="text-blue-400/80 text-xs">
                                            Create a state channel to enable instant, gasless transactions on Yellow Network.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Channel Creation Flow */}
                            {!yellow.hasPendingChannel && !yellow.channelTxHash ? (
                                /* Step 1: Request Channel via WebSocket */
                                <button
                                    onClick={async () => {
                                        await yellow.requestChannelCreation();
                                    }}
                                    disabled={yellow.isLoading}
                                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-all shadow-lg"
                                >
                                    {yellow.isLoading ? '⏳ Processing...' : '🚀 Create Channel'}
                                </button>
                            ) : yellow.hasPendingChannel ? (
                                /* Step 2: Submit to Blockchain */
                                <div className="space-y-2">
                                    <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300">
                                        <span className="font-medium">⚡ Channel Ready - </span>
                                        <span>Submit to blockchain for on-chain proof</span>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            await yellow.createChannelOnChain();
                                        }}
                                        disabled={yellow.isLoading}
                                        className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-all animate-pulse shadow-lg"
                                    >
                                        {yellow.isLoading ? '⏳ Submitting...' : '🔗 Submit to Blockchain'}
                                    </button>
                                </div>
                            ) : yellow.channelTxHash ? (
                                /* Channel Created - Show Transaction Hash */
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-emerald-400 text-lg">✓</span>
                                        <span className="text-emerald-300 font-medium">Channel Created!</span>
                                    </div>
                                    <div className="mb-2">
                                        <span className="text-emerald-400/80 text-xs block mb-1">Transaction Hash:</span>
                                        <a
                                            href={`https://sepolia.etherscan.io/tx/${yellow.channelTxHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-emerald-300 hover:text-emerald-200 hover:underline break-all font-mono text-xs block"
                                        >
                                            {yellow.channelTxHash}
                                        </a>
                                    </div>
                                    <p className="text-emerald-400/60 text-xs">✓ Verified on Sepolia - Check Etherscan for details</p>
                                </div>
                            ) : null}

                            <p className="text-xs text-gray-500 text-center">Powered by NitroliteClient SDK</p>
                        </div>
                    ) : yellow.session.state === 'authenticating' ? (
                        /* AUTHENTICATING STATE */
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                            <div className="flex items-center gap-2">
                                <span className="text-yellow-400 animate-pulse">🔐</span>
                                <span className="text-yellow-300 text-sm">Signing authentication...</span>
                                <span className="text-xs text-gray-400 ml-auto">(Check wallet)</span>
                            </div>
                        </div>
                    ) : yellow.session.state === 'connected' ? (
                        /* CONNECTED BUT NOT AUTHENTICATED - Show Authenticate Button */
                        <div className="space-y-3">
                            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                                <div className="flex items-start gap-2">
                                    <span className="text-blue-400">✓</span>
                                    <div>
                                        <p className="text-blue-300 text-sm font-medium mb-1">Connected to Yellow Network</p>
                                        <p className="text-blue-400/80 text-xs">
                                            Now authenticate to access gasless transactions
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={yellow.authenticate}
                                disabled={yellow.isLoading}
                                className="w-full px-4 py-3 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-all shadow-lg"
                            >
                                {yellow.isLoading ? '⏳ Authenticating...' : '🔐 Authenticate (Sign Message)'}
                            </button>
                        </div>
                    ) : yellow.session.state === 'connecting' ? (
                        /* CONNECTING STATE */
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                            <div className="flex items-center gap-2 justify-center">
                                <span className="text-yellow-400 animate-pulse">⚡</span>
                                <span className="text-yellow-300 text-sm">Connecting to Yellow Network...</span>
                            </div>
                        </div>
                    ) : yellow.session.state === 'error' ? (
                        /* ERROR STATE */
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-red-400">⚠</span>
                                    <span className="text-red-300 text-sm">
                                        {yellow.error?.slice(0, 40) || 'Connection Error'}...
                                    </span>
                                </div>
                                <button
                                    onClick={yellow.connect}
                                    className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-red-300 text-xs font-medium border border-red-500/30 transition"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* DISCONNECTED STATE - Show Connect Button */
                        <div className="space-y-3">
                            <div className="p-3 bg-gray-800/50 border border-gray-700 rounded">
                                <p className="text-gray-300 text-sm mb-2">Connect to Yellow Network for gasless transactions</p>
                                <button
                                    onClick={yellow.connect}
                                    disabled={yellow.isLoading}
                                    className="w-full px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 rounded text-yellow-300 text-sm font-medium border border-yellow-500/30 disabled:opacity-50 transition"
                                >
                                    {yellow.isLoading ? '⏳ Connecting...' : '⚡ Connect to Yellow Network'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-3 pt-2 border-t border-yellow-500/20 text-xs text-yellow-500/60 text-center">
                        Yellow Network • State Channel • @erc7824/nitrolite
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

                    {/* PRISM Settlement Success */}
                    {txHash?.startsWith('prism-') ? (
                        <div className="space-y-3">
                            {/* PRISM Badge */}
                            <div className="flex items-center gap-2">
                                <span className="text-xl">🔷</span>
                                <div>
                                    <span className="text-sm font-bold text-blue-300">PRISM</span>
                                    <span className="text-xs text-gray-400 ml-2">Price-Referenced Instant Settlement</span>
                                </div>
                            </div>

                            {/* Refracted Execution Pipeline */}
                            <div className="p-3 bg-gradient-to-r from-blue-500/10 via-yellow-500/10 to-emerald-500/10 border border-blue-500/30 rounded-lg">
                                <div className="text-[10px] text-gray-500 mb-2 text-center font-medium tracking-wide">REFRACTED EXECUTION</div>
                                <div className="flex items-center justify-between text-xs">
                                    <div className="text-center">
                                        <div className="text-blue-300 font-medium">🔷 Price Ray</div>
                                        <div className="text-blue-400/60 text-[10px]">V4 Fixing Rate</div>
                                        {prismFixing && (
                                            <div className="text-blue-200 text-[10px] font-mono mt-0.5">Epoch #{prismFixing.epoch}</div>
                                        )}
                                    </div>
                                    <div className="text-gray-600">→</div>
                                    <div className="text-center">
                                        <div className="text-yellow-300 font-medium">⚡ Settlement Ray</div>
                                        <div className="text-yellow-400/60 text-[10px]">Yellow Network</div>
                                        <div className="text-yellow-200 text-[10px] mt-0.5">Gasless</div>
                                    </div>
                                    <div className="text-gray-600">→</div>
                                    <div className="text-center">
                                        <div className="text-emerald-300 font-medium">✅ {destToken}</div>
                                        <div className="text-emerald-400/60 text-[10px]">Delivered</div>
                                    </div>
                                </div>
                            </div>

                            {/* PRISM Details */}
                            <div className="text-xs text-gray-400 space-y-1">
                                <p>🔷 <strong className="text-blue-300">Price Ray</strong>: Exchange rate fixed by Uniswap V4 pool (INR/AED) on Base Sepolia</p>
                                <p>⚡ <strong className="text-yellow-300">Settlement Ray</strong>: Transferred instantly & gaslessly via Yellow Network state channels</p>
                                <p>🔐 <strong className="text-emerald-300">Attestation</strong>: Merkle proof anchors settlement to on-chain V4 fixing rate</p>
                            </div>

                            {/* Merkle Attestation */}
                            {prismAttestation && (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-emerald-400">🔐</span>
                                        <span className="text-emerald-300 text-xs font-medium">Merkle Attestation</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-xs">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-gray-400">Merkle Root</span>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(prismAttestation.merkleRoot);
                                                        alert('Merkle Root copied to clipboard!');
                                                    }}
                                                    className="text-emerald-200 hover:text-emerald-100 font-mono text-[10px] transition-colors flex items-center gap-1"
                                                    title="Click to copy full hash"
                                                >
                                                    <span>{prismAttestation.merkleRoot.slice(0, 10)}...{prismAttestation.merkleRoot.slice(-6)}</span>
                                                    <span>📋</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-xs">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-gray-400">Attestation ID</span>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(prismAttestation.attestationId);
                                                        alert('Attestation ID copied to clipboard!');
                                                    }}
                                                    className="text-emerald-200 hover:text-emerald-100 font-mono text-[10px] transition-colors flex items-center gap-1"
                                                    title="Click to copy full hash"
                                                >
                                                    <span>{prismAttestation.attestationId.slice(0, 10)}...{prismAttestation.attestationId.slice(-6)}</span>
                                                    <span>📋</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-400">Settlements in batch</span>
                                            <span className="text-emerald-200">{prismAttestation.settlementCount}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-400">Fixing Epoch</span>
                                            <span className="text-emerald-200">#{prismAttestation.epoch}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-400">Volume</span>
                                            <span className="text-emerald-200">{(prismAttestation.totalVolume / 1e6).toFixed(2)} tokens</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-emerald-500/20 space-y-2">
                                        {isSubmittingAttestation ? (
                                            <div className="flex items-center justify-center gap-2 py-2 text-xs text-emerald-400">
                                                <span className="animate-spin">⏳</span>
                                                <span>Auto-submitting to PRISMHook...</span>
                                            </div>
                                        ) : !attestationTxHash ? (
                                            <div className="text-[10px] text-amber-400/80 flex items-start gap-1">
                                                <span>⚠️</span>
                                                <span>PRISMHook not deployed or submission pending</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-xs text-emerald-300">
                                                    <span>✅</span>
                                                    <span className="font-medium">Attestation Submitted On-Chain!</span>
                                                </div>
                                                <a
                                                    href={getAttestationTxLink(attestationTxHash)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block p-2 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs hover:bg-emerald-500/20 transition"
                                                >
                                                    <div className="text-emerald-400 mb-1">Transaction Hash:</div>
                                                    <div className="text-emerald-200 font-mono break-all">
                                                        {attestationTxHash.slice(0, 20)}...{attestationTxHash.slice(-18)}
                                                    </div>
                                                    <div className="text-emerald-400 mt-1 flex items-center gap-1">
                                                        <span>🔍</span>
                                                        <span>View on BaseScan →</span>
                                                    </div>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Fixing Rate Info */}
                            {prismFixing && (
                                <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-blue-400">Fixing Rate (Epoch #{prismFixing.epoch})</span>
                                        <span className="text-blue-200 font-mono">1 AED = {prismFixing.rateScaled} INR</span>
                                    </div>
                                    <div className="flex justify-between text-xs mt-1">
                                        <span className="text-blue-400">Source</span>
                                        <span className="text-blue-200">{prismFixing.source === 'v4_pool' ? '🔷 V4 Pool (on-chain)' : '📊 Oracle'}</span>
                                    </div>
                                </div>
                            )}

                            {/* On-chain Proof */}
                            <div className="space-y-2">
                                <div className="text-xs text-gray-500 font-medium">On-chain Proof (V4 Pool):</div>
                                <a
                                    href={`https://sepolia.basescan.org/tx/${V4_POOL_TX.init}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-blue-300 hover:bg-blue-500/20 transition-colors text-xs"
                                >
                                    <span>🔷</span>
                                    <span>Pool Init TX on BaseScan</span>
                                    <span className="ml-auto">→</span>
                                </a>
                                <a
                                    href={`https://sepolia.basescan.org/tx/${V4_POOL_TX.addLiquidity}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-blue-300 hover:bg-blue-500/20 transition-colors text-xs"
                                >
                                    <span>💧</span>
                                    <span>Liquidity TX on BaseScan</span>
                                    <span className="ml-auto">→</span>
                                </a>
                            </div>

                            {/* TradFi Analogy */}
                            <div className="p-2 bg-gray-800/50 border border-gray-700 rounded">
                                <div className="text-[10px] text-gray-500">
                                    💡 <em>Like TradFi's WM/Reuters FX Fixing — $6.6T/day of forex settles at benchmark rates without touching spot. PRISM is the decentralised equivalent.</em>
                                </div>
                            </div>

                            <div className="mt-2 p-2 bg-gray-800/50 rounded text-xs text-gray-500">
                                PRISM ID: {txHash}
                            </div>
                        </div>
                    ) : txHash?.startsWith('yellow-offchain') ? (
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
                            {isV4Tx ? (
                                <>
                                    {/* Uniswap V4 On-Chain Swap */}
                                    <a
                                        href={`https://sepolia.basescan.org/tx/${txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-500/30 transition-colors"
                                    >
                                        <span className="text-lg">🦄</span>
                                        <div>
                                            <div className="font-medium">View on BaseScan</div>
                                            <div className="text-xs text-purple-400/70">Uniswap V4 swap on Base Sepolia</div>
                                        </div>
                                        <span className="ml-auto">→</span>
                                    </a>
                                    <div className="p-2 bg-purple-500/10 rounded text-xs text-purple-300/80 space-y-1">
                                        <p>🦄 Swapped via <strong>TradeXV4Router</strong> on Uniswap V4</p>
                                        <p className="text-gray-500 font-mono break-all">{txHash}</p>
                                    </div>
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
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
                                            Balance: {tokenBalance ? parseFloat(formatUnits(tokenBalance as bigint, 6)).toFixed(2) : '0'} {sourceToken}
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
                                <span className="ml-2 text-xs text-blue-400">(Supports ENS names)</span>
                            </label>
                            <div className="relative z-30">
                                <input
                                    type="text"
                                    value={recipient}
                                    onChange={(e) => setRecipient(e.target.value)}
                                    onFocus={() => {
                                        if (contacts.length > 0) {
                                            setShowContacts(true);
                                        }
                                    }}
                                    placeholder="0x... or name.eth"
                                    className="input-field font-mono text-sm pr-20"
                                    disabled={step !== 'idle'}
                                />
                                {contacts.length > 0 && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowContacts(!showContacts);
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 hover:border-blue-500/50 rounded text-xs text-blue-300 hover:text-blue-200 flex items-center gap-1.5 transition-all"
                                        type="button"
                                    >
                                        <span>📇</span>
                                        <span className="font-medium">{contacts.length}</span>
                                    </button>
                                )}
                                
                                {/* Contacts Dropdown Menu */}
                                {showContacts && contacts.length > 0 && (
                                    <>
                                        {/* Backdrop to close on click outside */}
                                        <div 
                                            className="fixed inset-0 z-40" 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setShowContacts(false);
                                            }}
                                        />
                                        
                                        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-gray-800 border-2 border-blue-500/50 rounded-lg shadow-2xl shadow-blue-500/20 overflow-hidden">
                                            {/* Header */}
                                            <div className="px-3 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-b border-gray-700">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-blue-300">📇 Saved Contacts</span>
                                                    <span className="text-xs text-gray-400">{contacts.length} total</span>
                                                </div>
                                            </div>
                                            
                                            {/* Contacts List */}
                                            <div className="max-h-[300px] overflow-y-auto bg-gray-800">
                                                {getRecentContacts(10).map((contact) => (
                                                    <button
                                                        key={contact.id}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setRecipient(contact.address);
                                                            markContactUsed(contact.id);
                                                            setShowContacts(false);
                                                        }}
                                                        type="button"
                                                        className="w-full px-3 py-3 hover:bg-blue-500/10 border-b border-gray-700/50 last:border-0 text-left transition-colors group"
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">
                                                                    {contact.label}
                                                                </div>
                                                                <div className="text-xs text-gray-400 font-mono truncate">
                                                                    {contact.address.slice(0, 10)}...{contact.address.slice(-8)}
                                                                </div>
                                                                {contact.ensName && (
                                                                    <div className="text-xs text-purple-400 mt-0.5">
                                                                        {contact.ensName}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="text-blue-400 group-hover:text-blue-300 transition-colors text-lg">→</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                            
                                            {/* Footer */}
                                            {contacts.length > 10 && (
                                                <div className="px-3 py-2 bg-gray-900/80 border-t border-gray-700 text-center">
                                                    <a 
                                                        href="/contacts" 
                                                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowContacts(false);
                                                        }}
                                                    >
                                                        View all {contacts.length} contacts →
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            {/* ENS Resolution Display with Rich Profile */}
                            {(isEnsName || ensName) && recipient && (
                                <div className="mt-3">
                                    <ENSProfile 
                                        nameOrAddress={recipient} 
                                        compact={false}
                                    />
                                </div>
                            )}
                            {isEnsName && !resolvedAddress && (
                                <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-300 flex items-center gap-2">
                                    <span>⚠️</span>
                                    <span>ENS name not found or not yet resolved. Check spelling or try again.</span>
                                </div>
                            )}
                        </div>

                        {/* Fee Breakdown */}
                        <div className="bg-gray-900/50 rounded-lg p-4 mb-6 space-y-2">
                            {/* Uniswap Live Price (if available and valid) */}
                            {uniswapQuote && !uniswapQuote.error && parseFloat(uniswapQuote.exchangeRate) > 0 && (
                                <div className="mb-3 space-y-2">
                                    <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs text-purple-300 flex items-center gap-1">
                                                <span>🦄</span>
                                                <span>Uniswap V4 Live Price</span>
                                            </span>
                                            <span className="text-xs text-emerald-400">Real-time</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-purple-200">1 {sourceToken} =</span>
                                            <span className="text-white font-semibold">
                                                {parseFloat(uniswapQuote.exchangeRate).toFixed(6)} {destToken}
                                            </span>
                                        </div>
                                        <div className="text-xs text-purple-400/70 mt-1">
                                            You'll receive: {uniswapQuote.amountOut} {destToken}
                                        </div>
                                    </div>
                                    
                                    {/* V4 Pool Information */}
                                    <details className="text-xs">
                                        <summary className="cursor-pointer text-purple-300/70 hover:text-purple-300 transition px-2 py-1">
                                            📊 Pool Details
                                        </summary>
                                        <div className="mt-2 p-2 bg-gray-800/50 rounded space-y-2 text-gray-400">
                                            <div className="flex justify-between">
                                                <span>Pool:</span>
                                                <span className="text-purple-300">AED/INR (0.3%)</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Liquidity:</span>
                                                <span className="text-emerald-300">4.7B units</span>
                                            </div>
                                            <div className="border-t border-gray-700 pt-2 space-y-1">
                                                <div className="text-purple-300/80 font-medium mb-1">Transactions:</div>
                                                <div>
                                                    <span className="text-gray-500">Init: </span>
                                                    <a
                                                        href="https://sepolia.basescan.org/tx/0x4a3a5cbc38c17f4190ecdc86cccc932862f976febca4d87afa45a49c7eb00d55"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-purple-400 hover:text-purple-300 hover:underline break-all font-mono"
                                                    >
                                                        0x4a3a5c...
                                                    </a>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Add Liq: </span>
                                                    <a
                                                        href="https://sepolia.basescan.org/tx/0xd77f61aa513e6667a63cba1900d472bf45826d3982bbe3db6afc092bf82a385c"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-purple-400 hover:text-purple-300 hover:underline break-all font-mono"
                                                    >
                                                        0xd77f61...
                                                    </a>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500 pt-1 border-t border-gray-700">
                                                Deployed on Base Sepolia
                                            </div>
                                        </div>
                                    </details>
                                    
                                    {/* PRISM Refracted Execution Pipeline */}
                                    {useGasless && (
                                        <div className="p-2 bg-gradient-to-r from-blue-500/10 via-yellow-500/10 to-emerald-500/10 border border-blue-500/20 rounded">
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-blue-300">🔷 Price Ray</span>
                                                <span className="text-gray-500">→</span>
                                                <span className="text-yellow-300">⚡ Settlement Ray</span>
                                                <span className="text-gray-500">→</span>
                                                <span className="text-emerald-300">✅ {destToken}</span>
                                            </div>
                                            <div className="mt-1 text-[10px] text-gray-400">
                                                PRISM: V4 fixing rate • Yellow Network settles gaslessly
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {loadingQuote && (
                                <div className="mb-3 p-2 bg-purple-500/10 border border-purple-500/30 rounded">
                                    <span className="text-xs text-purple-300 flex items-center gap-2">
                                        <span className="animate-spin">⏳</span>
                                        <span>Fetching Uniswap V4 quote...</span>
                                    </span>
                                </div>
                            )}
                            {uniswapQuote?.error && (
                                <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                                    <div className="flex items-start gap-2">
                                        <span className="text-yellow-400 text-lg">🟡</span>
                                        <div>
                                            <div className="text-xs font-medium text-yellow-300 mb-1">Yellow Network Recommended</div>
                                            <div className="text-xs text-gray-300 mb-2">
                                                ⚡ <strong>Gasless swaps</strong> powered by Yellow Network state channels
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                V4 integration available on mainnet • Yellow Network ready now
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Exchange Rate (Oracle)</span>
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
                                <span className="text-emerald-400">~2 seconds</span>
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
                                    {swapMode === 'gasless'
                                        ? (isFundBroker ? '🔷 PRISM Swap (Gasless)' : '🔷 PRISM Swap (Gasless)')
                                        : (isFundBroker ? '🚀 Fund Broker' : '✈️ Send Home')
                                    }
                                </>
                            )}
                        </button>
                    </>
                )
            }


            {/* Faucet for Testing */}
            {
                isConnected && (
                    <div className="mt-6 pt-6 border-t border-gray-800">
                        <p className="text-xs text-gray-400 mb-3 text-center">Need test tokens?</p>
                        
                        <div className="space-y-2">
                            {/* INR/AED Token Faucet */}
                            <button
                                onClick={async () => {
                                    if (!address || !publicClient) return;
                                    setStep('minting');
                                    const chainId = isFundBroker ? 11155111 : 84532;
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
                                className="w-full px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 rounded text-indigo-300 text-xs font-medium border border-indigo-500/30 disabled:opacity-50 transition text-center"
                            >
                                {step === 'minting' ? '⏳ Minting... (Please Wait)' : `🪙 Mint 10000 ${isFundBroker ? 'INR' : 'AED'} Test Tokens`}
                            </button>

                            {/* Yellow Network Test Tokens */}
                            {useGasless && yellow.isConnected && (
                                <button
                                    onClick={yellow.requestTestTokens}
                                    disabled={yellow.isLoading || step !== 'idle'}
                                    className="w-full px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 rounded text-yellow-300 text-xs font-medium border border-yellow-500/30 disabled:opacity-50 transition text-center"
                                    title="Get ytest.usd tokens from Yellow Network faucet"
                                >
                                    {yellow.isLoading ? '⏳ Requesting...' : '⚡ Get Yellow Network Test Tokens'}
                                </button>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Compliance Badge */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                PRISM Protocol • FEMA Compliant • KYC Verified • Yellow Network
            </div>
        </div >
    );
}

