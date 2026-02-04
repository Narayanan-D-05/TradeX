'use client';

export function NetworkFlow() {
    return (
        <div className="glass-card p-6 w-full">
            <h3 className="text-lg font-semibold mb-4 text-center">Cross-Chain Flow</h3>

            <div className="flex items-center justify-between gap-4">
                {/* India Side */}
                <div className="flex-1 text-center">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-orange-500/20">
                        🇮🇳
                    </div>
                    <p className="font-semibold text-white">India</p>
                    <p className="text-xs text-gray-400 mt-1">Ethereum Sepolia</p>
                    <div className="network-badge mumbai mt-2 inline-flex">
                        INR-stable
                    </div>
                </div>

                {/* Arrow + TradeX */}
                <div className="flex-1 flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-px w-8 bg-gradient-to-r from-orange-500 to-indigo-500" />
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            🌉
                        </div>
                        <div className="h-px w-8 bg-gradient-to-r from-indigo-500 to-emerald-500" />
                    </div>
                    <p className="text-sm font-semibold gradient-text">TradeX</p>
                    <p className="text-xs text-gray-400">LI.FI + Yellow</p>
                    <div className="mt-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                        45s • 0.3% fee
                    </div>
                </div>

                {/* UAE Side */}
                <div className="flex-1 text-center">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/20">
                        🇦🇪
                    </div>
                    <p className="font-semibold text-white">UAE</p>
                    <p className="text-xs text-gray-400 mt-1">Arc Testnet</p>
                    <div className="network-badge arc mt-2 inline-flex">
                        AED-stable
                    </div>
                </div>
            </div>

            {/* Comparison */}
            <div className="mt-6 pt-4 border-t border-gray-700/50">
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                        <p className="text-gray-400">Banks</p>
                        <p className="text-red-400 font-medium">3 days • 2.5%</p>
                    </div>
                    <div>
                        <p className="text-gray-400">Binance P2P</p>
                        <p className="text-amber-400 font-medium">30 min • 2-3%</p>
                    </div>
                    <div>
                        <p className="text-gray-400">TradeX</p>
                        <p className="text-emerald-400 font-medium">45s • 0.3%</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
