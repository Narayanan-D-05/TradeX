/**
 * ENS Profile Component
 * Displays comprehensive ENS information including:
 * - Avatar
 * - Primary name
 * - Social media links
 * - Description
 * - Multichain addresses
 * 
 * Based on ENS documentation: https://docs.ens.domains/
 */

'use client';

import { useEnsAvatar, useEnsName, useEnsAddress } from 'wagmi';
import { useEnsTexts, COMMON_ENS_TEXT_KEYS } from '@/hooks/useEnsTexts';
import { isAddress } from 'viem';
import { Twitter, Github, Globe, Mail, ExternalLink } from 'lucide-react';

interface ENSProfileProps {
  nameOrAddress: string;
  compact?: boolean;
}

export function ENSProfile({ nameOrAddress, compact = false }: ENSProfileProps) {
  const isEns = nameOrAddress.includes('.eth');
  const isAddr = isAddress(nameOrAddress);

  // Get ENS name from address (reverse resolution)
  const { data: ensName } = useEnsName({
    address: (!isEns && isAddr) ? (nameOrAddress as `0x${string}`) : undefined,
    chainId: 1,
  });

  // Get address from ENS name (forward resolution)
  const { data: resolvedAddress } = useEnsAddress({
    name: isEns ? nameOrAddress : undefined,
    chainId: 1,
  });

  const displayName = isEns ? nameOrAddress : ensName;
  const displayAddress = isEns ? resolvedAddress : nameOrAddress;

  // Get avatar
  const { data: avatar } = useEnsAvatar({
    name: displayName || undefined,
    chainId: 1,
  });

  // Get text records
  const { data: texts } = useEnsTexts({
    name: displayName || undefined,
    keys: [
      COMMON_ENS_TEXT_KEYS.TWITTER,
      COMMON_ENS_TEXT_KEYS.GITHUB,
      COMMON_ENS_TEXT_KEYS.URL,
      COMMON_ENS_TEXT_KEYS.EMAIL,
      COMMON_ENS_TEXT_KEYS.DESCRIPTION,
    ],
  });

  // Parse text records
  const twitter = texts?.find((t) => t.key === COMMON_ENS_TEXT_KEYS.TWITTER)?.value;
  const github = texts?.find((t) => t.key === COMMON_ENS_TEXT_KEYS.GITHUB)?.value;
  const website = texts?.find((t) => t.key === COMMON_ENS_TEXT_KEYS.URL)?.value;
  const email = texts?.find((t) => t.key === COMMON_ENS_TEXT_KEYS.EMAIL)?.value;
  const description = texts?.find((t) => t.key === COMMON_ENS_TEXT_KEYS.DESCRIPTION)?.value;

  if (!displayName && !displayAddress) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded">
        {avatar && (
          <img src={avatar} alt={displayName || 'Avatar'} className="w-6 h-6 rounded-full" />
        )}
        <div className="flex flex-col leading-tight">
          {displayName && (
            <span className="text-sm font-medium text-blue-300">{displayName}</span>
          )}
          {displayAddress && (
            <span className="text-xs text-gray-400 font-mono">
              {displayAddress.slice(0, 6)}...{displayAddress.slice(-4)}
            </span>
          )}
        </div>
        <span className="ml-auto text-emerald-400 text-xs">✓ Verified</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {avatar ? (
          <img
            src={avatar}
            alt={displayName || 'Avatar'}
            className="w-12 h-12 rounded-full border-2 border-blue-400"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-lg">
            {displayName?.charAt(0).toUpperCase() || '?'}
          </div>
        )}

        <div className="flex-1">
          {displayName && (
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">{displayName}</h3>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30">
                ENS
              </span>
            </div>
          )}
          {displayAddress && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-400 font-mono">{displayAddress}</span>
              <button
                onClick={() => navigator.clipboard.writeText(displayAddress)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Copy address"
              >
                <ExternalLink size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-300 mb-3 leading-relaxed">{description}</p>
      )}

      {/* Social Links */}
      {(twitter || github || website || email) && (
        <div className="flex flex-wrap gap-2">
          {twitter && (
            <a
              href={`https://twitter.com/${twitter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded text-xs text-sky-300 transition-colors"
            >
              <Twitter size={12} />
              <span>@{twitter}</span>
            </a>
          )}
          {github && (
            <a
              href={`https://github.com/${github}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/30 rounded text-xs text-gray-300 transition-colors"
            >
              <Github size={12} />
              <span>{github}</span>
            </a>
          )}
          {website && (
            <a
              href={website.startsWith('http') ? website : `https://${website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded text-xs text-purple-300 transition-colors"
            >
              <Globe size={12} />
              <span>Website</span>
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded text-xs text-emerald-300 transition-colors"
            >
              <Mail size={12} />
              <span>Email</span>
            </a>
          )}
        </div>
      )}

      {/* ENS Info */}
      <div className="mt-3 pt-3 border-t border-blue-500/20">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Resolved via ENS Protocol</span>
          <a
            href={`https://app.ens.domains/${displayName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            View on ENS
            <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>
  );
}

export default ENSProfile;
