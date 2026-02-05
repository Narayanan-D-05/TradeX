'use client';

export function ProjectDetails() {
    return (
        <div className="w-full max-w-6xl mx-auto px-4 py-12 space-y-16">

            {/* Project Overview */}
            <div className="text-center space-y-4 max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-bold gradient-text">
                    TradeX - INR-AED Atomic Bridge
                </h1>
                <p className="text-xl text-gray-400">
                    45-second cross-chain swaps for India's $100B UAE trade corridor
                </p>
                <p className="text-gray-300 leading-relaxed">
                    TradeX is a <strong className="text-blue-400">cross-chain atomic swap protocol</strong> enabling instant INR↔AED currency swaps at <strong className="text-green-400">0.3% fees</strong> vs traditional banks (2.5% + 3 days wait). Built for two critical use cases serving millions of users in the India-UAE corridor.
                </p>
            </div>

            {/* Hero Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-2xl backdrop-blur-sm hover:border-blue-500/50 transition">
                    <div className="text-4xl font-bold text-blue-500 mb-2">45s</div>
                    <div className="text-gray-400">Settlement Time</div>
                    <div className="text-xs text-gray-600 mt-2">vs 3-5 days (banks)</div>
                </div>
                <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-2xl backdrop-blur-sm hover:border-green-500/50 transition">
                    <div className="text-4xl font-bold text-green-500 mb-2">0.3%</div>
                    <div className="text-gray-400">Flat Fee</div>
                    <div className="text-xs text-gray-600 mt-2">vs 2.5-5% (traditional)</div>
                </div>
                <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-2xl backdrop-blur-sm hover:border-purple-500/50 transition">
                    <div className="text-4xl font-bold text-purple-500 mb-2">Zero</div>
                    <div className="text-gray-400">Slippage & Risk</div>
                    <div className="text-xs text-gray-600 mt-2">Atomic guarantees</div>
                </div>
            </div>

            {/* Cross-Chain Flow */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-center mb-8 text-white">Cross-Chain Flow</h2>
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    {/* India Side */}
                    <div className="flex flex-col items-center text-center space-y-3 flex-1">
                        <div className="w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center text-3xl font-bold text-white">
                            IN
                        </div>
                        <div className="text-xl font-bold text-white">India</div>
                        <div className="text-sm text-gray-400">Ethereum Sepolia</div>
                        <div className="px-3 py-1 bg-purple-900/30 border border-purple-500 rounded-full text-xs text-purple-300">
                            INR-stable
                        </div>
                        <div className="space-y-1 text-xs text-gray-500">
                            <div className="text-red-400 font-semibold">Banks: 3 days • 2.5%</div>
                            <div className="text-yellow-400">Binance P2P: 30 min • 2-3%</div>
                            <div className="text-green-400 font-bold">TradeX: 45s • 0.3%</div>
                        </div>
                    </div>

                    {/* TradeX Protocol */}
                    <div className="flex flex-col items-center space-y-3 flex-1">
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center">
                            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div className="text-xl font-bold gradient-text">TradeX</div>
                        <div className="text-sm text-gray-400">LI.FI + Yellow</div>
                        <div className="text-xs text-green-400 font-mono font-semibold">
                            45s • 0.3% fee
                        </div>
                    </div>

                    {/* UAE Side */}
                    <div className="flex flex-col items-center text-center space-y-3 flex-1">
                        <div className="w-20 h-20 bg-teal-500 rounded-2xl flex items-center justify-center text-3xl font-bold text-white">
                            AE
                        </div>
                        <div className="text-xl font-bold text-white">UAE</div>
                        <div className="text-sm text-gray-400">Arc Testnet</div>
                        <div className="px-3 py-1 bg-blue-900/30 border border-blue-500 rounded-full text-xs text-blue-300">
                            AED-stable
                        </div>
                        <div className="space-y-1 text-xs text-gray-500">
                            <div className="text-red-400 font-semibold">Banks: 3 days • 2.5%</div>
                            <div className="text-yellow-400">Binance P2P: 30 min • 2-3%</div>
                            <div className="text-green-400 font-bold">TradeX: 45s • 0.3%</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Use Cases */}
            <div className="space-y-6">
                <h2 className="text-3xl font-bold text-center gradient-text">Use Cases</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Use Case 1 */}
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 transition space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-500/20 rounded-lg">
                                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Raj - Stock Investor</h3>
                                <p className="text-sm text-gray-500">Fund DFM/ADX broker</p>
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm">
                            Fund DFM/ADX broker with ₹10L → 446K AED in <strong className="text-green-400">45s</strong>
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-1 bg-green-900/30 border border-green-600 rounded text-green-400">
                                ✓ Instant brokerage funding
                            </span>
                            <span className="px-2 py-1 bg-blue-900/30 border border-blue-600 rounded text-blue-400">
                                ✓ FEMA compliant
                            </span>
                        </div>
                    </div>

                    {/* Use Case 2 */}
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 hover:border-purple-500/50 transition space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-500/20 rounded-lg">
                                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Priya - UAE Expat</h3>
                                <p className="text-sm text-gray-500">Send money home</p>
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm">
                            Send AED 5K home → ₹1.1L to family in <strong className="text-green-400">20s</strong>
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-1 bg-green-900/30 border border-green-600 rounded text-green-400">
                                ✓ Instant settlement
                            </span>
                            <span className="px-2 py-1 bg-purple-900/30 border border-purple-600 rounded text-purple-400">
                                ✓ Zero risk
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Comparison Table */}
            <div className="space-y-6">
                <h2 className="text-3xl font-bold text-center gradient-text">Why TradeX Beats the Competition</h2>
                <p className="text-center text-gray-400 max-w-3xl mx-auto">
                    Compare TradeX against traditional banks, Binance P2P, and SWIFT transfers. Our atomic swap protocol delivers unmatched speed, cost savings, and security.
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-800 text-gray-400 text-sm uppercase tracking-wider">
                                <th className="p-4">Platform</th>
                                <th className="p-4">Time</th>
                                <th className="p-4">Fee</th>
                                <th className="p-4">Risk</th>
                                <th className="p-4">Compliance</th>
                                <th className="p-4">Trust Model</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-300">
                            <tr className="bg-blue-500/10 border-b border-blue-500/20 font-semibold text-white">
                                <td className="p-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                    <strong>TradeX</strong>
                                </td>
                                <td className="p-4 text-green-400 font-bold">45 seconds</td>
                                <td className="p-4 text-green-400 font-bold">0.3% Flat</td>
                                <td className="p-4 text-green-400 font-bold">Zero (Atomic)</td>
                                <td className="p-4 text-blue-400">On-chain KYC</td>
                                <td className="p-4 text-purple-400">Trustless (HTLC)</td>
                            </tr>
                            <tr className="border-b border-gray-800 hover:bg-gray-800/30">
                                <td className="p-4">Binance P2P</td>
                                <td className="p-4 text-yellow-400">15-30 mins</td>
                                <td className="p-4 text-yellow-400">2-3% Spread</td>
                                <td className="p-4 text-yellow-500">Medium (Escrow)</td>
                                <td className="p-4">Self-reported</td>
                                <td className="p-4">Centralized escrow</td>
                            </tr>
                            <tr className="border-b border-gray-800 hover:bg-gray-800/30">
                                <td className="p-4">SWIFT / Banks</td>
                                <td className="p-4 text-red-400">3-5 Days</td>
                                <td className="p-4 text-red-400">2.5% + Fees</td>
                                <td className="p-4 text-red-400">High (Fraud)</td>
                                <td className="p-4">Heavy Paperwork</td>
                                <td className="p-4">Institution trust</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Detailed Comparison Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 space-y-3">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="text-2xl">⚡</span>
                            Speed Comparison
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">TradeX:</span>
                                <span className="text-green-400 font-bold">45 seconds</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Binance P2P:</span>
                                <span className="text-yellow-400">25-35 mins avg</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Banks:</span>
                                <span className="text-red-400">3-5 days</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-600 pt-2 border-t border-gray-800">
                            100% success rate with atomic guarantees
                        </p>
                    </div>

                    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 space-y-3">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="text-2xl">💰</span>
                            Cost Analysis
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">TradeX (₹1L):</span>
                                <span className="text-green-400 font-bold">₹300</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Binance P2P:</span>
                                <span className="text-yellow-400">₹2,000-3,000</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Banks:</span>
                                <span className="text-red-400">₹2,500+</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-600 pt-2 border-t border-gray-800">
                            70% cheaper than traditional methods
                        </p>
                    </div>

                    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 space-y-3">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="text-2xl">🔒</span>
                            Security Model
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-2">
                                <span className="text-green-400">✓</span>
                                <span className="text-gray-400">HTLC atomic guarantees</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-green-400">✓</span>
                                <span className="text-gray-400">Non-custodial (you own keys)</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-green-400">✓</span>
                                <span className="text-gray-400">Timelock refunds</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-600 pt-2 border-t border-gray-800">
                            Zero counterparty risk, always in control
                        </p>
                    </div>
                </div>
            </div>

            {/* Architecture Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                    <h2 className="text-3xl font-bold gradient-text">Powering the $100B Corridor</h2>
                    <p className="text-gray-400 leading-relaxed">
                        TradeX leverages a multi-chain architecture to enable instant INR-AED swaps.
                        By combining <strong className="text-blue-400">LI.FI's aggregation</strong> with <strong className="text-yellow-400">Yellow Network's gasless sessions</strong>,
                        we remove the friction of traditional cross-border finance.
                    </p>
                    
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-white">Key Technologies</h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <div className="mt-1 p-1 bg-green-500/20 rounded">
                                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-white">Atomic Settlement (HTLC)</h4>
                                    <p className="text-sm text-gray-500">Hash Time-Locked Contracts ensuring no counterparty risk, inspired by Bitcoin Lightning Network standards.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1 p-1 bg-yellow-500/20 rounded">
                                    <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-white">Gasless Transactions (ERC-7824)</h4>
                                    <p className="text-sm text-gray-500">Powered by Yellow Network, users don't pay gas fees for a seamless experience.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1 p-1 bg-blue-500/20 rounded">
                                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-white">Institutional Grade Compliance</h4>
                                    <p className="text-sm text-gray-500">FEMA & KYC compliant with on-chain attestations for brokerage funding.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1 p-1 bg-purple-500/20 rounded">
                                    <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-white">Cross-Chain Routing (LI.FI)</h4>
                                    <p className="text-sm text-gray-500">Seamlessly bridge assets across 15+ chains with optimal routing and liquidity.</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div className="pt-4">
                        <h3 className="text-xl font-semibold text-white mb-3">Standards Compliance</h3>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-blue-900/30 border border-blue-600 rounded-full text-xs text-blue-300">EIP-20</span>
                            <span className="px-3 py-1 bg-purple-900/30 border border-purple-600 rounded-full text-xs text-purple-300">EIP-712</span>
                            <span className="px-3 py-1 bg-green-900/30 border border-green-600 rounded-full text-xs text-green-300">EIP-1559</span>
                            <span className="px-3 py-1 bg-yellow-900/30 border border-yellow-600 rounded-full text-xs text-yellow-300">ERC-7824</span>
                            <span className="px-3 py-1 bg-pink-900/30 border border-pink-600 rounded-full text-xs text-pink-300">OpenZeppelin</span>
                            <span className="px-3 py-1 bg-orange-900/30 border border-orange-600 rounded-full text-xs text-orange-300">HTLC Standard</span>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 font-mono text-xs md:text-sm text-gray-400 overflow-x-auto shadow-2xl shadow-blue-900/20">
                    <div className="mb-2 text-gray-500"># TradeX Architecture Flow</div>
                    <pre className="text-[10px] md:text-xs">{`
┌──────────────────────────────────────────────────────────┐
│                   TradeX Protocol                        │
│                                                          │
│  ┌─────────────┐        ┌──────────────┐               │
│  │   Sepolia   │        │  LI.FI Zap   │               │
│  │   (India)   │───────▶│   Router     │               │
│  │  INR-stable │  INR   │              │               │
│  └─────────────┘        │  Settlement  │               │
│                         │   Service    │               │
│  ┌─────────────┐        │              │               │
│  │     Arc     │◀───────│              │               │
│  │    (UAE)    │  AED   └──────────────┘               │
│  │  AED-stable │                                       │
│  └─────────────┘                                       │
│                                                          │
│  Cross-Chain Bridge: 45 seconds • 0.3% fee             │
│  Atomic Guarantees: HTLC • Timelock Refunds            │
└──────────────────────────────────────────────────────────┘

Technologies Stack:
• Arc Network     → USDC Liquidity Hub & AED settlement
• LI.FI           → Cross-chain routing & aggregation
• Yellow Network  → Gasless sessions (ERC-7824)
• Ethereum        → Sepolia testnet for INR transactions
• Hardhat         → Smart contract development & testing
                    `}</pre>
                </div>
            </div>

            {/* Real-World Performance Section */}
            <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-800/50 rounded-2xl p-8 space-y-6">
                <h2 className="text-3xl font-bold text-center gradient-text">Real-World Performance</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* TradeX */}
                    <div className="bg-gray-900/50 border border-green-600 rounded-xl p-6 space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                            <h3 className="text-xl font-bold text-white">TradeX</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between border-b border-gray-800 pb-2">
                                <span className="text-gray-400">Scenario:</span>
                                <span className="text-white font-semibold">₹1L → AED</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Time:</span>
                                <span className="text-green-400 font-bold">45 seconds</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Fee:</span>
                                <span className="text-green-400 font-bold">₹300 (0.3%)</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Success Rate:</span>
                                <span className="text-green-400 font-bold">100%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Failed TX:</span>
                                <span className="text-blue-400">Auto-refund</span>
                            </div>
                        </div>
                    </div>

                    {/* Binance P2P */}
                    <div className="bg-gray-900/50 border border-yellow-600 rounded-xl p-6 space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <h3 className="text-xl font-bold text-white">Binance P2P</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between border-b border-gray-800 pb-2">
                                <span className="text-gray-400">Scenario:</span>
                                <span className="text-white font-semibold">₹1L → AED</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Best case:</span>
                                    <span className="text-yellow-400">15-20 min</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Average:</span>
                                    <span className="text-yellow-400">25-35 min</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Worst:</span>
                                    <span className="text-orange-400">1-2 hours</span>
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Fee:</span>
                                <span className="text-yellow-400">₹2,000-3,500</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Disputes:</span>
                                <span className="text-orange-400">1-2 days</span>
                            </div>
                        </div>
                    </div>

                    {/* Banks */}
                    <div className="bg-gray-900/50 border border-red-600 rounded-xl p-6 space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <h3 className="text-xl font-bold text-white">Banks (SWIFT)</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between border-b border-gray-800 pb-2">
                                <span className="text-gray-400">Scenario:</span>
                                <span className="text-white font-semibold">₹1L → AED</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Time:</span>
                                <span className="text-red-400 font-bold">3-5 days</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Fee:</span>
                                <span className="text-red-400 font-bold">₹2,500+</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Hidden costs:</span>
                                <span className="text-red-400">Spread + FX</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Paperwork:</span>
                                <span className="text-red-400">Heavy</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Risk:</span>
                                <span className="text-red-400">Wire fraud</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div className="text-center pt-6 border-t border-gray-800">
                    <p className="text-2xl font-bold gradient-text">
                        TradeX: <span className="text-green-400">70% cheaper</span> & <span className="text-blue-400">100x faster</span> than traditional methods
                    </p>
                </div>
            </div>

            {/* Sponsors */}
            <div className="pt-12 border-t border-gray-800">
                <p className="text-center text-gray-500 mb-8 uppercase tracking-widest text-sm">Powered By Industry Leaders</p>
                <div className="flex flex-wrap justify-center gap-12 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                    {/* Simple text placeholders for logos */}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg"></div>
                        <span className="text-xl font-bold font-sans">Arc</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-600 rounded-lg"></div>
                        <span className="text-xl font-bold font-sans">LI.FI</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-yellow-500 rounded-lg"></div>
                        <span className="text-xl font-bold font-sans">Yellow</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg"></div>
                        <span className="text-xl font-bold font-sans text-white">Ethereum</span>
                    </div>
                </div>
            </div>

        </div>
    );
}
