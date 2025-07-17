import React, { useState, useEffect } from 'react';
import Modal from './Modal';

interface EditBank {
  id: string;
  bankName: string;
  tags: string[];
}

interface CreateBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (bankName: string, tags: string[]) => void;
  editBank?: EditBank | null;
  onUpdate?: (id: string, bankName: string, tags: string[]) => void;
}

const CreateBankModal: React.FC<CreateBankModalProps> = ({ isOpen, onClose, onCreate, editBank, onUpdate }) => {
  const [bankName, setBankName] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editBank) {
      setBankName(editBank.bankName);
      setTags(editBank.tags.join(', '));
    } else {
      setBankName('');
      setTags('');
    }
  }, [editBank, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (editBank && onUpdate) {
      await onUpdate(editBank.id, bankName.trim(), tagArr);
    } else {
      onCreate(bankName.trim(), tagArr);
    }
    setIsSubmitting(false);
    setBankName('');
    setTags('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editBank ? 'Edit Bank' : 'Create New Bank'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="bankName" className="block text-sm font-medium text-gray-700">Bank Name</label>
          <input
            type="text"
            id="bankName"
            value={bankName}
            onChange={e => setBankName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700">Tags (comma separated)</label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={e => setTags(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="e.g. savings, business"
            disabled={isSubmitting}
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? (editBank ? 'Updating...' : 'Creating...') : (editBank ? 'Update' : 'Create')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateBankModal; 