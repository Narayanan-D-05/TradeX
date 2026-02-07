'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState, useEffect } from 'react';
import { useCircleWallet } from '@/hooks/useCircleWallet';

export type ActiveWalletType = 'metamask' | 'circle' | null;

export function WalletButton() {
    const { address, isConnected } = useAccount();
    const { connect, connectors, isPending } = useConnect();
    const { disconnect } = useDisconnect();
    const [showDropdown, setShowDropdown] = useState(false);
    const [showWalletPicker, setShowWalletPicker] = useState(false);
    const [activeWallet, setActiveWallet] = useState<ActiveWalletType>(null);
    const [mounted, setMounted] = useState(false);

    // Fix hydration mismatch - only render after client mount
    useEffect(() => {
        setMounted(true);
    }, []);

    // Circle Wallet integration
    const circle = useCircleWallet();

    // Check if any wallet is connected
    const isAnyWalletConnected = isConnected || circle.isConnected;
    const displayAddress = activeWallet === 'circle' 
        ? circle.address 
        : address;
    
    // Return null on server/initial render to prevent hydration mismatch
    if (!mounted) {
        return (
            <div className="w-[160px] h-[42px]" /> // Placeholder with same dimensions
        );
    }

    // Handle MetaMask connection
    const connectMetaMask = () => {
        const injectedConnector = connectors.find(c => c.id === 'injected');
        if (injectedConnector) {
            connect({ connector: injectedConnector });
            setActiveWallet('metamask');
            setShowWalletPicker(false);
        }
    };

    // Handle Circle Wallet connection
    const connectCircleWallet = async () => {
        console.log('🔵 Circle Wallet: Starting initialization...');
        setShowWalletPicker(false);
        try {
            await circle.connect();
            setActiveWallet('circle');
            console.log('✅ Circle Wallet Connected:', circle.address);
        } catch (error) {
            console.error('❌ Circle Wallet error:', error);
        }
    };

    // Handle disconnect
    const handleDisconnect = () => {
        if (circle.isConnected) {
            console.log('🔵 Disconnecting Circle Wallet');
            circle.disconnect();
        }
        if (isConnected) {
            console.log('🦊 Disconnecting MetaMask');
            disconnect();
        }
        setActiveWallet(null);
        setShowDropdown(false);
    };

    // Connected state
    if ((isConnected && address) || circle.isConnected) {
        // Auto-detect which wallet is active
        const walletIcon = circle.isConnected ? '🔵' : '🦊';
        const walletLabel = circle.isConnected ? 'Circle' : 'MetaMask';
        const addr = circle.isConnected ? circle.address : address;

        return (
            <div className="relative">
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition"
                >
                    <span className="text-sm">{walletIcon}</span>
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="font-mono text-white text-sm">
                        {addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'Connected'}
                    </span>
                </button>
                {showDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                        {/* Wallet Info */}
                        <div className="px-4 py-3 border-b border-gray-800">
                            <div className="flex items-center gap-2 text-sm">
                                <span>{walletIcon}</span>
                                <span className="text-gray-300">{walletLabel}</span>
                                {activeWallet === 'circle' && (
                                    <span className="ml-auto px-1.5 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded">
                                        Embedded
                                    </span>
                                )}
                            </div>
                            {activeWallet === 'circle' && circle.address && (
                                <div className="mt-2 text-xs text-gray-500">
                                    ID: {circle.address.slice(0, 15)}...
                                </div>
                            )}
                        </div>

                        {/* Circle Wallet Balance */}
                        {activeWallet === 'circle' && circle.balance && (
                            <div className="px-4 py-2 border-b border-gray-800">
                                <div className="text-xs text-gray-500 mb-1">Balance</div>
                                <div className="flex justify-between text-xs py-0.5">
                                    <span className="text-gray-400">{circle.chainName || 'ETH'}</span>
                                    <span className="text-gray-200 font-mono">
                                        {parseFloat(circle.balance).toFixed(4)} ETH
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Switch Wallet */}
                        {activeWallet === 'metamask' && !circle.isConnected && (
                            <button
                                onClick={async () => {
                                    setShowDropdown(false);
                                    await connectCircleWallet();
                                }}
                                className="w-full text-left px-4 py-3 text-blue-400 hover:bg-gray-800 transition text-sm flex items-center gap-2"
                            >
                                🔵 Switch to Circle Wallet
                            </button>
                        )}
                        {activeWallet === 'circle' && !isConnected && (
                            <button
                                onClick={() => {
                                    setShowDropdown(false);
                                    connectMetaMask();
                                }}
                                className="w-full text-left px-4 py-3 text-orange-400 hover:bg-gray-800 transition text-sm flex items-center gap-2"
                            >
                                🦊 Switch to MetaMask
                            </button>
                        )}

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

    // Not connected - show wallet picker
    return (
        <div className="relative">
            <button
                onClick={() => setShowWalletPicker(!showWalletPicker)}
                disabled={isPending || circle.isLoading}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isPending || circle.isLoading ? 'Connecting...' : '🔗 Connect Wallet'}
            </button>

            {/* Wallet Picker Dropdown */}
            {showWalletPicker && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-gray-800">
                        <h3 className="text-sm font-semibold text-white">Choose Wallet</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Select your preferred wallet provider</p>
                    </div>

                    {/* MetaMask Option */}
                    <button
                        onClick={connectMetaMask}
                        disabled={isPending}
                        className="w-full text-left px-4 py-3 hover:bg-gray-800 transition flex items-center gap-3 border-b border-gray-800/50 disabled:opacity-50"
                    >
                        <span className="text-2xl">🦊</span>
                        <div>
                            <div className="text-sm font-medium text-white">MetaMask</div>
                            <div className="text-xs text-gray-500">Browser extension wallet</div>
                        </div>
                    </button>

                    {/* Circle Wallet Option */}
                    <button
                        onClick={connectCircleWallet}
                        disabled={circle.isLoading}
                        className="w-full text-left px-4 py-3 hover:bg-gray-800 transition flex items-center gap-3 border-b border-gray-800/50 disabled:opacity-50"
                    >
                        <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {circle.isLoading ? '⏳' : 'C'}
                        </span>
                        <div className="flex-1">
                            <div className="text-sm font-medium text-white flex items-center gap-2">
                                {circle.isLoading ? 'Initializing...' : 'Circle Wallet'}
                                {!circle.isLoading && (
                                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] rounded">NEW</span>
                                )}
                            </div>
                            <div className="text-xs text-gray-500">
                                {circle.isLoading ? 'Setting up embedded wallet...' : 'Embedded wallet • No extension'}
                            </div>
                        </div>
                    </button>

                    {/* Info */}
                    <div className="p-3 bg-gray-800/30">
                        <p className="text-[10px] text-gray-500 leading-relaxed">
                            Circle Wallet provides embedded wallet UX with automated approvals, compliance features, and works with Yellow Network + LI.FI.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
