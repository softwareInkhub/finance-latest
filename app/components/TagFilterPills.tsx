import React, { useState, useRef } from 'react';
import { FiMoreHorizontal } from 'react-icons/fi';

interface Tag {
  id: string;
  name: string;
  color?: string;
}

interface TagFilterPillsProps {
  allTags: Tag[];
  tagFilters: string[];
  onToggleTag: (tagName: string) => void;
  onClear?: () => void;
  onTagDeleted?: () => void; // optional callback to refresh tags
  onApplyTagToAll?: (tagName: string) => void; // new prop for bulk apply
  tagStats?: Record<string, number>; // tag name to count
}

const TagFilterPills: React.FC<TagFilterPillsProps> = ({ allTags, tagFilters, onToggleTag, onClear, onTagDeleted, onApplyTagToAll, tagStats }) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tag: Tag } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ tag: Tag } | null>(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on click outside
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setContextMenu(null);
    };
    if (contextMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await fetch('/api/tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteModal.tag.id }),
      });
      setDeleteModal(null);
      setDeleteInput('');
      if (onTagDeleted) onTagDeleted();
    } catch {
      // Optionally show error
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex max-h-[10vh] overflow-y-auto p-4 border-gray-200 border-2 flex-wrap gap-1 sm:gap-2 items-center mb-4 relative">
      {allTags.map(tag => {
        const btnRef = React.createRef<HTMLButtonElement>();
        const count = tagStats ? tagStats[tag.name] : undefined;
        return (
          <span key={tag.id} className="relative inline-flex items-center group">
            <button
              className={`px-2 py-1 rounded-full text-xs font-semibold border shadow-sm transition-all ${tagFilters.includes(tag.name) ? 'bg-indigo-700 text-white border-indigo-800 scale-110' : 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200'}`}
              onClick={() => onToggleTag(tag.name)}
            >
              {tag.name}
              {typeof count === 'number' && (
                <span className="ml-1 bg-white/80 border border-indigo-200 rounded-full px-1.5 text-[10px] font-bold text-indigo-700 align-middle inline-block min-w-[18px] text-center">
                  {count}
                </span>
              )}
            </button>
            <button
              ref={btnRef}
              className="ml-1 p-0.5 rounded-full hover:bg-gray-200 focus:bg-gray-300 focus:outline-none text-gray-500"
              style={{ lineHeight: 0 }}
              onClick={e => {
                e.stopPropagation();
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                setContextMenu({ x: rect.left, y: rect.bottom + 4, tag });
              }}
              title="Tag options"
              tabIndex={0}
            >
              <FiMoreHorizontal size={16} />
            </button>
          </span>
        );
      })}
      {tagFilters.length > 0 && onClear && (
        <button
          className="px-2 py-1 rounded-full text-xs font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 ml-1 sm:ml-2"
          onClick={onClear}
        >
          Clear
        </button>
      )}
      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white border border-gray-200 rounded shadow-lg py-1 px-2 text-sm"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded w-full text-left"
            onClick={() => {
              if (onApplyTagToAll) onApplyTagToAll(contextMenu.tag.name);
              setContextMenu(null);
            }}
          >
            Apply Tag to All Matching Transactions
          </button>
          <button
            className="text-red-600 hover:bg-red-50 px-3 py-1 rounded w-full text-left"
            onClick={() => {
              setDeleteModal({ tag: contextMenu.tag });
              setContextMenu(null);
            }}
          >
            Delete Tag
          </button>
        </div>
      )}
      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs">
            <div className="mb-2 text-lg font-semibold text-red-700">Delete Tag</div>
            <div className="mb-2 text-sm text-gray-700">Type <b>{deleteModal.tag.name}</b> to confirm deletion.</div>
            <input
              className="border px-2 py-1 rounded w-full mb-3"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              autoFocus
              disabled={deleting}
            />
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-1 rounded bg-gray-100 text-gray-700" onClick={() => { setDeleteModal(null); setDeleteInput(''); }} disabled={deleting}>Cancel</button>
              <button
                className="px-3 py-1 rounded bg-red-600 text-white disabled:opacity-50"
                disabled={deleteInput.trim().toLowerCase() !== deleteModal.tag.name.toLowerCase() || deleting}
                onClick={handleDelete}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagFilterPills; 