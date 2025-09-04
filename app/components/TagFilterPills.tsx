import React, { useState, useRef } from 'react';
import { FiMoreHorizontal, FiSearch, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';

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
  tagged?: number; // number of tagged transactions
  untagged?: number; // number of untagged transactions
  totalTags?: number; // total number of tags
  // New props for tagging functionality
  selectedCount?: number;
  selectedTagId?: string;
  onTagChange?: (tagId: string) => void;
  onAddTag?: () => void;
  tagging?: boolean;
  tagError?: string | null;
  tagSuccess?: string | null;
  onCreateTag?: (name: string) => Promise<string>;
  // New props for tagged/untagged click handlers
  onTaggedClick?: () => void;
  onUntaggedClick?: () => void;
  // New prop to track current sort order for visual feedback
  currentSortOrder?: string;
  // Props for Remove Tags functionality
  onRemoveTags?: () => void;
  removeTagsDisabled?: boolean;
}

const TagFilterPills: React.FC<TagFilterPillsProps> = ({ 
  allTags, 
  tagFilters, 
  onToggleTag, 
  // onClear is intentionally not destructured/used to avoid rendering the extra controls row
  onTagDeleted, 
  onApplyTagToAll, 
  tagStats, 
  tagged, 
  untagged, 
  totalTags,
  selectedCount = 0,
  selectedTagId = '',
  onTagChange,
  onAddTag,
  tagging = false,
  tagError,
  tagSuccess,
  onCreateTag,
  onTaggedClick,
  onUntaggedClick,
  currentSortOrder,
  onRemoveTags,
  removeTagsDisabled = false
}) => {
  const { theme } = useTheme();
  // Filter out tags with undefined or null names to prevent errors
  const validTags = allTags.filter(tag => tag && tag.name && typeof tag.name === 'string');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tag: Tag } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ tag: Tag } | null>(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Tagging controls state
  const [creating, setCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creatingTag, setCreatingTag] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close context menu on click outside
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setContextMenu(null);
    };
    if (contextMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSearchTerm('');
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

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
      // Broadcast globally so other pages (Reports, Super Bank) react immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tagDeleted', { detail: { id: deleteModal.tag.id, tagName: deleteModal.tag.name } }));
      }
      if (onTagDeleted) onTagDeleted();
    } catch {
      // Optionally show error
    } finally {
      setDeleting(false);
    }
  };

  const handleTagSelect = (tagId: string) => {
    if (tagId === '__create__') {
      setCreating(true);
      setNewTagName('');
      if (onTagChange) onTagChange('');
    } else {
      setCreating(false);
      if (onTagChange) onTagChange(tagId);
    }
    setShowDropdown(false);
    setSearchTerm('');
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !onCreateTag) {
      setCreateError('Enter tag name');
      return;
    }
    setCreateError(null);
    setCreatingTag(true);
    try {
      const newTagId = await onCreateTag(newTagName.trim());
      setCreating(false);
      setNewTagName('');
      if (onTagChange) onTagChange(newTagId);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create tag');
    } finally {
      setCreatingTag(false);
    }
  };

  // Filter tags based on search query
  const filteredTags = validTags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort tags for dropdown
  const sortedAndFilteredTags = validTags
    .filter(tag => 
      tag.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  // Show first 4 tags in first row, rest in second row when expanded
  const firstRowTags = filteredTags.slice(0, 4);
  const secondRowTags = filteredTags.slice(4);
  const hasMoreTags = filteredTags.length > 4;

  // Calculate tag statistics
  // Note: These variables were calculated but not used in the component

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-2 relative">
      {/* First row: Tags on left, controls on right */}
      <div className="flex items-center p-1 border-b border-gray-100 flex-wrap gap-2">
        {/* Left half - First 6 tag pills */}
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          {firstRowTags.map(tag => {
            const btnRef = React.createRef<HTMLButtonElement>();
            const count = tagStats ? tagStats[tag.name] : undefined;
            return (
              <span key={tag.id} className="relative inline-flex items-center group flex-shrink-0">
                <button
                  className={`px-1.5 py-0.5 rounded text-xs font-medium border transition-all duration-150 ${tagFilters.includes(tag.name) ? 'scale-105 shadow-sm' : 'hover:scale-105 hover:shadow-sm'}`}
                  style={{
                    backgroundColor: tagFilters.includes(tag.name) ? tag.color || '#6366F1' : `${tag.color || '#6366F1'}30`,
                    color: theme === 'dark' ? '#ffffff' : '#000000',
                    borderColor: tag.color || '#6366F1',
                    borderWidth: '2px'
                  }}
                  onClick={() => onToggleTag(tag.name)}
                  title={`${tagFilters.includes(tag.name) ? 'Remove' : 'Add'} filter for ${tag.name} (${count || 0} transactions)`}
                >
                  {tag.name}
                  {typeof count === 'number' && (
                    <span 
                      className="ml-1 bg-white/90 border rounded-full px-0.5 text-[9px] font-bold align-middle inline-block min-w-[12px] text-center text-black"
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
              className="px-2 py-1 text-xs text-gray-500 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer flex-shrink-0"
              title={`Click to show ${filteredTags.length - 4} more tags`}
            >
              +{filteredTags.length - 4} more
            </button>
          )}
        </div>

        {/* Right half - Controls and statistics */}
        <div className="flex items-center gap-2 flex-wrap">
          
                     {/* Tag Statistics */}
           {typeof tagged !== 'undefined' && typeof untagged !== 'undefined' && typeof totalTags !== 'undefined' && (
             <div className="flex items-center gap-2 text-xs text-gray-600 flex-shrink-0">
                {/* Search bar placed to the LEFT of Tagged */}
                <div className="relative flex-shrink-0">
                  <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={12} />
                  <input
                    type="text"
                    placeholder="Q Search tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-32 pl-6 pr-2 py-0.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <button
                  onClick={onTaggedClick}
                  className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                    currentSortOrder === 'tagged' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                  }`}
                  title={currentSortOrder === 'tagged' ? 'Click to show all transactions' : 'Show tagged transactions only'}
                >
                  Tagged: {tagged}
                </button>
                
                <button
                  onClick={onUntaggedClick}
                  className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                    currentSortOrder === 'untagged' 
                      ? 'bg-gray-600 text-white' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  title={currentSortOrder === 'untagged' ? 'Click to show all transactions' : 'Show untagged transactions only'}
                >
                  Untagged: {untagged}
                </button>
                <span>Total Tags: {totalTags}</span>
             </div>
           )}

          {/* Tagging Controls - Only show if props are provided */}
          {selectedCount !== undefined && onTagChange && onAddTag && (
            <div className="flex items-center gap-1 flex-wrap">
              <div className="flex gap-1 items-center relative">
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    className="border px-1.5 py-0.5 rounded text-xs w-full sm:w-auto bg-white flex items-center justify-between min-w-[100px]"
                    onClick={() => setShowDropdown(!showDropdown)}
                    title="Select a tag to apply to selected transactions"
                  >
                    <span>{selectedTagId ? allTags.find(t => t.id === selectedTagId)?.name || 'Add tag...' : 'Add tag...'}</span>
                    <span className="ml-2">▼</span>
                  </button>
                  
                  {showDropdown && (
                    <div className="absolute top-full left-0 bg-white border border-gray-300 rounded shadow-lg z-[9999] max-h-60 overflow-y-auto min-w-64 w-80">
                      {/* Search Input */}
                      <div className="p-2 border-b border-gray-200">
                        <input
                          type="text"
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                          placeholder="Search tags..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          autoFocus
                        />
                      </div>
                      
                      {/* Create New Tag Option - Pinned at Bottom */}
                      <div className="border-b border-gray-200">
                        <button
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 text-blue-600 font-medium"
                          onClick={() => handleTagSelect('__create__')}
                          title="Create a new tag for organizing transactions"
                        >
                          + Create new tag...
                        </button>
                      </div>
                      
                      {/* Tag Options */}
                      <div className="max-h-40 overflow-y-auto">
                        {sortedAndFilteredTags.length > 0 ? (
                          sortedAndFilteredTags.map(tag => (
                            <button
                              key={tag.id}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center gap-2"
                              onClick={() => handleTagSelect(tag.id)}
                            >
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: tag.color || '#3B82F6' }}
                              ></div>
                              {tag.name}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-gray-500">
                            {searchTerm ? 'No tags found' : 'No tags available'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-1 items-center w-full sm:w-auto">
                  {creating && (
                    <div className="flex flex-col sm:flex-row gap-1 items-start sm:items-center w-full sm:w-auto">
                      <input
                        type="text"
                        className="border px-2 py-1 rounded text-xs w-full sm:w-auto"
                        placeholder="New tag name"
                        value={newTagName}
                        onChange={e => setNewTagName(e.target.value)}
                        disabled={creatingTag}
                        autoFocus
                      />
                      <button
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold disabled:opacity-50 whitespace-nowrap"
                        onClick={handleCreateTag}
                        disabled={creatingTag || !newTagName.trim()}
                        title="Create the new tag with the entered name"
                      >
                        {creatingTag ? 'Creating...' : 'Create'}
                      </button>
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={onAddTag}
                    disabled={tagging || !selectedTagId}
                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-green-600/50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    title={selectedTagId ? `Apply tag to ${selectedCount} selected transaction(s)` : 'Select a tag first'}
                  >
                    Add Tag
                  </button>
                  
                  <button
                    type="button"
                    onClick={onRemoveTags}
                    disabled={removeTagsDisabled || selectedCount === 0}
                    className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:bg-red-600/50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    title={selectedCount > 0 ? `Remove tags from ${selectedCount} selected transaction(s)` : 'No transactions selected'}
                  >
                    Remove Tags
                  </button>
                </div>
              </div>
              
              {selectedCount > 0 && (
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {selectedCount} selected
                </span>
              )}
              
              {createError && <span className="text-red-600 text-xs">{createError}</span>}
              {tagError && <span className="text-red-600 text-xs">{tagError}</span>}
              {tagSuccess && <span className="text-green-600 text-xs">{tagSuccess}</span>}
            </div>
          )}

          {/* Expand / Collapse arrow */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-1 p-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100"
            title={isExpanded ? 'Collapse tag list' : 'Expand tag list'}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Second row - Additional tags when expanded */}
      {isExpanded && secondRowTags.length > 0 && (
        <div className="p-1 border-b border-gray-100">
          <div className="flex flex-wrap gap-2 items-center">
            {secondRowTags.map(tag => {
              const btnRef = React.createRef<HTMLButtonElement>();
              const count = tagStats ? tagStats[tag.name] : undefined;
              return (
                <span key={tag.id} className="relative inline-flex items-center group flex-shrink-0">
                  <button
                    className={`px-1.5 py-0.5 rounded text-xs font-medium border transition-all duration-150 ${tagFilters.includes(tag.name) ? 'scale-105 shadow-sm' : 'hover:scale-105 hover:shadow-sm'}`}
                    style={{
                      backgroundColor: tagFilters.includes(tag.name) ? tag.color || '#6366F1' : `${tag.color || '#6366F1'}30`,
                      color: theme === 'dark' ? '#ffffff' : '#000000',
                      borderColor: tag.color || '#6366F1',
                      borderWidth: '2px'
                    }}
                    onClick={() => onToggleTag(tag.name)}
                    title={`${tagFilters.includes(tag.name) ? 'Remove' : 'Add'} filter for ${tag.name} (${count || 0} transactions)`}
                  >
                    {tag.name}
                    {typeof count === 'number' && (
                      <span 
                        className="ml-1 bg-white/90 border rounded-full px-0.5 text-[9px] font-bold align-middle inline-block min-w-[12px] text-center text-black"
                        style={{
                          borderColor: tag.color || '#6366F1',
                          color: 'black'
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

      {/* Controls row removed to avoid blank extra row under pills */}

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
                disabled={deleteInput.trim().toLowerCase() !== (deleteModal.tag.name || '').toLowerCase() || deleting}
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
