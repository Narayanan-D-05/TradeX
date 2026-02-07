'use client';

import { SwapCard } from "@/components/SwapCard";
import { WalletButton } from "@/components/WalletButton";
import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";

export default function Home() {
  const [mode, setMode] = useState<'fundBroker' | 'sendHome'>('fundBroker');
  const { chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();

  const requiredChainId = mode === 'fundBroker' ? 11155111 : 5042002;
  const targetNetworkName = mode === 'fundBroker' ? 'Sepolia' : 'Arc Testnet';
  const isWrongNetwork = isConnected && chainId !== requiredChainId;

  return (
    <main className="min-h-screen bg-[#0a0b0f] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800/50">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-xl font-bold">
              🌉
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">TradeX</h1>
              <p className="text-xs text-gray-500">Gasless Remittance Protocol</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="/" className="text-sm text-yellow-400 font-medium hover:text-yellow-300 transition flex items-center gap-1.5">
              ⚡ Yellow Swaps
            </a>
            <a href="/ens" className="text-sm text-blue-400 font-medium hover:text-blue-300 transition flex items-center gap-1.5">
              🏷️ ENS Demo
            </a>
            <a href="/circle" className="text-sm text-gray-400 hover:text-white transition">
              🔵 Circle Gateway
            </a>
            <a href="#" className="text-sm text-gray-400 hover:text-white transition">Stats</a>
            <a href="#" className="text-sm text-gray-400 hover:text-white transition">Docs</a>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Network Badge / Switcher */}
          {isConnected && (
            isWrongNetwork ? (
              <button
                onClick={async () => {
                  try {
                    await switchChain({ chainId: requiredChainId });
                  } catch (err) {
                    console.error('Failed to switch network:', err);
                    alert('Failed to switch network. Please try manually in your wallet.');
                  }
                }}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500 rounded-full hover:bg-red-500/20 transition cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span className="text-sm text-red-300 font-semibold">Switch to {targetNetworkName}</span>
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-sm text-emerald-300">{targetNetworkName}</span>
              </div>
            )
          )}
          <WalletButton />
        </div>
      </header>

      {/* Yellow Network Hero Banner */}
      <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 border-y border-yellow-500/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-center gap-3 text-center">
            <span className="text-2xl">⚡</span>
            <div>
              <span className="text-yellow-400 font-bold">Powered by Yellow Network</span>
              <span className="text-gray-400 mx-2">•</span>
              <span className="text-gray-300 text-sm">Zero Gas Fees • Instant Settlement • ERC-7824 Nitrolite</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-gray-900/50 border border-gray-800 rounded-xl p-1">
            <button
              onClick={() => setMode('fundBroker')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${mode === 'fundBroker'
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                : 'text-gray-400 hover:text-white'
                }`}
            >
              🏦 Fund Broker
            </button>
            <button
              onClick={() => setMode('sendHome')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${mode === 'sendHome'
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                : 'text-gray-400 hover:text-white'
                }`}
            >
              🏠 Send Home
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Swap Card */}
          <div>
            <SwapCard mode={mode} />
          </div>

          {/* Right: Info Panels */}
          <div className="space-y-6">
            {/* Cross-Chain Flow */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-6 text-center">Cross-Chain Flow</h3>

              {/* Flow Diagram */}
              <div className="flex items-center justify-between mb-8">
                {/* India */}
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center text-2xl font-bold mx-auto mb-2">
                    IN
                  </div>
                  <p className="font-medium text-white">India</p>
                  <p className="text-xs text-gray-500">Ethereum Sepolia</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-xs">
                    INR stable
                  </span>
                </div>

                {/* Arrow + TradeX */}
                <div className="flex-1 flex flex-col items-center px-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-2">
                    <span className="text-lg">⚡</span>
                  </div>
                  <p className="text-sm font-medium text-green-400">TradeX</p>
                  <p className="text-xs text-gray-500">🦄 Uniswap + 🌟 Yellow + 🔵 Circle + 🏷️ ENS</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs border border-green-500/30">
                    2s • $0 gas • Human-readable
                  </span>
                </div>

                {/* UAE */}
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center text-2xl font-bold mx-auto mb-2">
                    AE
                  </div>
                  <p className="font-medium text-white">UAE</p>
                  <p className="text-xs text-gray-500">Arc Testnet</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-xs">
                    AED stable
                  </span>
                </div>
              </div>

              {/* Comparison */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-gray-800/50 rounded-xl">
                  <p className="text-sm text-gray-400 mb-1">Banks</p>
                  <p className="text-red-400 font-semibold">3 days • 2.5%</p>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-xl">
                  <p className="text-sm text-gray-400 mb-1">Binance P2P</p>
                  <p className="text-yellow-400 font-semibold">30 min • 2-3%</p>
                </div>
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <p className="text-sm text-gray-400 mb-1">TradeX</p>
                  <p className="text-green-400 font-semibold">2s • $0 gas</p>
                </div>
              </div>
            </div>

            {/* Use Cases */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Use Cases</h3>

              <div className="space-y-4">
                {/* Raj */}
                <div className="flex items-start gap-4 p-4 bg-gray-800/30 rounded-xl hover:bg-gray-800/50 transition">
                  <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-lg">
                    📊
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Raj - Stock Investor</h4>
                    <p className="text-sm text-gray-400">Fund DFM/ADX broker with ₹10L → 446K AED in 2s, $0 gas ⚡</p>
                  </div>
                </div>

                {/* Priya */}
                <div className="flex items-start gap-4 p-4 bg-gray-800/30 rounded-xl hover:bg-gray-800/50 transition">
                  <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center text-lg">
                    🏠
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Priya - UAE Expat</h4>
                    <p className="text-sm text-gray-400">Send AED 5K home → ₹1.1L to family in 2s, gasless 💚</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Technology Stack */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Powered By</h3>
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 bg-yellow-500/10 text-yellow-400 rounded-lg text-sm border border-yellow-500/20 font-medium">
                  🟡 Yellow Network
                </span>
                <span className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg text-sm border border-blue-500/20 font-medium">
                  🔵 Circle/Arc
                </span>
                <span className="px-4 py-2 bg-purple-500/10 text-purple-400 rounded-lg text-sm border border-purple-500/20 font-medium">
                  🦄 Uniswap V4
                </span>
                <span className="px-4 py-2 bg-sky-500/10 text-sky-400 rounded-lg text-sm border border-sky-500/20 font-medium">
                  🏷️ ENS
                </span>
                <span className="px-4 py-2 bg-gray-500/10 text-gray-400 rounded-lg text-sm border border-gray-500/20">
                  Ethereum
                </span>
              </div>
            </div>

            {/* Yellow Network Integration Showcase */}
            <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-2xl p-6 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">⚡</span>
                <h3 className="text-lg font-semibold text-white">Yellow Network: Gasless & Instant</h3>
              </div>
              <p className="text-gray-300 text-sm mb-4">
                Trade and transfer with <span className="text-yellow-400 font-bold">zero gas fees</span> using state channel technology. Instant settlements powered by the Nitrolite protocol.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                {/* Feature 1: Zero Gas */}
                <div className="bg-black/30 rounded-lg p-4 border border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">💰</span>
                    <div className="text-yellow-400 font-semibold">Zero Gas Fees</div>
                  </div>
                  <p className="text-xs text-gray-400">
                    All transactions happen off-chain in state channels. No gas fees, no waiting for confirmations.
                  </p>
                </div>

                {/* Feature 2: Instant Settlement */}
                <div className="bg-black/30 rounded-lg p-4 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">⚡</span>
                    <div className="text-amber-400 font-semibold">Instant Settlement</div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Payments settle in milliseconds using Layer 2 clearing. Perfect for remittances and cross-border transfers.
                  </p>
                </div>

                {/* Feature 3: Secure */}
                <div className="bg-black/30 rounded-lg p-4 border border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🔐</span>
                    <div className="text-yellow-400 font-semibold">Nitrolite Security</div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Funds secured by ERC-7824 Nitrolite protocol. Withdraw to L1 anytime with cryptographic guarantees.
                  </p>
                </div>

                {/* Feature 4: Multi-Asset */}
                <div className="bg-black/30 rounded-lg p-4 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🌐</span>
                    <div className="text-amber-400 font-semibold">Multi-Asset Support</div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Support for any ERC-20 token. Open state channels, trade, and close anytime with on-chain settlement.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-emerald-400">✓</span>
                  <span>Integrated with Nitrolite SDK v0.5.3</span>
                </div>
                <a 
                  href="/" 
                  className="text-yellow-400 hover:text-yellow-300 font-medium"
                >
                  Try Gasless Swaps →
                </a>
              </div>
            </div>

            {/* ENS Integration Showcase */}
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-6 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🏷️</span>
                <h3 className="text-lg font-semibold text-white">ENS: Human-Readable Addresses</h3>
              </div>
              <p className="text-gray-300 text-sm mb-4">
                Send payments to <span className="text-blue-400 font-medium">vitalik.eth</span> instead of <span className="text-gray-500 font-mono text-xs">0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045</span>
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-black/30 rounded-lg p-4 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold">
                      V
                    </div>
                    <div>
                      <div className="text-white font-medium">vitalik.eth</div>
                      <div className="text-xs text-gray-400">Ethereum Foundation</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 font-mono break-all">
                    0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
                  </div>
                </div>

                <div className="bg-black/30 rounded-lg p-4 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                      N
                    </div>
                    <div>
                      <div className="text-white font-medium">nick.eth</div>
                      <div className="text-xs text-gray-400">ENS Lead Developer</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 font-mono break-all">
                    0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-emerald-400">✓</span>
                  <span>Automatically resolves ENS names</span>
                </div>
                <a 
                  href="https://ens.domains" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Learn more →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Comparison Section */}
        <div className="mt-16 mb-8">
          <h2 className="text-2xl font-bold text-center text-white mb-8">Why TradeX Beats the Competition</h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="p-4 text-left text-gray-400 font-medium">Platform</th>
                  <th className="p-4 text-left text-gray-400 font-medium">Time</th>
                  <th className="p-4 text-left text-gray-400 font-medium">Fee</th>
                  <th className="p-4 text-left text-gray-400 font-medium">Risk</th>
                  <th className="p-4 text-left text-gray-400 font-medium">Trust Model</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-green-500/5 border-b border-green-500/20">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      <span className="font-semibold text-white">TradeX</span>
                    </div>
                  </td>
                  <td className="p-4 text-green-400 font-semibold">45 seconds</td>
                  <td className="p-4 text-green-400 font-semibold">0.3% flat</td>
                  <td className="p-4 text-green-400">Zero (Atomic)</td>
                  <td className="p-4 text-green-400">Trustless (HTLC)</td>
                </tr>
                <tr className="border-b border-gray-800 hover:bg-gray-900/50">
                  <td className="p-4 text-gray-300">Binance P2P</td>
                  <td className="p-4 text-yellow-400">15-30 min</td>
                  <td className="p-4 text-yellow-400">2-3% spread</td>
                  <td className="p-4 text-yellow-500">Medium (Escrow)</td>
                  <td className="p-4 text-gray-400">Centralized</td>
                </tr>
                <tr className="border-b border-gray-800 hover:bg-gray-900/50">
                  <td className="p-4 text-gray-300">SWIFT / Banks</td>
                  <td className="p-4 text-red-400">3-5 days</td>
                  <td className="p-4 text-red-400">2.5% + fees</td>
                  <td className="p-4 text-red-400">High (Fraud)</td>
                  <td className="p-4 text-gray-400">Centralized</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          <div className="text-center p-6 bg-gray-900/50 border border-gray-800 rounded-2xl">
            <div className="text-3xl font-bold text-blue-500 mb-1">$100B</div>
            <div className="text-sm text-gray-400">Annual Corridor</div>
          </div>
          <div className="text-center p-6 bg-gray-900/50 border border-gray-800 rounded-2xl">
            <div className="text-3xl font-bold text-green-500 mb-1">45s</div>
            <div className="text-sm text-gray-400">Settlement</div>
          </div>
          <div className="text-center p-6 bg-gray-900/50 border border-gray-800 rounded-2xl">
            <div className="text-3xl font-bold text-purple-500 mb-1">70%</div>
            <div className="text-sm text-gray-400">Cheaper</div>
          </div>
          <div className="text-center p-6 bg-gray-900/50 border border-gray-800 rounded-2xl">
            <div className="text-3xl font-bold text-yellow-500 mb-1">Zero</div>
            <div className="text-sm text-gray-400">Slippage</div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-800 pt-8 pb-4 text-center">
          <p className="text-gray-500 text-sm">
            Built with ❤️ for <span className="text-blue-400">HackMoney 2026</span>
          </p>
          <p className="text-gray-600 text-xs mt-2">
            ⚠️ Testnet Only - DO NOT use with real funds
          </p>
        </footer>
      </div>
    </main>
  );
}
