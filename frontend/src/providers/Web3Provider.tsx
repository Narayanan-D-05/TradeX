'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected } from 'wagmi/connectors';

// Arc Testnet chain configuration
const arcTestnet = {
    id: 5042002,
    name: 'Arc Testnet',
    nativeCurrency: {
        decimals: 6,
        name: 'USDC',
        symbol: 'USDC',
    },
    rpcUrls: {
        default: { http: ['https://rpc.testnet.arc.network'] },
    },
    blockExplorers: {
        default: { name: 'Arc Explorer', url: 'https://testnet.arcscan.app' },
    },
    testnet: true,
} as const;

// Simple config with just MetaMask (injected connector)
const config = createConfig({
    chains: [sepolia, arcTestnet],
    connectors: [
        injected(),
    ],
    transports: {
        [sepolia.id]: http(),
        [arcTestnet.id]: http(),
    },
    ssr: true,
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}
