'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { RiMoreLine, RiEditLine, RiDeleteBinLine, RiDownloadLine, RiEyeLine } from 'react-icons/ri';
import ConfirmFileDeleteModal from './Modals/ConfirmFileDeleteModal';

interface EntityFilesGridProps {
  entityName: string;
  refreshKey?: string;
  onOpenPreview: (data: { 
    open: boolean; 
    headers: string[]; 
    rows: Array<Record<string, string>>; 
    fileId: string; 
    name: string 
  }) => void;
}

export default function EntityFilesGrid({ entityName, refreshKey, onOpenPreview }: EntityFilesGridProps) {
  const [files, setFiles] = useState<Array<{ id: string; name: string; createdAt?: string; s3Key?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refreshFiles = useCallback(async () => {
    const userId = localStorage.getItem('userId') || '';
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/entity-files?userId=${encodeURIComponent(userId)}&entityName=${encodeURIComponent(entityName)}`, { cache: 'no-store' });
      const data = await res.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to refresh entity files:', error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [entityName]);

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles, refreshKey]);

  // Listen for entity file deletion events
  useEffect(() => {
    const handleEntityFileDeleted = () => {
      refreshFiles();
    };
    
    window.addEventListener('entityFileDeleted', handleEntityFileDeleted);
    return () => window.removeEventListener('entityFileDeleted', handleEntityFileDeleted);
  }, [refreshFiles]);

  const handleRename = async (fileId: string, newName: string) => {
    try {
      const userId = localStorage.getItem('userId') || '';
      const res = await fetch('/api/entity-files/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, fileId, newName })
      });
      if (res.ok) {
        refreshFiles();
        setRenamingId(null);
        setNewName('');
      }
    } catch (error) {
      console.error('Failed to rename file:', error);
    }
  };

  const handleDeleteClick = (fileId: string, fileName: string) => {
    setPendingDelete({ id: fileId, name: fileName });
    setDeleteModalOpen(true);
    setMenuOpenId(null); // Close the menu
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    
    setDeleting(true);
    try {
      const userId = localStorage.getItem('userId') || '';
      const res = await fetch('/api/entity-files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, fileId: pendingDelete.id })
      });
      
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          refreshFiles();
          window.dispatchEvent(new CustomEvent('entityFileDeleted'));
          console.log(`Successfully deleted file: ${pendingDelete.name}`);
          setDeleteModalOpen(false);
          setPendingDelete(null);
        } else {
          throw new Error(result.error || 'Failed to delete file');
        }
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setPendingDelete(null);
    setDeleting(false);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading {entityName} files...</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <RiMoreLine className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No files yet</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Upload your first file to get started with {entityName}
        </p>
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          onClick={() => {
            // This would trigger the upload modal
            console.log(`Upload file for ${entityName}`);
          }}
        >
          Upload File
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Files ({files.length})</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {files.map(f => {
          const ext = (f.name?.split('.').pop() || '').toUpperCase();
          return (
            <div
              key={f.id}
              className="group relative rounded-xl border border-blue-100 dark:border-gray-600 bg-white dark:bg-gray-800 p-5 md:p-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-300 dark:hover:border-blue-500 w-full min-h-[180px] flex flex-col justify-between"
              onClick={async () => {
                try {
                  const res = await fetch(`/api/entity-files/preview?s3Key=${encodeURIComponent(String(f.s3Key||''))}`, { cache: 'no-store' });
                  if (!res.ok) throw new Error('preview failed');
                  const data: { headers: string[]; rows: Array<Record<string, string>> } = await res.json();
                  onOpenPreview({ open: true, headers: data.headers || [], rows: data.rows || [], fileId: f.id, name: f.name });
                } catch (e) {
                  console.error(e);
                }
              }}
            >
              {/* Folded-corner effect */}
              <div className="absolute -top-px -right-px w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-tr-xl" style={{clipPath:'polygon(0 0, 100% 0, 100% 100%)'}}></div>
              
              {/* Menu button */}
              <div className="absolute top-3 right-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="p-1.5 rounded-lg bg-white dark:bg-gray-700 shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => setMenuOpenId(menuOpenId === f.id ? null : f.id)}
                  >
                    <RiMoreLine className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  
                  {menuOpenId === f.id && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10">
                      <button
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                        onClick={() => {
                          setRenamingId(f.id);
                          setNewName(f.name);
                          setMenuOpenId(null);
                        }}
                      >
                        <RiEditLine className="w-4 h-4" />
                        Rename
                      </button>
                      <button
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                        onClick={() => {
                          // Download functionality
                          console.log('Download file:', f.name);
                          setMenuOpenId(null);
                        }}
                      >
                        <RiDownloadLine className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                        onClick={() => {
                          handleDeleteClick(f.id, f.name);
                        }}
                      >
                        <RiDeleteBinLine className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* File content */}
              <div className="flex-1 flex flex-col justify-center items-center text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-3">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">{ext}</span>
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">
                  {renamingId === f.id ? (
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onBlur={() => {
                        if (newName.trim() && newName !== f.name) {
                          handleRename(f.id, newName.trim());
                        } else {
                          setRenamingId(null);
                          setNewName('');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (newName.trim() && newName !== f.name) {
                            handleRename(f.id, newName.trim());
                          } else {
                            setRenamingId(null);
                            setNewName('');
                          }
                        } else if (e.key === 'Escape') {
                          setRenamingId(null);
                          setNewName('');
                        }
                      }}
                      className="w-full text-center bg-transparent border-none outline-none text-sm font-medium"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    f.name
                  )}
                </h4>
                {f.createdAt && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(f.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Click indicator */}
              <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <RiEyeLine className="w-3 h-3" />
                <span>Click to preview</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmFileDeleteModal
        isOpen={deleteModalOpen}
        fileName={pendingDelete?.name || ''}
        fileType="file"
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        deleting={deleting}
      />
    </div>
  );
}
