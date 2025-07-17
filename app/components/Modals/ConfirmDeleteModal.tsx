import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { FiAlertTriangle } from 'react-icons/fi';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string; // The string the user must type to confirm (e.g., file name, tag name)
  itemType?: string; // e.g. 'file', 'tag', 'account', etc.
  confirmLabel?: string; // Optional label for the confirm button (default: 'Delete')
  description?: string; // Optional extra description
  loading?: boolean; // Show loading spinner and disable button
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = 'item',
  confirmLabel = 'Delete',
  description,
  loading = false,
}) => {
  const [input, setInput] = useState('');
  const match = input.trim() === itemName;

  useEffect(() => {
    if (!isOpen) setInput('');
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={undefined} maxWidthClass="max-w-xs">
      <div className="flex flex-col items-center w-full max-w-xs mx-auto">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mb-3">
          <FiAlertTriangle className="text-red-500 text-2xl" />
        </div>
        <div className="text-lg font-semibold text-gray-800 mb-1">Delete {itemType.charAt(0).toUpperCase() + itemType.slice(1)}</div>
        {description && <div className="mb-3 text-sm text-gray-600 text-center whitespace-pre-line">{description}</div>}
        <div className="mb-2 text-sm text-gray-700 w-full text-center">
          Type <b>{itemName}</b> to confirm deletion.
        </div>
        <input
          className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-red-200 text-center text-base transition"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Type ${itemName} to confirm`}
          autoFocus
          disabled={loading}
          maxLength={40}
        />
        <div className="flex gap-2 justify-end w-full mt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50" disabled={loading}>Cancel</button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold shadow-sm hover:from-red-600 hover:to-pink-600 transition disabled:opacity-50 flex items-center gap-2"
            disabled={!match || loading}
          >
            {loading && (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDeleteModal; 