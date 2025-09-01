'use client'
import { useEffect, useState } from 'react';
import { RiEdit2Line, RiDeleteBin6Line, RiCheckLine, RiCloseLine, RiPriceTag3Line } from 'react-icons/ri';
import { useTheme } from '../contexts/ThemeContext';

interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export default function TagsPage() {
  const { theme } = useTheme();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState({ name: '', color: '' });
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#60a5fa');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
  const [singleDeleteTag, setSingleDeleteTag] = useState<Tag | null>(null);

  const fetchTags = async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError('User ID not found. Please log in again.');
        setTags([]);
        return;
      }
      
      const res = await fetch(`/api/tags?userId=${userId}`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      if (Array.isArray(data)) {
        setTags(data);
      } else {
        setTags([]);
        setError(data.error || 'Failed to fetch tags');
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      setTags([]);
      setError(error instanceof Error ? error.message : 'Failed to fetch tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTags(); }, []);

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.name.trim()) return;
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTag.name, userId }), // color will be auto-assigned
      });
      if (!res.ok) throw new Error('Failed to add tag');
      setNewTag({ name: '', color: '' });
      fetchTags();
    } catch {
      setError('Failed to add tag');
    }
  };

  const handleDelete = async (id: string) => {
    const tag = tags.find(t => t.id === id);
    if (tag) {
      setSingleDeleteTag(tag);
    }
  };

  const confirmSingleDelete = async () => {
    if (!singleDeleteTag) return;
    
    setDeleting(true);
    setError(null); // Clear any previous errors
    try {
      const res = await fetch('/api/tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: singleDeleteTag.id }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      await fetchTags();
      setSingleDeleteTag(null);
    } catch (error) {
      console.error('Error deleting tag:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete tag');
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag || !editName.trim()) return;
    
    try {
      const res = await fetch('/api/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingTag.id, name: editName, color: editColor }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      await fetchTags();
      setEditingTag(null);
      setEditName('');
      setEditColor('#60a5fa');
      
      // Dispatch custom event to notify reports page to refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tagUpdated', {
          detail: { 
            oldName: editingTag.name, 
            newName: editName,
            tagId: editingTag.id 
          }
        }));
      }
    } catch (error) {
      console.error('Error updating tag:', error);
      setError(error instanceof Error ? error.message : 'Failed to update tag');
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingTag(tag);
    setEditName(tag.name || '');
    setEditColor(tag.color || '#60a5fa');
  };

  const handleSelectTag = (tagId: string, checked: boolean) => {
    const newSelected = new Set(selectedTags);
    if (checked) {
      newSelected.add(tagId);
    } else {
      newSelected.delete(tagId);
    }
    setSelectedTags(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTags(new Set(filteredTags.map(tag => tag.id)));
    } else {
      setSelectedTags(new Set());
    }
  };

  const handleBulkDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    setShowDeleteModal(false);
    setDeleting(true);
    setError(null);
    
    const tagsToDelete = Array.from(selectedTags);
    setDeleteProgress({ current: 0, total: tagsToDelete.length });
    
    try {
      for (let i = 0; i < tagsToDelete.length; i++) {
        const tagId = tagsToDelete[i];
        const res = await fetch('/api/tags', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: tagId }),
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to delete tag ${tagId}`);
        }
        
        setDeleteProgress({ current: i + 1, total: tagsToDelete.length });
      }
      
      await fetchTags();
      setSelectedTags(new Set());
    } catch (error) {
      console.error('Error during bulk delete:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete some tags');
    } finally {
      setDeleting(false);
      setDeleteProgress({ current: 0, total: 0 });
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.name && tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`min-h-screen p-4 ${
      theme === 'dark' 
        ? 'bg-gray-900 text-gray-100' 
        : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900'
    }`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>Tags Management</h1>
          <p className={`${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>Create and manage tags for categorizing your transactions</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Add New Tag Form */}
        <div className={`mb-8 p-6 backdrop-blur-lg rounded-xl shadow border ${
          theme === 'dark' 
            ? 'bg-gray-800/50 border-gray-700' 
            : 'bg-white/70 border-gray-100'
        }`}>
          <h2 className={`text-xl font-semibold mb-4 flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>
            <RiPriceTag3Line className="text-blue-400" />
            Add New Tag
          </h2>
          <form onSubmit={handleAddTag} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Tag Name</label>
              <input
                type="text"
                value={newTag.name}
                onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                placeholder="Enter tag name..."
                className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                required
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add Tag
            </button>
          </form>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
            <div className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {filteredTags.length} of {tags.length} tags
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedTags.size > 0 && (
          <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg flex items-center justify-between">
            <span className="text-blue-300 font-medium">
              {selectedTags.size} tag(s) selected
            </span>
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {deleting ? 'Deleting...' : `Delete ${selectedTags.size} tag(s)`}
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`min-w-full backdrop-blur-lg rounded-xl shadow border text-sm ${
              theme === 'dark' 
                ? 'bg-gray-800/50 border-gray-700' 
                : 'bg-white/70 border-gray-100'
            }`}>
              <thead>
                <tr>
                  <th className={`px-4 py-2 text-left font-semibold ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedTags.size === filteredTags.length && filteredTags.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className={`w-4 h-4 text-blue-600 rounded focus:ring-blue-500 focus:ring-2 ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      }`}
                    />
                  </th>
                  <th className={`px-4 py-2 text-left font-semibold ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>Name</th>
                  <th className={`px-4 py-2 text-left font-semibold ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>Color</th>
                  <th className={`px-4 py-2 text-left font-semibold ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTags.map(tag => (
                  <tr key={tag.id} className={`hover:transition-all group border-b ${
                    theme === 'dark' 
                      ? 'hover:bg-gray-700/50 border-gray-700' 
                      : 'hover:bg-blue-50/60 border-gray-200'
                  }`}>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedTags.has(tag.id)}
                        onChange={(e) => handleSelectTag(tag.id, e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                      />
                    </td>
                    <td className="px-4 py-2">
                      {editingTag?.id === tag.id ? (
                        <form onSubmit={handleEdit} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="border border-gray-600 bg-gray-700 px-2 py-1 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white"
                          />
                        </form>
                      ) : (
                        <span className={`font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>{tag.name || 'Unnamed Tag'}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingTag?.id === tag.id ? (
                        <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-8 h-8 p-0.5 rounded-lg border border-gray-600 cursor-pointer bg-gray-700" />
                      ) : (
                        <span className="inline-block w-7 h-7 rounded-lg border border-gray-600 shadow" style={{ background: tag.color }}></span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingTag?.id === tag.id ? (
                        <div className="flex gap-2">
                          <button className="text-green-400 hover:bg-green-900/30 p-2 rounded-full transition" onClick={handleEdit} title="Save"><RiCheckLine size={18} /></button>
                          <button className="text-gray-400 hover:bg-gray-700 p-2 rounded-full transition" onClick={() => setEditingTag(null)} title="Cancel"><RiCloseLine size={18} /></button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button className="text-blue-400 hover:bg-blue-900/30 p-2 rounded-full transition" onClick={() => startEdit(tag)} title="Edit"><RiEdit2Line size={18} /></button>
                          <button className="text-red-400 hover:bg-red-900/30 p-2 rounded-full transition" onClick={() => handleDelete(tag.id)} title="Delete"><RiDeleteBin6Line size={18} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Custom Delete Modal for Bulk Delete */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`rounded-xl shadow-xl p-6 w-full max-w-md mx-4 border ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>Confirm Deletion</h3>
              </div>
              <p className={`mb-6 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Are you sure you want to delete {selectedTags.size} tag(s)? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className={`flex-1 px-4 py-2 border rounded-lg transition-colors ${
                    theme === 'dark' 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  {deleting ? 'Deleting...' : 'Delete Tags'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Single Delete Modal */}
        {singleDeleteTag && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Confirm Deletion</h3>
              </div>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete the tag &quot;{singleDeleteTag.name || 'Unnamed Tag'}&quot;? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSingleDeleteTag(null)}
                  className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSingleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  {deleting ? 'Deleting...' : 'Delete Tag'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Progress Modal for Bulk Delete */}
        {deleting && deleteProgress.total > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4 border border-gray-700">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-4">Deleting Tags</h3>
                
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>Progress</span>
                    <span>{deleteProgress.current} / {deleteProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    {Math.round((deleteProgress.current / deleteProgress.total) * 100)}% Complete
                  </div>
                </div>

                <div className="text-sm text-gray-400">
                  Please wait while tags are being deleted...
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 