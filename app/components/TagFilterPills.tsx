import React, { useState, useRef } from 'react';
import { FiMoreHorizontal, FiChevronDown, FiChevronUp, FiSearch, FiFilter, FiTag } from 'react-icons/fi';

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Filter tags based on search query
  const filteredTags = allTags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show first 6 tags in first row, rest in second row when expanded
  const firstRowTags = filteredTags.slice(0, 6);
  const secondRowTags = filteredTags.slice(6);
  const hasMoreTags = filteredTags.length > 6;

  // Calculate tag statistics
  const totalTags = allTags.length;
  const activeFilters = tagFilters.length;
  const tagsWithCounts = allTags.filter(tag => tagStats && tagStats[tag.name] > 0).length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4">
      {/* First row: Tags on left, controls on right */}
      <div className="flex items-center p-2 border-b border-gray-100">
        {/* Left half - First 6 tag pills */}
        <div className="flex-1 flex items-center gap-1.5">
          {firstRowTags.map(tag => {
            const btnRef = React.createRef<HTMLButtonElement>();
            const count = tagStats ? tagStats[tag.name] : undefined;
            return (
              <span key={tag.id} className="relative inline-flex items-center group">
                <button
                  className={`px-2 py-1 rounded-md text-xs font-medium border transition-all duration-150 ${tagFilters.includes(tag.name) ? 'scale-105 shadow-sm' : 'hover:scale-105 hover:shadow-sm'}`}
                  style={{
                    backgroundColor: tagFilters.includes(tag.name) ? tag.color || '#6366F1' : `${tag.color || '#6366F1'}15`,
                    color: tagFilters.includes(tag.name) ? '#ffffff' : 'black',
                    borderColor: tag.color || '#6366F1'
                  }}
                  onClick={() => onToggleTag(tag.name)}
                >
                  {tag.name}
                  {typeof count === 'number' && (
                    <span 
                      className="ml-1 bg-white/90 border rounded-full px-1 text-[10px] font-bold align-middle inline-block min-w-[14px] text-center text-black"
                      style={{
                        borderColor: tag.color || '#6366F1',
                        color: 'black',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
                <button
                  ref={btnRef}
                  className="ml-0.5 p-0.5 rounded-full hover:bg-gray-100 focus:bg-gray-200 focus:outline-none text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ lineHeight: 0 }}
                  onClick={e => {
                    e.stopPropagation();
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    setContextMenu({ x: rect.left, y: rect.bottom + 4, tag });
                  }}
                  title="Tag options"
                  tabIndex={0}
                >
                  <FiMoreHorizontal size={12} />
                </button>
              </span>
            );
          })}
          
          {/* Show more indicator when collapsed */}
          {!isExpanded && hasMoreTags && (
            <button
              onClick={() => setIsExpanded(true)}
              className="px-2 py-1 text-xs text-gray-500 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
              title="Click to show more tags"
            >
              +{filteredTags.length - 6} more
            </button>
          )}
        </div>

        {/* Right half - Controls and statistics */}
        <div className="flex items-center gap-3 ml-3">
          {/* Tag statistics */}
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <FiTag size={12} />
              <span>{totalTags} tags</span>
            </div>
            {tagStats && (
              <div className="flex items-center gap-1">
                <FiFilter size={12} />
                <span>{tagsWithCounts} active</span>
              </div>
            )}
            {activeFilters > 0 && (
              <div className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                {activeFilters} selected
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <FiSearch className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-36 pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Quick filters */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <FiFilter size={12} />
              <span>Quick:</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  const tagsWithCounts = allTags.filter(tag => tagStats && tagStats[tag.name] > 0);
                  tagsWithCounts.forEach(tag => onToggleTag(tag.name));
                }}
                className="px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors font-medium"
                title="Select all tags with transactions"
              >
                Active
              </button>
              <button
                onClick={() => {
                  const tagsWithZeroCounts = allTags.filter(tag => !tagStats || tagStats[tag.name] === 0);
                  tagsWithZeroCounts.forEach(tag => onToggleTag(tag.name));
                }}
                className="px-2 py-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors font-medium"
                title="Select all tags without transactions"
              >
                Inactive
              </button>
              <button
                onClick={() => {
                  const topTags = allTags
                    .filter(tag => tagStats && tagStats[tag.name] > 0)
                    .sort((a, b) => (tagStats?.[b.name] || 0) - (tagStats?.[a.name] || 0))
                    .slice(0, 3);
                  topTags.forEach(tag => onToggleTag(tag.name));
                }}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors font-medium"
                title="Select top 3 most used tags"
              >
                Top 3
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            {tagFilters.length > 0 && onClear && (
              <button
                className="px-2 py-1 text-xs font-medium border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-700 transition-colors rounded-md"
                onClick={onClear}
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              title={isExpanded ? "Show less" : "Show more"}
            >
              {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Second row - Additional tags when expanded */}
      {isExpanded && secondRowTags.length > 0 && (
        <div className="p-2 border-b border-gray-100">
          <div className="flex flex-wrap gap-1.5 items-center">
            {secondRowTags.map(tag => {
              const btnRef = React.createRef<HTMLButtonElement>();
              const count = tagStats ? tagStats[tag.name] : undefined;
              return (
                <span key={tag.id} className="relative inline-flex items-center group">
                  <button
                    className={`px-2 py-1 rounded-md text-xs font-medium border transition-all duration-150 ${tagFilters.includes(tag.name) ? 'scale-105 shadow-sm' : 'hover:scale-105 hover:shadow-sm'}`}
                    style={{
                      backgroundColor: tagFilters.includes(tag.name) ? tag.color || '#6366F1' : `${tag.color || '#6366F1'}15`,
                      color: tagFilters.includes(tag.name) ? '#ffffff' : 'black',
                      borderColor: tag.color || '#6366F1'
                    }}
                    onClick={() => onToggleTag(tag.name)}
                  >
                    {tag.name}
                    {typeof count === 'number' && (
                      <span 
                        className="ml-1 bg-white/90 border rounded-full px-1 text-[10px] font-bold align-middle inline-block min-w-[14px] text-center"
                        style={{
                          borderColor: tag.color || '#6366F1',
                          color: tag.color || '#6366F1'
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                  <button
                    ref={btnRef}
                    className="ml-0.5 p-0.5 rounded-full hover:bg-gray-100 focus:bg-gray-200 focus:outline-none text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ lineHeight: 0 }}
                    onClick={e => {
                      e.stopPropagation();
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setContextMenu({ x: rect.left, y: rect.bottom + 4, tag });
                    }}
                    title="Tag options"
                    tabIndex={0}
                  >
                    <FiMoreHorizontal size={12} />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* No results message */}
      {searchQuery && filteredTags.length === 0 && (
        <div className="p-2 text-center text-gray-400 text-xs">
          No tags found matching &quot;{searchQuery}&quot;
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="text-blue-600 hover:bg-blue-50 px-3 py-2 rounded w-full text-left transition-colors"
            onClick={() => {
              if (onApplyTagToAll) onApplyTagToAll(contextMenu.tag.name);
              setContextMenu(null);
            }}
          >
            Apply Tag to All Matching Transactions
          </button>
          <button
            className="text-red-600 hover:bg-red-50 px-3 py-2 rounded w-full text-left transition-colors"
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
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="mb-4 text-lg font-semibold text-red-700">Delete Tag</div>
            <div className="mb-4 text-sm text-gray-600">Type <b>{deleteModal.tag.name}</b> to confirm deletion.</div>
            <input
              className="border border-gray-300 px-3 py-2 rounded-md w-full mb-4 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              autoFocus
              disabled={deleting}
            />
            <div className="flex gap-3 justify-end">
              <button 
                className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" 
                onClick={() => { setDeleteModal(null); setDeleteInput(''); }} 
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
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
