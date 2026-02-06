'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useSwitchChain } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { circleGateway, TradeXCircleIntegration } from '@/lib/circleGateway';

/**
 * Circle Gateway Integration Component for TradeX
 * 
 * Features Circle Tools:
 * - USDC as primary cross-chain token
 * - Circle Gateway API integration
 * - Arc network support
 * - Cross-chain messaging
 */

interface CircleSwapCardProps {
  mode: 'fundBroker' | 'sendHome';
}

const CIRCLE_ABI = [
  {
    name: 'initiateCircleTransfer',
    type: 'function',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'destinationChain', type: 'uint256' }
    ],
    outputs: [{ name: 'transferId', type: 'bytes32' }]
  },
  {
    name: 'convertINRtoUSDC',
    type: 'function',
    inputs: [{ name: 'inrAmount', type: 'uint256' }],
    outputs: [{ name: 'usdcAmount', type: 'uint256' }]
  },
  {
    name: 'convertUSDCtoAED',
    type: 'function',
    inputs: [{ name: 'usdcAmount', type: 'uint256' }],
    outputs: [{ name: 'aedAmount', type: 'uint256' }]
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
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  }
] as const;

// Circle-enhanced contract addresses
const CIRCLE_CONTRACTS = {
  CIRCLE_ARC_GATEWAY: process.env.NEXT_PUBLIC_CIRCLE_ARC_GATEWAY || '0xFc79e0140D37fB855e93B5485A1288E08c0689ce' as `0x${string}`,
  INR_STABLE: process.env.NEXT_PUBLIC_INR_STABLE || '0x836879FAFF6d2ce51412A0ebf7E428e9cb87cD41' as `0x${string}`,
  AED_STABLE: process.env.NEXT_PUBLIC_AED_STABLE || '0x56abb7f9Fcf60892b044a2b590cD46B8B87C2E3c' as `0x${string}`,
  USDC: process.env.NEXT_PUBLIC_USDC || '0xF8C377FA64E5d3De1BDf4e3030fF0D2766f2f85b' as `0x${string}`,
};

const CHAIN_CONFIGS = {
  sepolia: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    currency: 'INR',
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/your-key'
  },
  arc: {
    chainId: 111551119, // Hypothetical Arc testnet ID
    name: 'Arc Testnet', 
    currency: 'AED',
    rpcUrl: 'https://rpc.testnet.arc.network'
  }
};

export function CircleSwapCard({ mode }: CircleSwapCardProps) {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [step, setStep] = useState<'idle' | 'converting' | 'bridging' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [circleTransferId, setCircleTransferId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [estimatedOutput, setEstimatedOutput] = useState<string>('0');
  const [bridgeFees, setBridgeFees] = useState<{ network: string; bridge: string; total: string } | null>(null);
  
  const { address, isConnected, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

  const isFundBroker = mode === 'fundBroker';
  const sourceChain = isFundBroker ? 'sepolia' : 'arc';
  const destChain = isFundBroker ? 'arc' : 'sepolia';
  const sourceCurrency = isFundBroker ? 'INR' : 'AED';
  const destCurrency = isFundBroker ? 'AED' : 'INR';

  // Fetch token balance
  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    address: isFundBroker ? CIRCLE_CONTRACTS.INR_STABLE : CIRCLE_CONTRACTS.AED_STABLE,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Initialize Circle Gateway
  useEffect(() => {
    const initCircle = async () => {
      try {
        const initialized = await circleGateway.initialize();
        if (initialized) {
          console.log('🟢 Circle Gateway initialized successfully');
        } else {
          console.warn('🟡 Circle Gateway initialization failed - using demo mode');
        }
      } catch (error) {
        console.error('❌ Circle Gateway error:', error);
      }
    };

    initCircle();
  }, []);

  // Calculate output amount and fees
  useEffect(() => {
    const calculateOutput = async () => {
      if (!amount || isNaN(parseFloat(amount))) {
        setEstimatedOutput('0');
        setBridgeFees(null);
        return;
      }

      try {
        // Calculate conversion rates
        let usdcAmount: number;
        let outputAmount: number;
        
        if (isFundBroker) {
          // INR → USDC → AED
          const inrToUsdRate = 0.012; // 1 INR ≈ $0.012
          usdcAmount = parseFloat(amount) * inrToUsdRate;
          
          const usdToAedRate = 3.67; // 1 USD ≈ 3.67 AED
          outputAmount = usdcAmount * usdToAedRate;
        } else {
          // AED → USDC → INR
          const aedToUsdRate = 0.272; // 1 AED ≈ $0.272
          usdcAmount = parseFloat(amount) * aedToUsdRate;
          
          const usdToInrRate = 83.33; // 1 USD ≈ ₹83.33
          outputAmount = usdcAmount * usdToInrRate;
        }

        setEstimatedOutput(outputAmount.toFixed(2));

        // Estimate Circle Gateway fees
        const fees = await circleGateway.estimateFees({
          amount: usdcAmount.toFixed(6),
          fromChain: CHAIN_CONFIGS[sourceChain].chainId,
          toChain: CHAIN_CONFIGS[destChain].chainId,
          recipient: recipient || '0x0000000000000000000000000000000000000000',
          sourceToken: CIRCLE_CONTRACTS.USDC,
          destinationToken: CIRCLE_CONTRACTS.USDC
        });

        setBridgeFees(fees);
      } catch (error) {
        console.error('Fee calculation failed:', error);
      }
    };

    calculateOutput();
  }, [amount, isFundBroker, recipient, sourceChain, destChain]);

  const handleSwap = async () => {
    if (!isConnected || !address) {
      setErrorMsg('Please connect your wallet');
      return;
    }

    if (!amount || !recipient) {
      setErrorMsg('Please enter amount and recipient address');
      return;
    }

    try {
      setStep('converting');
      setErrorMsg(null);

      console.log('🚀 Initiating Circle Gateway Swap');
      console.log(`   Mode: ${sourceCurrency} → ${destCurrency}`);
      console.log(`   Amount: ${amount}`);
      console.log(`   Recipient: ${recipient}`);

      // Ensure correct network
      const targetChainId = CHAIN_CONFIGS[sourceChain].chainId;
      if (chainId !== targetChainId) {
        await switchChainAsync({ chainId: targetChainId });
      }

      let result;
      
      if (isFundBroker) {
        // INR → AED via Circle Gateway
        result = await TradeXCircleIntegration.swapINRtoAED(amount, recipient, address);
      } else {
        // AED → INR via Circle Gateway
        result = await TradeXCircleIntegration.swapAEDtoINR(amount, recipient, address);
      }

      if (result.success) {
        setStep('bridging');
        setCircleTransferId(result.transactionId || null);
        
        // Simulate waiting for Circle Gateway completion
        setTimeout(() => {
          setStep('success');
          console.log('✅ Circle Gateway transfer completed!');
        }, 8000);
        
      } else {
        throw new Error(result.error || 'Transfer failed');
      }

    } catch (error) {
      console.error('Swap failed:', error);
      setErrorMsg(error instanceof Error ? error.message : 'Unknown error occurred');
      setStep('error');
    }
  };

  const resetForm = () => {
    setAmount('');
    setRecipient('');
    setStep('idle');
    setTxHash(null);
    setCircleTransferId(null);
    setErrorMsg(null);
    refetchBalance();
  };

  const handleMaxClick = () => {
    if (tokenBalance) {
      setAmount(formatUnits(tokenBalance as bigint, 6));
    }
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
          🔵
        </div>
        <div>
          <h3 className="text-white font-semibold">
            {isFundBroker ? 'Fund DFM Broker' : 'Send Money Home'}
          </h3>
          <p className="text-gray-400 text-sm">
            Via Circle Gateway • {sourceCurrency} → {destCurrency}
          </p>
        </div>
      </div>

      {/* Circle Tools Badge */}
      <div className="mb-4 p-3 bg-blue-900/30 rounded-lg border border-blue-700/50">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
          <span className="text-blue-300 text-sm font-medium">Circle Gateway Integration</span>
        </div>
        <div className="text-xs text-blue-200">
          ✓ USDC cross-chain transfers • ✓ Arc network • ✓ Programmable wallets
        </div>
      </div>

      {/* Amount Input */}
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <label className="block text-sm text-gray-400">You Send</label>
            {isConnected && (
              <div className="text-xs flex gap-2 items-center">
                <span className="text-gray-500">
                  Balance: {tokenBalance ? parseFloat(formatUnits(tokenBalance as bigint, 6)).toFixed(2) : '0'} {sourceCurrency}
                </span>
                <button
                  onClick={handleMaxClick}
                  className="text-blue-400 hover:text-blue-300 uppercase font-semibold"
                >
                  MAX
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={step !== 'idle'}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-lg focus:border-blue-500 focus:outline-none disabled:opacity-50"
            />
            <div className="absolute right-3 top-3 text-gray-400 font-medium">
              {sourceCurrency}
            </div>
          </div>
        </div>

        {/* Conversion Display */}
        {parseFloat(estimatedOutput) > 0 && (
          <div className="bg-gray-800 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Estimated Output:</span>
              <span className="text-white font-medium">{estimatedOutput} {destCurrency}</span>
            </div>
            {bridgeFees && (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Network Fee:</span>
                  <span>{bridgeFees.network} USDC</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Bridge Fee:</span>
                  <span>{bridgeFees.bridge} USDC</span>
                </div>
                <div className="flex justify-between text-gray-400 border-t border-gray-700 pt-1">
                  <span>Total Fees:</span>
                  <span>{bridgeFees.total} USDC</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recipient Input */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            disabled={step !== 'idle'}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none disabled:opacity-50"
          />
        </div>

        {/* Network Info */}
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Bridge Route:</span>
            <span className="text-white">
              {CHAIN_CONFIGS[sourceChain].name} → {CHAIN_CONFIGS[destChain].name}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="text-gray-400">Via Circle Gateway:</span>
            <span className="text-blue-400">USDC Cross-Chain</span>
          </div>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-3">
            <p className="text-red-300 text-sm">{errorMsg}</p>
          </div>
        )}

        {/* Circle Transfer ID */}
        {circleTransferId && (
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
            <p className="text-blue-300 text-sm">
              Circle Transfer ID: <span className="font-mono">{circleTransferId}</span>
            </p>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={step === 'success' || step === 'error' ? resetForm : handleSwap}
          disabled={step === 'converting' || step === 'bridging'}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:opacity-50 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
        >
          {step === 'idle' && `Bridge ${sourceCurrency} → ${destCurrency}`}
          {step === 'converting' && 'Converting to USDC...'}
          {step === 'bridging' && 'Circle Gateway Processing...'}
          {step === 'success' && '✅ Transfer Completed • New Swap'}
          {step === 'error' && '❌ Failed • Try Again'}
        </button>

        {/* Progress Indicator */}
        {(step === 'converting' || step === 'bridging') && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Progress</span>
              <span>{step === 'converting' ? '1/2' : '2/2'}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: step === 'converting' ? '50%' : '100%' }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 text-center">
              {step === 'converting' && 'Converting stablecoin to USDC...'}
              {step === 'bridging' && 'Circle Gateway executing cross-chain transfer...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}