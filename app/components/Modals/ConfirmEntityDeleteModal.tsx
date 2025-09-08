"use client";
import React from 'react';
import Modal from './Modal';

interface ConfirmEntityDeleteModalProps {
  isOpen: boolean;
  entityName: string;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
  deleting?: boolean;
}

export default function ConfirmEntityDeleteModal({ isOpen, entityName, onCancel, onConfirm, deleting = false }: ConfirmEntityDeleteModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Delete Entity" maxWidthClass="max-w-sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-700">Are you sure you want to delete <span className="font-semibold">{entityName}</span> and all files/folders inside it? This action cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-2 rounded border">Cancel</button>
          <button onClick={onConfirm} disabled={deleting} className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete'}</button>
        </div>
      </div>
    </Modal>
  );
}


