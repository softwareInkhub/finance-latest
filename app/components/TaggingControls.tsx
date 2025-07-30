import React, { useState, useMemo, useEffect, useRef } from 'react';

interface Tag {
  id: string;
  name: string;
  color?: string;
}

interface TaggingControlsProps {
  allTags: Tag[];
  selectedTagId: string;
  onTagChange: (tagId: string) => void;
  onAddTag: () => void;
  selectedCount: number;
  tagging?: boolean;
  tagError?: string | null;
  tagSuccess?: string | null;
  onCreateTag: (name: string) => Promise<string>;
}

const TaggingControls: React.FC<TaggingControlsProps> = ({
  allTags,
  selectedTagId,
  onTagChange,
  onAddTag,
  selectedCount,
  tagging,
  tagError,
  tagSuccess,
  onCreateTag,
}) => {
  const [creating, setCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creatingTag, setCreatingTag] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sort tags alphabetically and filter by search term
  const sortedAndFilteredTags = useMemo(() => {
    return allTags
      .filter(tag => 
        tag.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }, [allTags, searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
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

  const handleTagSelect = (tagId: string) => {
    if (tagId === '__create__') {
      setCreating(true);
      setNewTagName('');
      onTagChange('');
    } else {
      setCreating(false);
      onTagChange(tagId);
    }
    setShowDropdown(false);
    setSearchTerm('');
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      setCreateError('Enter tag name');
      return;
    }
    setCreateError(null);
    setCreatingTag(true);
    try {
      const newTagId = await onCreateTag(newTagName.trim());
      setCreating(false);
      setNewTagName('');
      onTagChange(newTagId);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create tag');
    } finally {
      setCreatingTag(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center mb-2 bg-gray-50 px-3 py-2 rounded shadow">
      <span className="text-sm">{selectedCount} selected</span>
      <div className="flex gap-1 items-center relative">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            className="border px-2 py-1 rounded text-xs w-full sm:w-auto bg-white flex items-center justify-between min-w-[120px]"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <span>{selectedTagId ? allTags.find(t => t.id === selectedTagId)?.name || 'Add tag...' : 'Add tag...'}</span>
            <span className="ml-2">▼</span>
          </button>
          
          {showDropdown && (
            <div className="absolute top-full left-0 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-60 overflow-y-auto min-w-64 w-80">
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
        {creating && (
          <>
            <input
              type="text"
              className="border px-2 py-1 rounded text-xs"
              placeholder="New tag name"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              disabled={creatingTag}
              autoFocus
            />
            <button
              className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold disabled:opacity-50"
              onClick={handleCreateTag}
              disabled={creatingTag || !newTagName.trim()}
            >
              {creatingTag ? 'Creating...' : 'Create'}
            </button>
          </>
        )}
      </div>
      {createError && <span className="text-red-600 text-xs">{createError}</span>}
      <button
        className="px-3 py-1 bg-green-600 text-white rounded text-xs font-semibold disabled:opacity-50 w-full sm:w-auto"
        onClick={onAddTag}
        disabled={tagging || !selectedTagId}
      >
        Add Tag
      </button>
      {tagError && <span className="text-red-600 text-sm">{tagError}</span>}
      {tagSuccess && <span className="text-green-600 text-sm">{tagSuccess}</span>}
    </div>
  );
};

export default TaggingControls; 