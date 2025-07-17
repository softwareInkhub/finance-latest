import React, { useState } from 'react';

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

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '__create__') {
      setCreating(true);
      setNewTagName('');
      onTagChange('');
    } else {
      setCreating(false);
      onTagChange(e.target.value);
    }
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
      <div className="flex gap-1 items-center">
        <select
          className="border px-2 py-1 rounded text-xs w-full sm:w-auto"
          value={creating ? '__create__' : selectedTagId}
          onChange={handleDropdownChange}
        >
          <option value="">Add tag...</option>
          {allTags.map(tag => (
            <option key={tag.id} value={tag.id} style={{ background: tag.color, color: '#222' }}>{tag.name}</option>
          ))}
          <option value="__create__">+ Create new tag...</option>
        </select>
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