"use client";
import React, { useState } from 'react';
import Modal from './Modal';

interface CreateEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (name: string) => void;
}

export default function CreateEntityModal({ isOpen, onClose, onCreated }: CreateEntityModalProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    const cleaned = name.trim();
    if (!cleaned) {
      setError('Please enter a name');
      return;
    }
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';
    if (!userId) { setError('User not found'); return; }
    try {
      setSaving(true);
      const res = await fetch('/api/entities/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, entityName: cleaned })
      });
      if (!res.ok) throw new Error('Failed to create entity');
      onCreated(cleaned);
      setName('');
      onClose();
    } catch {
      setError('Failed to create entity');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Entity" maxWidthClass="max-w-md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Entity name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Shopify"
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded border">Cancel</button>
          <button onClick={handleCreate} disabled={saving} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  );
}


