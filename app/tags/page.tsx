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
  const [newTag, setNewTag] = useState({ name: '', color: '#60a5fa' });
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#60a5fa');

  const fetchTags = async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/tags?userId=${userId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTags(data);
      } else {
        setTags([]);
        setError(data.error || 'Failed to fetch tags');
      }
    } catch {
      setTags([]);
      setError('Failed to fetch tags');
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
        body: JSON.stringify({ ...newTag, userId }),
      });
      if (!res.ok) throw new Error('Failed to add tag');
      setNewTag({ name: '', color: '#60a5fa' });
      fetchTags();
    } catch {
      setError('Failed to add tag');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this tag?')) return;
    try {
      await fetch('/api/tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchTags();
    } catch {
      setError('Failed to delete tag');
    }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-10 px-2">
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
            <input
              type="color"
              value={newTag.color}
              onChange={e => setNewTag({ ...newTag, color: e.target.value })}
              className="w-10 h-10 p-1 rounded-lg border border-gray-200 cursor-pointer"
            />
          </div>
          <button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-5 py-2 rounded-lg shadow hover:scale-105 hover:shadow-lg transition-all font-semibold whitespace-nowrap ml-auto">Add Tag</button>
        </form>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white/70 backdrop-blur-lg rounded-xl shadow border border-gray-100 text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Color</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tags.map(tag => (
                  <tr key={tag.id} className="hover:bg-blue-50/60 transition-all group">
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
      </div>
    </div>
  );
} 