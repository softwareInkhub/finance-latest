'use client';
import { useEffect, useState } from 'react';
import { RiMenuFoldLine, RiMenuUnfoldLine, RiAddLine, RiEdit2Line, RiDeleteBin6Line, RiCheckLine, RiCloseLine } from 'react-icons/ri';
import ConfirmEntityDeleteModal from './Modals/ConfirmEntityDeleteModal';

interface FileItem {
  id: string;
  fileName: string;
  versions?: { id: string; versionName: string }[];
}

interface BankItem {
  id: string;
  fileName: string;
}

interface StatementItem {
  id: string;
  fileName: string;
  fileType: string;
  bankId: string;
  accountId: string;
}

interface FilesSidebarProps {
  files: BankItem[];
  selectedFileId: string | null;
  onFileClick: (file: FileItem) => void;
  statements: StatementItem[];
}

export default function FilesSidebar({ files, selectedFileId, onFileClick, statements }: FilesSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [entities, setEntities] = useState<string[]>([]);
  const [isInlineCreating, setIsInlineCreating] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [editingEntity, setEditingEntity] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';
        if (!userId) return;
        const res = await fetch(`/api/entities/list?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.entities)) setEntities(data.entities);
      } catch {}
    };
    load();
  }, []);

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} min-h-screen bg-white dark:bg-gray-800/90 backdrop-blur-sm border-r border-gray-200 dark:border-gray-700/50 flex flex-col shadow-lg transition-all duration-300`}>
      {/* Sidebar Header with Collapse Button */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isCollapsed && (
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Files</h2>
                <p className="text-xs text-gray-600 dark:text-gray-400">Manage documents</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <RiMenuUnfoldLine className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            ) : (
              <RiMenuFoldLine className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <div className="space-y-1">
          {/* All Files Button */}
          <button 
            className={`flex items-center gap-2 px-3 py-2 rounded-lg w-full text-left transition-all duration-200 ${
              selectedFileId === 'all' 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
            }`}
            onClick={() => onFileClick({ id: 'all', fileName: 'All Files' })}
            title={isCollapsed ? "All Files" : ""}
          >
            <div className={`w-2 h-2 rounded-full ${
              selectedFileId === 'all' ? 'bg-white' : 'bg-gray-500 dark:bg-gray-400'
            }`}></div>
            {!isCollapsed && (
              <div>
                <div className="font-semibold text-sm">All Files</div>
                <div className="text-xs opacity-75">{statements.length} files</div>
              </div>
            )}
          </button>

          {/* Banks Section */}
          <div className="mt-4">
            {!isCollapsed && (
              <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2 px-3">Banks</h3>
            )}
            <div className="space-y-1">
              {files.map((bank) => (
                <button
                  key={bank.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg w-full text-left transition-all duration-200 ${
                    selectedFileId === bank.id 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  onClick={() => onFileClick(bank)}
                  title={isCollapsed ? bank.fileName : ""}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    selectedFileId === bank.id ? 'bg-white' : 'bg-gray-500 dark:bg-gray-400'
                  }`}></div>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{bank.fileName}</div>
                      <div className="text-xs opacity-75">
                        {statements.filter(s => s.bankId === bank.id).length} files
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Entities Section */}
          <div className="mt-6">
            {!isCollapsed && (
              <div className="flex items-center justify-between px-3 mb-2">
                <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Entities</h3>
                <button
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => { setIsInlineCreating(true); setNewEntityName(''); }}
                  title="Create Entity"
                >
                  <RiAddLine className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                </button>
              </div>
            )}
            <div className="space-y-1">
              {isInlineCreating && (
                <div className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm overflow-hidden w-56">
                  <input
                    autoFocus
                    value={newEntityName}
                    onChange={(e) => setNewEntityName(e.target.value)}
                    onBlur={() => {
                      // If user leaves the field empty, cancel inline creation
                      if (!newEntityName.trim()) {
                        setIsInlineCreating(false);
                        setNewEntityName('');
                      }
                    }}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        const cleaned = newEntityName.trim();
                        const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';
                        if (!cleaned || !userId) { setIsInlineCreating(false); return; }
                        try {
                          const res = await fetch('/api/entities/create', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId, entityName: cleaned })
                          });
                          if (!res.ok) throw new Error('create failed');
                          setEntities(prev => Array.from(new Set([...prev, cleaned])));
                        } catch {}
                        setIsInlineCreating(false);
                        setNewEntityName('');
                      } else if (e.key === 'Escape') {
                        setIsInlineCreating(false);
                        setNewEntityName('');
                      }
                    }}
                    placeholder="New entity name"
                    className="flex-1 bg-transparent border-0 px-2 py-1 text-sm focus:outline-none focus:ring-0 placeholder-gray-400"
                  />
                  <button
                    className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 shrink-0"
                    title="Create"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={async () => {
                      const cleaned = newEntityName.trim();
                      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';
                      if (!cleaned || !userId) { setIsInlineCreating(false); setNewEntityName(''); return; }
                      try {
                        const res = await fetch('/api/entities/create', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId, entityName: cleaned })
                        });
                        if (!res.ok) throw new Error('create failed');
                        setEntities(prev => Array.from(new Set([...prev, cleaned])));
                      } catch {}
                      setIsInlineCreating(false);
                      setNewEntityName('');
                    }}
                  >
                    <RiCheckLine className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
                    title="Cancel"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setIsInlineCreating(false); setNewEntityName(''); }}
                  >
                    <RiCloseLine className="w-4 h-4" />
                  </button>
                </div>
              )}
              {entities.map((entity) => (
                <div
                  key={entity}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg w-full cursor-pointer transition-all duration-200 ${
                    selectedFileId === `entity:${entity}` 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  onClick={() => onFileClick({ id: `entity:${entity}`, fileName: entity })}
                  title={isCollapsed ? entity : ''}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    selectedFileId === `entity:${entity}` ? 'bg-white' : 'bg-gray-500 dark:bg-gray-400'
                  }`}></div>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      {editingEntity === entity ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const cleaned = editingName.trim();
                                if (cleaned && cleaned !== entity) {
                                  setEntities(prev => prev.map(x => x === entity ? cleaned : x));
                                  fetch('/api/entities/rename', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : ''), oldName: entity, newName: cleaned })
                                  }).catch(() => {});
                                }
                                setEditingEntity(null);
                              } else if (e.key === 'Escape') {
                                setEditingEntity(null);
                              }
                            }}
                            onBlur={() => {
                              const cleaned = editingName.trim();
                              if (cleaned && cleaned !== entity) {
                                setEntities(prev => prev.map(x => x === entity ? cleaned : x));
                                fetch('/api/entities/rename', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ userId: (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : ''), oldName: entity, newName: cleaned })
                                }).catch(() => {});
                              }
                              setEditingEntity(null);
                            }}
                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
                          />
                          <button
                            className="p-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                            title="Save"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              const cleaned = editingName.trim();
                              if (cleaned && cleaned !== entity) {
                                setEntities(prev => prev.map(x => x === entity ? cleaned : x));
                                fetch('/api/entities/rename', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ userId: (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : ''), oldName: entity, newName: cleaned })
                                }).catch(() => {});
                              }
                              setEditingEntity(null);
                            }}
                          >
                            <RiCheckLine className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Cancel"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setEditingEntity(null)}
                          >
                            <RiCloseLine className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="font-semibold text-sm truncate">{entity}</div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <span
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                              title="Rename"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingEntity(entity);
                                setEditingName(entity);
                              }}
                            >
                              <RiEdit2Line className="w-4 h-4" />
                            </span>
                            <span
                              className="p-1 rounded hover:bg-red-100 text-red-600 dark:hover:bg-red-900/40"
                              title="Delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPendingDelete(entity);
                                setDeleteModalOpen(true);
                              }}
                            >
                              <RiDeleteBin6Line className="w-4 h-4" />
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Confirm Entity Delete Modal */}
      <ConfirmEntityDeleteModal
        isOpen={deleteModalOpen}
        entityName={pendingDelete || ''}
        onCancel={() => { setDeleteModalOpen(false); setPendingDelete(null); }}
        deleting={deleting}
        onConfirm={async () => {
          if (!pendingDelete) return;
          const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';
          try {
            setDeleting(true);
            await fetch('/api/entities/delete', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, entityName: pendingDelete })
            });
            setEntities(prev => prev.filter(x => x !== pendingDelete));
          } catch {
            // no-op
          } finally {
            setDeleting(false);
            setDeleteModalOpen(false);
            setPendingDelete(null);
          }
        }}
      />

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700/50">
          <div className="text-center">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Files</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{statements.length}</div>
          </div>
        </div>
      )}
    </aside>
  );
} 