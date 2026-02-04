'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { SwapCard } from '@/components/SwapCard';
import { StatsGrid } from '@/components/StatsGrid';
import { NetworkFlow } from '@/components/NetworkFlow';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'fundBroker' | 'sendHome'>('fundBroker');
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSwap, setLastSwap] = useState<{ amount: string; recipient: string } | null>(null);

  const handleSwap = (amount: string, recipient: string) => {
    setLastSwap({ amount, recipient });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 5000);
  };

  return (
    <main className="min-h-screen grid-bg">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-glow" />
            <span className="text-sm text-indigo-300">HackMoney 2026 • Testnet Live</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="gradient-text">INR-AED Atomic Bridge</span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            45-second swaps for India&apos;s $100B UAE trade corridor.
            <br />
            <span className="text-emerald-400 font-medium">0.3% fees vs 2.5% banks.</span>
          </p>

          {/* Quick Stats */}
          <div className="flex items-center justify-center gap-8 mb-12">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">45s</p>
              <p className="text-sm text-gray-400">Settlement</p>
            </div>
            <div className="w-px h-12 bg-gray-700" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">0.3%</p>
              <p className="text-sm text-gray-400">Platform Fee</p>
            </div>
            <div className="w-px h-12 bg-gray-700" />
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-400">70%</p>
              <p className="text-sm text-gray-400">Savings</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <StatsGrid />
        </div>
      </section>

      {/* Swap Section */}
      <section id="swap" className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Swap Card */}
            <div className="flex flex-col items-center">
              {/* Tab Switcher */}
              <div className="flex items-center gap-2 p-1 bg-gray-800/50 rounded-xl mb-6">
                <button
                  onClick={() => setActiveTab('fundBroker')}
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'fundBroker'
                    ? 'bg-indigo-500 text-white'
                    : 'text-gray-400 hover:text-white'
                    }`}
                >
                  🏦 Fund Broker
                </button>
                <button
                  onClick={() => setActiveTab('sendHome')}
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'sendHome'
                    ? 'bg-indigo-500 text-white'
                    : 'text-gray-400 hover:text-white'
                    }`}
                >
                  🏠 Send Home
                </button>
              </div>

              <SwapCard mode={activeTab} onSwap={handleSwap} />

              {/* Success Message */}
              {showSuccess && lastSwap && (
                <div className="mt-4 p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-center success-animation">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-emerald-400 font-semibold">Swap Successful!</p>
                  <p className="text-sm text-gray-300 mt-1">
                    {lastSwap.amount} {activeTab === 'fundBroker' ? 'INR' : 'AED'} sent to{' '}
                    <span className="font-mono">{lastSwap.recipient.slice(0, 6)}...{lastSwap.recipient.slice(-4)}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Network Flow Visualization */}
            <div className="flex flex-col gap-6">
              <NetworkFlow />

              {/* Use Cases */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4">Use Cases</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                      📈
                    </div>
                    <div>
                      <p className="font-medium text-white">Raj - Stock Investor</p>
                      <p className="text-sm text-gray-400">
                        Fund DFM/ADX broker with ₹10L → 446K AED in 45s
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      🏠
                    </div>
                    <div>
                      <p className="font-medium text-white">Priya - UAE Expat</p>
                      <p className="text-sm text-gray-400">
                        Send AED 5K home → ₹1.1L to family in 20s
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sponsors Section */}
      <section className="py-12 px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-500 mb-6">Built with sponsor technologies</p>
          <div className="flex items-center justify-center gap-12">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">🔵</span>
              </div>
              <p className="text-sm text-gray-400">Arc</p>
              <p className="text-xs text-gray-500">USDC Hub</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">🔗</span>
              </div>
              <p className="text-sm text-gray-400">LI.FI</p>
              <p className="text-xs text-gray-500">Cross-Chain</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">⚡</span>
              </div>
              <p className="text-sm text-gray-400">Yellow</p>
              <p className="text-xs text-gray-500">Gasless</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌉</span>
            <span className="font-bold gradient-text">TradeX</span>
            <span className="text-gray-500">|</span>
            <span className="text-sm text-gray-500">HackMoney 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
            <a href="#" className="hover:text-white transition-colors">Docs</a>
            <a href="#" className="hover:text-white transition-colors">Discord</a>
          </div>
          <p className="text-xs text-gray-500">
            Testnet Only • Not Financial Advice
          </p>
        </div>
      </footer>
    </main>
  );
}
