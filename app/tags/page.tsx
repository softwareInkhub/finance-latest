'use client'
import { useEffect, useState } from 'react';
import { RiEdit2Line, RiDeleteBin6Line, RiCheckLine, RiCloseLine, RiPriceTag3Line } from 'react-icons/ri';

interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export default function TagsPage() {
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

  const [singleDeleteTag, setSingleDeleteTag] = useState<Tag | null>(null);

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
      
      // Tag deletion initiated successfully - backend will handle cleanup asynchronously
      console.log(`Tag deletion initiated for: ${singleDeleteTag.name}`);
      
      // Wait a bit longer for backend operations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchTags();
      
      // Show success message
      setError(null);
      // You could add a success state here if needed
    } catch (error) {
      console.error('Error deleting tag:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete tag');
    } finally {
      setDeleting(false);
      setSingleDeleteTag(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTags.size === 0) return;
    
    // Show custom modal instead of browser confirm
    setShowDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    setShowDeleteModal(false);
    setDeleting(true);
    setDeleteProgress({ current: 0, total: selectedTags.size });
    setError(null); // Clear any previous errors
    
    try {
      const selectedTagsArray = Array.from(selectedTags);
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < selectedTagsArray.length; i++) {
        const id = selectedTagsArray[i];
        try {
          const res = await fetch('/api/tags', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          });
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
          }
          
          successCount++;
          console.log(`Tag deletion initiated for ID: ${id}`);
        } catch (error) {
          console.error(`Error deleting tag ${id}:`, error);
          errorCount++;
        }
        
        // Update progress
        setDeleteProgress({ current: i + 1, total: selectedTagsArray.length });
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setSelectedTags(new Set());
      
      // Wait longer for backend operations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchTags();
      
      if (errorCount > 0) {
        setError(`Deleted ${successCount} tags successfully. ${errorCount} tags failed to delete.`);
      } else {
        setError(null); // Clear any previous errors
      }
    } catch (error) {
      console.error('Error in bulk delete:', error);
      setError('Failed to delete some tags');
    } finally {
      setDeleting(false);
      setDeleteProgress({ current: 0, total: 0 });
    }
  };

  // Filter tags based on search query
  const filteredTags = tags.filter(tag =>
    tag.name && tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTags(new Set(filteredTags.map(tag => tag.id)));
    } else {
      setSelectedTags(new Set());
    }
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

  const startEdit = (tag: Tag) => {
    setEditingTag(tag);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag) return;
    try {
      await fetch('/api/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingTag.id, name: editName, color: editColor }),
      });
      setEditingTag(null);
      fetchTags();
    } catch {
      setError('Failed to update tag');
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-10 px-2 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-blue-100 p-2 rounded-full text-blue-500 text-2xl shadow">
            <RiPriceTag3Line />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Tag Management</h1>
        </div>
        <form onSubmit={handleAddTag} className="flex flex-row gap-2 mb-6 bg-white/70 backdrop-blur-lg p-4 rounded-xl shadow border border-blue-100 items-center">
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              placeholder="Tag name"
              className="border border-gray-200 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none transition-all w-64"
              value={newTag.name}
              onChange={e => setNewTag({ ...newTag, name: e.target.value })}
            />
            <div className="text-xs text-gray-500 px-2 py-2">
              Color will be auto-assigned
            </div>
          </div>
          <button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-5 py-2 rounded-lg shadow hover:scale-105 hover:shadow-lg transition-all font-semibold whitespace-nowrap ml-auto">Add Tag</button>
        </form>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        
        {/* Search Bar */}
        <div className="mb-4 bg-white/70 backdrop-blur-lg p-4 rounded-xl shadow border border-blue-100">
          <div className="relative">
            <input
              type="text"
              placeholder="Search tags..."
              className="w-full border border-gray-200 px-4 py-2 pl-10 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="mt-2 text-sm text-gray-600">
              Found {filteredTags.length} tag(s) matching &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
        
        {/* Bulk Actions */}
        {selectedTags.size > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <span className="text-blue-800 font-medium">
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
          <div>Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white/70 backdrop-blur-lg rounded-xl shadow border border-gray-100 text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedTags.size === filteredTags.length && filteredTags.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Color</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTags.map(tag => (
                  <tr key={tag.id} className="hover:bg-blue-50/60 transition-all group">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedTags.has(tag.id)}
                        onChange={(e) => handleSelectTag(tag.id, e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                    </td>
                    <td className="px-4 py-2">
                      {editingTag?.id === tag.id ? (
                        <form onSubmit={handleEdit} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="border border-gray-200 px-2 py-1 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                          />
                        </form>
                      ) : (
                        <span className="font-medium text-gray-800">{tag.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingTag?.id === tag.id ? (
                        <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-8 h-8 p-0.5 rounded-lg border border-gray-200 cursor-pointer" />
                      ) : (
                        <span className="inline-block w-7 h-7 rounded-lg border border-gray-200 shadow" style={{ background: tag.color }}></span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingTag?.id === tag.id ? (
                        <div className="flex gap-2">
                          <button className="text-green-600 hover:bg-green-50 p-2 rounded-full transition" onClick={handleEdit} title="Save"><RiCheckLine size={18} /></button>
                          <button className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition" onClick={() => setEditingTag(null)} title="Cancel"><RiCloseLine size={18} /></button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition" onClick={() => startEdit(tag)} title="Edit"><RiEdit2Line size={18} /></button>
                          <button className="text-red-600 hover:bg-red-50 p-2 rounded-full transition" onClick={() => handleDelete(tag.id)} title="Delete"><RiDeleteBin6Line size={18} /></button>
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
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Confirm Deletion</h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <RiCloseLine size={20} />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Are you sure you want to delete <span className="font-semibold text-red-600">{selectedTags.size} selected tag(s)</span>?
                </p>
                <p className="text-sm text-gray-500">
                  This action cannot be undone. All references to these tags will also be removed.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                >
                  Delete {selectedTags.size} Tag(s)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Delete Modal for Single Tag */}
        {singleDeleteTag && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Confirm Deletion</h3>
                <button
                  onClick={() => setSingleDeleteTag(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <RiCloseLine size={20} />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Are you sure you want to delete the tag <span className="font-semibold text-red-600">&quot;{singleDeleteTag.name}&quot;</span>?
                </p>
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-block w-6 h-6 rounded border border-gray-200" style={{ background: singleDeleteTag.color }}></span>
                  <span className="text-gray-800">{singleDeleteTag.name}</span>
                </div>
                <p className="text-sm text-gray-500">
                  This action cannot be undone. All references to this tag will also be removed.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSingleDeleteTag(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Deleting Tags</h3>
                
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progress</span>
                    <span>{deleteProgress.current} / {deleteProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    {Math.round((deleteProgress.current / deleteProgress.total) * 100)}% Complete
                  </div>
                </div>

                <div className="text-sm text-gray-600">
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