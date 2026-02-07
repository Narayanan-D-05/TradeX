'use client';

/**
 * ENS Demo Page
 * Showcases ENS integration with live examples
 * Demonstrates:
 * - Forward resolution (name → address)
 * - Reverse resolution (address → name)
 * - Avatar fetching
 * - Text records (social media, description, etc.)
 * - User input for custom ENS lookups
 */

import { useState } from 'react';
import { ENSProfile } from '@/components/ENSProfile';
import { Search, User, Hash } from 'lucide-react';

const EXAMPLE_ENS_NAMES = [
  { name: 'vitalik.eth', description: 'Co-founder of Ethereum' },
  { name: 'nick.eth', description: 'ENS Lead Developer' },
  { name: 'brantly.eth', description: 'ENS Director of Operations' },
  { name: 'jefflau.eth', description: 'ENS Frontend Developer' },
];

const EXAMPLE_ADDRESSES = [
  { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', name: 'vitalik.eth' },
  { address: '0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5', name: 'nick.eth' },
];

export default function ENSDemoPage() {
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handleLookup = () => {
    if (customInput.trim()) {
      setShowCustom(true);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-6xl">🏷️</span>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              ENS Integration Demo
            </h1>
          </div>
          <p className="text-xl text-gray-300 mb-2">
            Human-Readable Names for Ethereum
          </p>
          <p className="text-gray-400">
            Instead of sending to <span className="text-gray-500 font-mono text-sm">0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045</span>,
            just use <span className="text-blue-400 font-medium">vitalik.eth</span>
          </p>
        </div>

        {/* Custom Lookup */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Search size={24} className="text-blue-400" />
            Try It Yourself
          </h2>
          <p className="text-gray-400 mb-4">
            Enter any ENS name (e.g., <span className="text-blue-400">vitalik.eth</span>) or Ethereum address to see the full profile:
          </p>
          
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              placeholder="vitalik.eth or 0x..."
              className="flex-1 px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={handleLookup}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Search size={18} />
              Lookup
            </button>
          </div>

          {showCustom && customInput && (
            <ENSProfile nameOrAddress={customInput} />
          )}
        </div>

        {/* Example ENS Names */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <User size={24} className="text-purple-400" />
            ENS Name → Address (Forward Resolution)
          </h2>
          <p className="text-gray-400 mb-6">
            ENS names resolve to Ethereum addresses, along with rich profile data:
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {EXAMPLE_ENS_NAMES.map((example) => (
              <ENSProfile key={example.name} nameOrAddress={example.name} />
            ))}
          </div>
        </div>

        {/* Example Addresses */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Hash size={24} className="text-emerald-400" />
            Address → ENS Name (Reverse Resolution)
          </h2>
          <p className="text-gray-400 mb-6">
            Addresses with ENS names automatically show their human-readable name:
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {EXAMPLE_ADDRESSES.map((example) => (
              <div key={example.address}>
                <div className="mb-2 text-sm text-gray-400">
                  Lookup: <span className="font-mono text-xs">{example.address}</span>
                </div>
                <ENSProfile nameOrAddress={example.address} />
              </div>
            ))}
          </div>
        </div>

        {/* Features List */}
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-center">TradeX ENS Features</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-2xl">
                  📝
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">Automatic Resolution</h3>
                <p className="text-sm text-gray-400">
                  Type any ENS name in the recipient field and it's automatically resolved to an Ethereum address
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-2xl">
                  👤
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">Rich Profiles</h3>
                <p className="text-sm text-gray-400">
                  View avatars, social media links, descriptions, and more for any ENS name
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">Verified Identity</h3>
                <p className="text-sm text-gray-400">
                  ENS provides cryptographic proof of ownership, ensuring you're sending to the right person
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-2xl">
                  🔗
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">Social Integration</h3>
                <p className="text-sm text-gray-400">
                  Connect with recipients via their Twitter, GitHub, email, and website directly from ENS
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="mt-8 bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-xl font-semibold mb-4">Technical Implementation</h3>
          <div className="space-y-4 text-sm text-gray-400">
            <div>
              <span className="text-white font-medium">Wagmi Hooks:</span> Uses <code className="text-blue-400">useEnsName</code>, <code className="text-blue-400">useEnsAddress</code>, <code className="text-blue-400">useEnsAvatar</code>
            </div>
            <div>
              <span className="text-white font-medium">Text Records:</span> Custom hook fetches social media, description, website, email via <code className="text-blue-400">publicClient.getEnsText()</code>
            </div>
            <div>
              <span className="text-white font-medium">Chain ID:</span> All ENS resolution happens on Ethereum Mainnet (chainId: 1), regardless of user's connected chain
            </div>
            <div>
              <span className="text-white font-medium">Real-time:</span> No hard-coded values - all data fetched live from ENS contracts
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-800 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Powered by ENS Protocol • Learn more at ens.domains
            </div>
            <a
              href="https://github.com/ensdomains"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
            >
              View ENS on GitHub →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
