'use client';

import * as React from 'react';
import {
    RainbowKitProvider,
    getDefaultWallets,
    getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import {
    argentWallet,
    trustWallet,
    ledgerWallet,
} from '@rainbow-me/rainbowkit/wallets';
import {
    sepolia,
    arbitrum,
    base,
    mainnet,
} from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import '@rainbow-me/rainbowkit/styles.css';

const { wallets } = getDefaultWallets();

const config = getDefaultConfig({
    appName: 'TradeX',
    projectId: 'YOUR_PROJECT_ID', // TODO: Get a valid project ID from WalletConnect
    wallets: [
        ...wallets,
        {
            groupName: 'Other',
            wallets: [argentWallet, trustWallet, ledgerWallet],
        },
    ],
    chains: [
        sepolia,
        {
            id: 5042002,
            name: 'Arc Testnet',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: {
                default: { http: ['https://rpc.arc.testnet.com'] }, // Fictional Arc RPC
            },
        } as any
    ],
    ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
