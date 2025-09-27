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
      
      // Dispatch custom event to notify other components about tag deletion
      if (typeof window !== 'undefined') {
        console.log('Tags page: Dispatching tagDeleted event for:', singleDeleteTag.name);
        
        // Test if the event is being dispatched
        const testEvent = new CustomEvent('tagDeleted', {
          detail: { 
            tagId: singleDeleteTag.id,
            tagName: singleDeleteTag.name
          }
        });
        
        console.log('Event object created:', testEvent);
        window.dispatchEvent(testEvent);
        console.log('Tags page: tagDeleted event dispatched successfully');
        
        // Also dispatch a test event to verify event system is working
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('testTagEvent', {
            detail: { message: 'Test event from Tags page' }
          }));
        }, 100);
      }
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
      // Use Promise.allSettled to delete all tags in parallel
      const deletePromises = tagsToDelete.map(async (tagId, index) => {
        try {
          const res = await fetch('/api/tags', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: tagId }),
          });
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to delete tag ${tagId}`);
          }
          
          // Update progress
          setDeleteProgress({ current: index + 1, total: tagsToDelete.length });
          
          return { success: true, tagId };
        } catch (error) {
          console.error(`Error deleting tag ${tagId}:`, error);
          return { success: false, tagId, error };
        }
      });
      
      // Wait for all deletions to complete
      const results = await Promise.allSettled(deletePromises);
      
      // Check for any failures
      const failures = results
        .filter(result => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success))
        .map(result => result.status === 'fulfilled' ? result.value.error : result.reason);
      
      if (failures.length > 0) {
        console.warn('Some tags failed to delete:', failures);
        setError(`Failed to delete ${failures.length} out of ${tagsToDelete.length} tags`);
      }
      
      // Refresh the tags list
      await fetchTags();
      setSelectedTags(new Set());
      
      // Dispatch custom event to notify other components about bulk tag deletion
      if (typeof window !== 'undefined') {
        console.log('Tags page: Dispatching tagsBulkDeleted event for:', tagsToDelete.length, 'tags');
        window.dispatchEvent(new CustomEvent('tagsBulkDeleted', {
          detail: { 
            deletedTagIds: tagsToDelete,
            deletedCount: tagsToDelete.length
          }
        }));
        console.log('Tags page: tagsBulkDeleted event dispatched successfully');
      }
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
    <div className={`min-h-full p-4 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100' 
        : 'bg-gradient-to-br from-gray-50 via-white to-blue-50/30 text-gray-900'
    }`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-lg ${
              theme === 'dark' 
                ? 'bg-gradient-to-br from-purple-600 to-blue-600' 
                : 'bg-gradient-to-br from-blue-500 to-purple-600'
            } shadow-md`}>
              <RiPriceTag3Line className="text-white text-sm" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold mb-1 bg-gradient-to-r ${
                theme === 'dark' 
                  ? 'from-white to-gray-300' 
                  : 'from-gray-900 to-gray-700'
              } bg-clip-text text-transparent`}>
                Tags Management
              </h1>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>Create and manage tags for categorizing your transactions</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Add New Tag Form */}
        <div className={`mb-6 p-4 rounded-lg shadow-md border ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-gray-800/80 to-gray-700/80 border-gray-600/50 backdrop-blur-sm' 
            : 'bg-gradient-to-br from-white/90 to-gray-50/90 border-gray-200/50 backdrop-blur-sm'
        }`}>
          <h2 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>
            <div className={`p-1.5 rounded-md ${
              theme === 'dark' 
                ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                : 'bg-gradient-to-br from-green-400 to-emerald-500'
            } shadow-sm`}>
              <RiPriceTag3Line className="text-white text-sm" />
            </div>
            Add New Tag
          </h2>
          <form onSubmit={handleAddTag} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className={`block text-xs font-medium mb-1 uppercase tracking-wide ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Tag Name</label>
              <input
                type="text"
                value={newTag.name}
                onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                placeholder="Enter tag name..."
                className={`w-full px-3 py-2 rounded-md text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 shadow-sm ${
                  theme === 'dark' 
                    ? 'bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 hover:border-gray-500' 
                    : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-500 hover:border-gray-300'
                }`}
                required
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-md font-medium text-sm shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              Add Tag
            </button>
          </form>
        </div>

        {/* Search and Filters */}
        <div className="mb-4">
          <div className="flex gap-3 items-center">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className={`h-4 w-4 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-3 py-2 rounded-md text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 shadow-sm ${
                  theme === 'dark' 
                    ? 'bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 hover:border-gray-500' 
                    : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-500 hover:border-gray-300'
                }`}
              />
            </div>
            <div className={`px-3 py-1.5 rounded-md font-medium text-sm ${
              theme === 'dark' 
                ? 'bg-gray-700/50 text-gray-300 border border-gray-600' 
                : 'bg-gray-100 text-gray-700 border border-gray-200'
            }`}>
              {filteredTags.length} of {tags.length} tags
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedTags.size > 0 && (
          <div className={`mb-4 p-3 rounded-lg flex items-center justify-between shadow-md ${
            theme === 'dark'
              ? 'bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/30'
              : 'bg-gradient-to-r from-red-50 to-orange-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md ${
                theme === 'dark' 
                  ? 'bg-gradient-to-br from-red-500 to-orange-600' 
                  : 'bg-gradient-to-br from-red-400 to-orange-500'
              } shadow-sm`}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <span className={`font-semibold text-sm ${
                theme === 'dark' ? 'text-red-300' : 'text-red-700'
              }`}>
                {selectedTags.size} tag(s) selected
              </span>
            </div>
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-md font-medium text-sm shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {deleting ? 'Deleting...' : `Delete ${selectedTags.size} tag(s)`}
            </button>
          </div>
        )}

        {loading ? (
          <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <div className="text-sm font-semibold">Loading tags...</div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow-md">
            <table className={`min-w-full rounded-lg overflow-hidden ${
              theme === 'dark' 
                ? 'bg-gradient-to-br from-gray-800/90 to-gray-700/90 border border-gray-600/50' 
                : 'bg-gradient-to-br from-white/95 to-gray-50/95 border border-gray-200/50'
            }`}>
              <thead>
                <tr className={`${
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-gray-700/80 to-gray-600/80' 
                    : 'bg-gradient-to-r from-gray-100/80 to-gray-50/80'
                }`}>
                  <th className={`px-4 py-3 text-left font-semibold text-sm ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedTags.size === filteredTags.length && filteredTags.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className={`w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-1 ${
                        theme === 'dark' ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'
                      }`}
                    />
                  </th>
                  <th className={`px-4 py-3 text-left font-semibold text-sm ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                  }`}>Name</th>
                  <th className={`px-4 py-3 text-left font-semibold text-sm ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                  }`}>Color</th>
                  <th className={`px-4 py-3 text-left font-semibold text-sm ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                  }`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTags.map(tag => (
                  <tr key={tag.id} className={`hover:transition-all duration-200 group border-b ${
                    theme === 'dark' 
                      ? 'hover:bg-gradient-to-r hover:from-gray-700/50 hover:to-gray-600/50 border-gray-700/50' 
                      : 'hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-purple-50/80 border-gray-200/50'
                  }`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedTags.has(tag.id)}
                        onChange={(e) => handleSelectTag(tag.id, e.target.checked)}
                        className={`w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-1 transition-all ${
                          theme === 'dark' ? 'bg-gray-600 border-gray-500 hover:border-gray-400' : 'bg-white border-gray-300 hover:border-gray-400'
                        }`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {editingTag?.id === tag.id ? (
                        <form onSubmit={handleEdit} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className={`px-3 py-1.5 rounded-md text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 shadow-sm ${
                              theme === 'dark' 
                                ? 'border border-gray-600 bg-gray-700 text-white hover:border-gray-500' 
                                : 'border border-gray-300 bg-white text-gray-900 hover:border-gray-400'
                            }`}
                          />
                        </form>
                      ) : (
                        <span className={`font-medium text-sm ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>{tag.name || 'Unnamed Tag'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingTag?.id === tag.id ? (
                        <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className={`w-8 h-8 p-0.5 rounded-md border cursor-pointer shadow-md transition-all duration-200 ${
                          theme === 'dark' ? 'border-gray-600 bg-gray-700 hover:border-gray-500' : 'border-gray-300 bg-white hover:border-gray-400'
                        }`} />
                      ) : (
                        <span className={`inline-block w-8 h-8 rounded-md border shadow-md transition-all duration-200 ${
                          theme === 'dark' ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'
                        }`} style={{ background: tag.color }}></span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingTag?.id === tag.id ? (
                        <div className="flex gap-2">
                          <button 
                            className={`p-2 rounded-md shadow-md transition-all duration-200 transform hover:scale-105 ${
                              theme === 'dark' 
                                ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white hover:shadow-green-500/25' 
                                : 'bg-gradient-to-br from-green-400 to-emerald-500 text-white hover:shadow-green-400/25'
                            }`} 
                            onClick={handleEdit} 
                            title="Save"
                          >
                            <RiCheckLine size={16} />
                          </button>
                          <button 
                            className={`p-2 rounded-md shadow-md transition-all duration-200 transform hover:scale-105 ${
                              theme === 'dark' 
                                ? 'bg-gradient-to-br from-gray-600 to-gray-700 text-gray-300 hover:shadow-gray-500/25' 
                                : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white hover:shadow-gray-400/25'
                            }`} 
                            onClick={() => setEditingTag(null)} 
                            title="Cancel"
                          >
                            <RiCloseLine size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button 
                            className={`p-2 rounded-md shadow-md transition-all duration-200 transform hover:scale-105 ${
                              theme === 'dark' 
                                ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white hover:shadow-blue-500/25' 
                                : 'bg-gradient-to-br from-blue-400 to-purple-500 text-white hover:shadow-blue-400/25'
                            }`} 
                            onClick={() => startEdit(tag)} 
                            title="Edit"
                          >
                            <RiEdit2Line size={16} />
                          </button>
                          <button 
                            className={`p-2 rounded-md shadow-md transition-all duration-200 transform hover:scale-105 ${
                              theme === 'dark' 
                                ? 'bg-gradient-to-br from-red-500 to-pink-600 text-white hover:shadow-red-500/25' 
                                : 'bg-gradient-to-br from-red-400 to-pink-500 text-white hover:shadow-red-400/25'
                            }`} 
                            onClick={() => handleDelete(tag.id)} 
                            title="Delete"
                          >
                            <RiDeleteBin6Line size={16} />
                          </button>
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
                Are you sure you want to delete the tag &quot;{singleDeleteTag.name || 'Unnamed Tag'}&quot;? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSingleDeleteTag(null)}
                  className={`flex-1 px-4 py-2 border rounded-lg transition-colors ${
                    theme === 'dark' 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
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
            <div className={`rounded-xl shadow-xl p-6 w-full max-w-md mx-4 border ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <div className="text-center">
                <h3 className={`text-lg font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>Deleting Tags</h3>
                
                <div className="mb-6">
                  <div className={`flex justify-between text-sm mb-2 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <span>Progress</span>
                    <span>{deleteProgress.current} / {deleteProgress.total}</span>
                  </div>
                  <div className={`w-full rounded-full h-3 ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <div className={`text-sm mt-2 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
                  }`}>
                    {Math.round((deleteProgress.current / deleteProgress.total) * 100)}% Complete
                  </div>
                </div>

                <div className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
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