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
                    className="wallet-button connected"
                >
                    <span className="wallet-dot"></span>
                    {address.slice(0, 6)}...{address.slice(-4)}
                </button>

                {showDropdown && (
                    <div className="wallet-dropdown">
                        <button
                            onClick={() => {
                                disconnect();
                                setShowDropdown(false);
                            }}
                            className="disconnect-btn"
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
            className="wallet-button"
        >
            {isPending ? 'Connecting...' : '🦊 Connect MetaMask'}
        </button>
    );
}
