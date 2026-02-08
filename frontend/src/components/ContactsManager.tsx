/**
 * ContactsManager Component
 * UI for managing address book / saved contacts
 */

'use client';

import { useState } from 'react';
import { useContacts, type Contact } from '@/hooks/useContacts';
import { isAddress } from 'viem';
import { ENSProfile } from '@/components/ENSProfile';

interface ContactsManagerProps {
  onSelectContact?: (contact: Contact) => void;
  compact?: boolean;
}

export function ContactsManager({ onSelectContact, compact = false }: ContactsManagerProps) {
  const {
    contacts,
    addContact,
    updateContact,
    deleteContact,
    searchContacts,
  } = useContacts();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [formLabel, setFormLabel] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const filteredContacts = searchQuery ? searchContacts(searchQuery) : contacts;

  const resetForm = () => {
    setFormLabel('');
    setFormAddress('');
    setFormNotes('');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!formLabel.trim() || !formAddress.trim()) {
      alert('Label and address are required');
      return;
    }

    const isEns = formAddress.includes('.eth');
    const isValidAddress = isAddress(formAddress);

    if (!isEns && !isValidAddress) {
      alert('Invalid address or ENS name');
      return;
    }

    addContact(formLabel, formAddress, formNotes);
    resetForm();
  };

  const handleEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setFormLabel(contact.label);
    setFormAddress(contact.address);
    setFormNotes(contact.notes || '');
    setIsAdding(true);
  };

  const handleUpdate = () => {
    if (!editingId) return;

    updateContact(editingId, {
      label: formLabel,
      address: formAddress,
      notes: formNotes,
    });
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this contact?')) {
      deleteContact(id);
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-gray-400 mb-2">📇 Saved Contacts</div>
        {filteredContacts.length === 0 && (
          <div className="text-xs text-gray-500 italic">No contacts saved yet</div>
        )}
        {filteredContacts.map((contact) => (
          <button
            key={contact.id}
            onClick={() => onSelectContact?.(contact)}
            className="w-full p-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-lg text-left transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{contact.label}</div>
                <div className="text-xs text-gray-400 font-mono truncate">
                  {contact.address}
                </div>
              </div>
              <span className="text-blue-400">→</span>
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">📇 Address Book</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {isAdding ? 'Cancel' : '+ Add Contact'}
        </button>
      </div>

      {/* Search */}
      {!isAdding && contacts.length > 0 && (
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search contacts..."
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      )}

      {/* Add/Edit Form */}
      {isAdding && (
        <div className="space-y-3 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
          <div className="text-sm font-medium text-blue-300">
            {editingId ? 'Edit Contact' : 'New Contact'}
          </div>
          
          <input
            type="text"
            value={formLabel}
            onChange={(e) => setFormLabel(e.target.value)}
            placeholder="Label (e.g., Mom, Office, Dubai Branch)"
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          
          <input
            type="text"
            value={formAddress}
            onChange={(e) => setFormAddress(e.target.value)}
            placeholder="vitalik.eth or 0x..."
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          
          <textarea
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />

          {/* ENS Preview */}
          {formAddress && (formAddress.includes('.eth') || isAddress(formAddress)) && (
            <ENSProfile nameOrAddress={formAddress} compact={true} />
          )}

          <div className="flex gap-2">
            <button
              onClick={editingId ? handleUpdate : handleAdd}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              {editingId ? 'Update' : 'Save'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Contacts List */}
      {!isAdding && (
        <div className="space-y-2">
          {filteredContacts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'No matching contacts' : 'No contacts saved yet. Click "Add Contact" to start.'}
            </div>
          )}
          
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{contact.label}</span>
                    {contact.lastUsed && (
                      <span className="text-xs text-gray-500">
                        • last used {new Date(contact.lastUsed).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 font-mono truncate mb-1">
                    {contact.address}
                  </div>
                  {contact.notes && (
                    <div className="text-xs text-gray-500 italic">{contact.notes}</div>
                  )}
                </div>
                
                <div className="flex gap-2 flex-shrink-0">
                  {onSelectContact && (
                    <button
                      onClick={() => onSelectContact(contact)}
                      className="px-2 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded transition-colors"
                    >
                      Use
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(contact)}
                    className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded transition-colors"
                  >
                    Del
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {!isAdding && contacts.length > 0 && (
        <div className="pt-3 border-t border-gray-800 text-xs text-gray-500">
          {contacts.length} contact{contacts.length !== 1 ? 's' : ''} saved
        </div>
      )}
    </div>
  );
}
