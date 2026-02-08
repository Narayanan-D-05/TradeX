/**
 * useContacts Hook
 * Manages address book / contacts for TradeX
 * Stores contacts in localStorage with ENS resolution
 */

import { useState, useEffect, useCallback } from 'react';
import { useEnsName, useEnsAvatar } from 'wagmi';
import { isAddress } from 'viem';

export interface Contact {
  id: string;
  label: string;           // User-friendly name (e.g., "Mom", "Office")
  address: string;         // ENS name or 0x address
  ensName?: string;        // Resolved ENS name (if address is 0x)
  avatar?: string;         // ENS avatar URL
  lastUsed?: number;       // Timestamp of last use
  notes?: string;          // Optional memo
  createdAt: number;       // Timestamp of creation
}

const STORAGE_KEY = 'tradex_contacts';

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load contacts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setContacts(parsed);
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save contacts to localStorage whenever they change
  const saveContacts = useCallback((newContacts: Contact[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newContacts));
      setContacts(newContacts);
    } catch (error) {
      console.error('Failed to save contacts:', error);
    }
  }, []);

  // Add new contact
  const addContact = useCallback(
    (label: string, address: string, notes?: string): Contact => {
      const newContact: Contact = {
        id: `contact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        label: label.trim(),
        address: address.trim(),
        notes: notes?.trim(),
        createdAt: Date.now(),
      };

      const updated = [...contacts, newContact];
      saveContacts(updated);
      return newContact;
    },
    [contacts, saveContacts]
  );

  // Update existing contact
  const updateContact = useCallback(
    (id: string, updates: Partial<Omit<Contact, 'id' | 'createdAt'>>) => {
      const updated = contacts.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      );
      saveContacts(updated);
    },
    [contacts, saveContacts]
  );

  // Delete contact
  const deleteContact = useCallback(
    (id: string) => {
      const updated = contacts.filter((c) => c.id !== id);
      saveContacts(updated);
    },
    [contacts, saveContacts]
  );

  // Mark contact as recently used
  const markContactUsed = useCallback(
    (id: string) => {
      updateContact(id, { lastUsed: Date.now() });
    },
    [updateContact]
  );

  // Get contact by ID
  const getContact = useCallback(
    (id: string) => contacts.find((c) => c.id === id),
    [contacts]
  );

  // Get contact by address (exact match)
  const getContactByAddress = useCallback(
    (address: string) => 
      contacts.find(
        (c) => c.address.toLowerCase() === address.toLowerCase()
      ),
    [contacts]
  );

  // Get recent contacts (sorted by lastUsed, then by createdAt)
  const getRecentContacts = useCallback(
    (limit: number = 5) => {
      return [...contacts]
        .sort((a, b) => {
          // Sort by lastUsed first (most recent first)
          if (a.lastUsed && b.lastUsed) {
            return b.lastUsed - a.lastUsed;
          }
          // If only one has lastUsed, prioritize it
          if (a.lastUsed) return -1;
          if (b.lastUsed) return 1;
          // If neither has lastUsed, sort by creation date (newest first)
          return b.createdAt - a.createdAt;
        })
        .slice(0, limit);
    },
    [contacts]
  );

  // Search contacts by label or address
  const searchContacts = useCallback(
    (query: string) => {
      if (!query.trim()) return contacts;
      
      const lowerQuery = query.toLowerCase();
      return contacts.filter(
        (c) =>
          c.label.toLowerCase().includes(lowerQuery) ||
          c.address.toLowerCase().includes(lowerQuery) ||
          c.ensName?.toLowerCase().includes(lowerQuery) ||
          c.notes?.toLowerCase().includes(lowerQuery)
      );
    },
    [contacts]
  );

  return {
    contacts,
    isLoading,
    addContact,
    updateContact,
    deleteContact,
    markContactUsed,
    getContact,
    getContactByAddress,
    getRecentContacts,
    searchContacts,
  };
}
