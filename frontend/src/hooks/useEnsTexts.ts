/**
 * Custom hook for fetching ENS text records
 * Based on ENS documentation: https://docs.ens.domains/web/quickstart
 * 
 * Text records include social media handles, URLs, descriptions, and more
 */

import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { normalize } from 'viem/ens';
import { mainnet } from 'viem/chains';

export interface UseEnsTextsProps {
  name?: string;
  keys: string[];
}

export interface EnsTextRecord {
  key: string;
  value: string | null;
}

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

/**
 * Hook to fetch multiple ENS text records for a given name
 * @param name - ENS name (e.g., "vitalik.eth")
 * @param keys - Array of text record keys to fetch (e.g., ["com.twitter", "com.github"])
 * @returns Array of text records with key-value pairs
 */
export function useEnsTexts({ name, keys }: UseEnsTextsProps) {
  const [data, setData] = useState<EnsTextRecord[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!name || keys.length === 0) {
      setData(null);
      return;
    }

    async function fetchTexts() {
      if (!name) return; // Guard clause for TypeScript
      
      try {
        setIsLoading(true);
        setError(null);

        // Normalize the ENS name
        const normalizedName = normalize(name);

        // Fetch all text records in parallel
        const textPromises = keys.map(async (key) => {
          try {
            const text = await publicClient.getEnsText({
              name: normalizedName,
              key,
            });

            return {
              key,
              value: text || null,
            };
          } catch (err) {
            console.warn(`Failed to fetch ENS text for key "${key}":`, err);
            return {
              key,
              value: null,
            };
          }
        });

        const results = await Promise.all(textPromises);
        
        // Filter out null values
        const validResults = results.filter((r) => r.value !== null);
        
        setData(validResults.length > 0 ? validResults : null);
      } catch (err) {
        console.error('Error fetching ENS texts:', err);
        setError(err as Error);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTexts();
  }, [name, keys.join(',')]); // Stringify keys array for dependency

  return {
    data,
    isLoading,
    error,
  };
}

/**
 * Common ENS text record keys
 */
export const COMMON_ENS_TEXT_KEYS = {
  // Social Media
  TWITTER: 'com.twitter',
  GITHUB: 'com.github',
  DISCORD: 'com.discord',
  TELEGRAM: 'org.telegram',
  
  // Contact
  EMAIL: 'email',
  URL: 'url',
  
  // Profile
  DESCRIPTION: 'description',
  NOTICE: 'notice',
  KEYWORDS: 'keywords',
  
  // Location
  LOCATION: 'location',
  
  // Custom
  AVATAR: 'avatar',
} as const;

export default useEnsTexts;
