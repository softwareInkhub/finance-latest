import React, { useState } from 'react';

interface HeaderEditorProps {
  headerInputs: string[];
  onHeaderInputChange: (idx: number, value: string) => void;
  onAddHeaderInput: () => void;
  onRemoveHeaderInput: (idx: number) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
}

const HeaderEditor: React.FC<HeaderEditorProps> = ({
  headerInputs,
  onHeaderInputChange,
  onAddHeaderInput,
  onRemoveHeaderInput,
  onSave,
  onCancel,
  loading,
  error,
  success,
}) => {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Helper to reorder array
  const reorder = (arr: string[], from: number, to: number) => {
    const updated = [...arr];
    const [removed] = updated.splice(from, 1);
    updated.splice(to, 0, removed);
    return updated;
  };

  // Local state for drag-and-drop order
  const [localOrder, setLocalOrder] = useState<string[]>(headerInputs);

  // Sync localOrder with headerInputs if they change externally
  React.useEffect(() => {
    setLocalOrder(headerInputs);
  }, [headerInputs]);

  // When drag ends, update the parent order
  const handleDrop = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const newOrder = reorder(localOrder, fromIdx, toIdx);
    setLocalOrder(newOrder);
    // Update parent state
    // We'll call onHeaderInputChange for each item to update the order
    newOrder.forEach((val, idx) => {
      if (headerInputs[idx] !== val) {
        onHeaderInputChange(idx, val);
      }
    });
  };

  return (
  <form onSubmit={onSave} className="flex flex-col gap-2 mt-3 sm:mt-4">
    <label className="block text-xs font-medium text-blue-700 mb-1">Edit Header Columns</label>
    <div className="flex flex-wrap gap-2 sm:gap-3 items-center bg-white/70 p-2 sm:p-3 rounded border border-blue-100 shadow-sm">
        {localOrder.map((header, idx) => (
          <div
            key={idx}
            className={`relative group flex-1 min-w-[120px] ${dragOverIdx === idx ? 'ring-2 ring-blue-400' : ''}`}
            draggable
            onDragStart={() => setDraggedIdx(idx)}
            onDragOver={e => {
              e.preventDefault();
              setDragOverIdx(idx);
            }}
            onDrop={e => {
              e.preventDefault();
              if (draggedIdx !== null) handleDrop(draggedIdx, idx);
              setDraggedIdx(null);
              setDragOverIdx(null);
            }}
            onDragEnd={() => {
              setDraggedIdx(null);
              setDragOverIdx(null);
            }}
          >
          <input
            type="text"
            value={header}
            onChange={e => onHeaderInputChange(idx, e.target.value)}
            className="w-full rounded border border-blue-200 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder={`Header ${idx + 1}`}
            disabled={loading}
          />
            {localOrder.length > 1 && (
            <button
              type="button"
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
              title="Remove"
              onClick={() => onRemoveHeaderInput(idx)}
              tabIndex={-1}
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        className="flex items-center justify-center w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-xl font-bold shadow"
        onClick={onAddHeaderInput}
        title="Add header column"
        disabled={loading}
        style={{ alignSelf: 'center' }}
      >
        +
      </button>
    </div>
    <div className="flex flex-col sm:flex-row gap-2 mt-2">
      <button
        type="submit"
        className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow hover:scale-[1.02] hover:shadow-lg transition-all font-semibold disabled:opacity-50 w-full sm:w-auto"
        disabled={loading}
      >
        {loading ? "Saving..." : "Save Header"}
      </button>
      <button
        type="button"
        className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg shadow hover:bg-gray-300 transition-all font-semibold w-full sm:w-auto"
        onClick={onCancel}
        disabled={loading}
      >
        Cancel
      </button>
    </div>
    {error && <div className="text-red-600 mt-2 text-sm">{error}</div>}
    {success && <div className="text-green-600 mt-2 text-sm">{success}</div>}
  </form>
);
};

export default HeaderEditor; 