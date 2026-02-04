'use client';

import { useAccount, useConnect, useDisconnect, useChainId } from 'wagmi';
import { sepolia } from 'wagmi/chains';

export function Header() {
    const { address, isConnected } = useAccount();
    const { connect, connectors, isPending } = useConnect();
    const { disconnect } = useDisconnect();
    const chainId = useChainId();

    const handleConnect = () => {
        const injectedConnector = connectors.find(c => c.id === 'injected');
        if (injectedConnector) {
            connect({ connector: injectedConnector });
        }
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 glass-card rounded-none border-t-0 border-x-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                            <span className="text-xl font-bold">🌉</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold gradient-text">TradeX</h1>
                            <p className="text-xs text-gray-400">INR-AED Atomic Bridge</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        <a href="#swap" className="text-sm text-gray-300 hover:text-white transition-colors">
                            Swap
                        </a>
                        <a href="#stats" className="text-sm text-gray-300 hover:text-white transition-colors">
                            Stats
                        </a>
                        <a href="#docs" className="text-sm text-gray-300 hover:text-white transition-colors">
                            Docs
                        </a>
                    </nav>

                    {/* Connect Wallet */}
                    <div className="flex items-center gap-4">
                        {/* Network Status */}
                        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-glow" />
                            {chainId === sepolia.id ? 'Sepolia' : 'Testnet'}
                        </div>

                        {isConnected && address ? (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-sm font-mono">
                                        {address.slice(0, 6)}...{address.slice(-4)}
                                    </span>
                                </div>
                                <button
                                    onClick={() => disconnect()}
                                    className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-red-600 transition-colors text-sm"
                                >
                                    Disconnect
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleConnect}
                                disabled={isPending}
                                className="btn-primary"
                            >
                                {isPending ? 'Connecting...' : '🦊 Connect MetaMask'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
