'use client';

/**
 * Contacts Page
 * Full-featured address book management
 */

import { ContactsManager } from '@/components/ContactsManager';

export default function ContactsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-6xl">📇</span>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Address Book
            </h1>
          </div>
          <p className="text-xl text-gray-300 mb-2">
            Save & Manage Your Contacts
          </p>
          <p className="text-gray-400">
            Store frequently used addresses with friendly names
          </p>
        </div>

        {/* How It Works */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-3 text-blue-300">💡 How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
            <div>
              <div className="text-white font-medium mb-1">1️⃣ Add Contacts</div>
              <p>Save addresses with friendly labels like "Mom", "Office", or "Dubai Branch"</p>
            </div>
            <div>
              <div className="text-white font-medium mb-1">2️⃣ Quick Select</div>
              <p>When sending, click the contact name instead of typing the full address</p>
            </div>
            <div>
              <div className="text-white font-medium mb-1">3️⃣ ENS Support</div>
              <p>Works with ENS names (vitalik.eth) and wallet addresses (0x...)</p>
            </div>
          </div>
        </div>

        {/* Contacts Manager */}
        <ContactsManager />

        {/* Tips */}
        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="text-sm text-blue-300 space-y-2">
            <p className="font-medium">💡 Tips:</p>
            <ul className="list-disc list-inside text-gray-400 space-y-1 ml-2">
              <li>Contacts are stored locally in your browser</li>
              <li>Use descriptive labels to easily identify recipients</li>
              <li>ENS names are automatically resolved to addresses</li>
              <li>Recent contacts appear first in the swap dropdown</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
