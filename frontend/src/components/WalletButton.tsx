'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState } from 'react';

export function WalletButton() {
    const { address, isConnected } = useAccount();
    const { connect, connectors, isPending } = useConnect();
    const { disconnect } = useDisconnect();
    const [showDropdown, setShowDropdown] = useState(false);

    if (isConnected && address) {
        return (
            <div className="relative">
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition"
                >
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="font-mono text-white">{address.slice(0, 6)}...{address.slice(-4)}</span>
                </button>
                {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                        <button
                            onClick={() => {
                                disconnect();
                                setShowDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 text-red-400 hover:bg-gray-800 transition font-medium"
                        >
                            Disconnect
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <button
            onClick={() => {
                const injectedConnector = connectors.find(c => c.id === 'injected');
                if (injectedConnector) {
                    connect({ connector: injectedConnector });
                }
            }}
            disabled={isPending}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isPending ? 'Connecting...' : '🦊 Connect MetaMask'}
        </button>
    );
}
