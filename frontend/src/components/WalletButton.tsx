'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState, useEffect } from 'react';

export function WalletButton() {
    const { address, isConnected } = useAccount();
    const { connect, connectors, isPending } = useConnect();
    const { disconnect } = useDisconnect();
    const [showDropdown, setShowDropdown] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Fix hydration mismatch - only render after client mount
    useEffect(() => {
        setMounted(true);
    }, []);

    // Return null on server/initial render to prevent hydration mismatch
    if (!mounted) {
        return <div className="w-[160px] h-[42px]" />;
    }

    const connectMetaMask = () => {
        const injectedConnector = connectors.find(c => c.id === 'injected');
        if (injectedConnector) {
            connect({ connector: injectedConnector });
        }
    };

    const handleDisconnect = () => {
        if (isConnected) {
            disconnect();
        }
        setShowDropdown(false);
    };

    // Connected state
    if (isConnected && address) {
        return (
            <div className="relative">
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition"
                >
                    <span className="text-sm">🦊</span>
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="font-mono text-white text-sm">
                        {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                </button>
                {showDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                        {/* Wallet Info */}
                        <div className="px-4 py-3 border-b border-gray-800">
                            <div className="flex items-center gap-2 text-sm">
                                <span>🦊</span>
                                <span className="text-gray-300">MetaMask</span>
                            </div>
                        </div>

                        {/* Disconnect */}
                        <button
                            onClick={handleDisconnect}
                            className="w-full text-left px-4 py-3 text-red-400 hover:bg-gray-800 transition font-medium text-sm"
                        >
                            Disconnect
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Not connected - show connect button
    return (
        <button
            onClick={connectMetaMask}
            disabled={isPending}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isPending ? 'Connecting...' : '🔗 Connect Wallet'}
        </button>
    );
}
