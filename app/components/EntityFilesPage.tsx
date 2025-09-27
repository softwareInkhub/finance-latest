'use client';
import React, { useState, useEffect } from 'react';
import { RiUploadLine, RiFileLine, RiDeleteBinLine, RiEyeLine } from 'react-icons/ri';
import { useFileSync } from '../contexts/FileSyncContext';
import { usePreviewTabManager } from '../hooks/usePreviewTabManager';

interface FileData {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  parentId: string;
  tags: string[];
  s3Key?: string;
  downloadUrl?: string;
}

interface EntityFilesPageProps {
  entityId: string;
  entityName: string;
}

export default function EntityFilesPage({ entityId, entityName }: EntityFilesPageProps) {
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<{ isOpen: boolean; file?: FileData }>({ isOpen: false });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getEntityFiles, addFileToEntity, removeFileFromEntity, refreshEntityFiles } = useFileSync();
  const { openFilePreview } = usePreviewTabManager();
  
  const files = getEntityFiles(entityId);

  useEffect(() => {
    const loadFiles = async () => {
      setLoading(true);
      await refreshEntityFiles(entityId);
      setLoading(false);
    };
    loadFiles();
  }, [entityId, refreshEntityFiles]);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      formData.append('parentId', entityId);
      formData.append('tags', JSON.stringify(['entity-file', entityName]));

      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const result = await response.json();
      console.log('File uploaded successfully:', result);
      
      // Add file to context
      addFileToEntity(entityId, {
        id: result.fileId || result.id,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: localStorage.getItem('userId') || '',
        parentId: entityId,
        tags: ['entity-file', entityName],
        s3Key: result.s3Key,
        downloadUrl: result.downloadUrl
      });
      
      setShowUploadModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  // Handle file deletion
  const handleDeleteFile = async (file: FileData) => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`/api/files/${file.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete file');
      }

      console.log('File deleted successfully:', file.name);
      
      // Remove file from context
      removeFileFromEntity(entityId, file.id);
      setShowDeleteModal({ isOpen: false });
    } catch (error) {
      console.error('Error deleting file:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete file');
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{entityName}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage files and documents for {entityName}
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RiUploadLine className="w-4 h-4" />
          Upload File
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Files Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading files...</span>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-12">
          <RiFileLine className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No files yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Upload your first file to get started with {entityName}
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RiUploadLine className="w-4 h-4" />
            Upload File
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {files.map((file) => (
            <div 
              key={file.id} 
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={async () => {
                if (!file || !file.id || !file.name) {
                  console.error('Invalid file data for preview:', file);
                  return;
                }

                try {
                  // If file doesn't have downloadUrl, fetch it first
                  let fileWithUrl = file;
                  if (!file.downloadUrl) {
                    const userId = localStorage.getItem('userId');
                    if (!userId) {
                      console.error('User not authenticated');
                      return;
                    }

                    const response = await fetch(`/api/files/download?userId=${userId}&fileId=${file.id}`);
                    if (!response.ok) {
                      throw new Error('Failed to get download URL');
                    }
                    
                    const result = await response.json();
                    if (result.error) {
                      throw new Error(result.error);
                    }
                    
                    fileWithUrl = {
                      ...file,
                      downloadUrl: result.downloadUrl
                    };
                  }

                  openFilePreview(fileWithUrl);
                } catch (error) {
                  console.error('Failed to open file preview:', error);
                  setError('Failed to open file preview: ' + (error instanceof Error ? error.message : 'Unknown error'));
                }
              }}
            >
               <div className="flex items-start justify-between mb-3">
                 <div className="flex items-center gap-2 flex-1 min-w-0">
                   <RiFileLine className="w-5 h-5 text-blue-600 flex-shrink-0" />
                   <div className="flex items-center gap-2 flex-1 min-w-0">
                     <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                       {file.name}
                     </span>
                     {file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls') ? (
                       <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 flex-shrink-0">
                         XLSX
                       </span>
                     ) : file.name.toLowerCase().endsWith('.csv') ? (
                       <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 flex-shrink-0">
                         CSV
                       </span>
                     ) : null}
                   </div>
                 </div>
                 <div className="flex items-center gap-1">
                   <button
                     onClick={async (e) => {
                       e.stopPropagation(); // Prevent card click
                       if (!file || !file.id || !file.name) {
                         console.error('Invalid file data for preview:', file);
                         return;
                       }

                       try {
                         // If file doesn't have downloadUrl, fetch it first
                         let fileWithUrl = file;
                         if (!file.downloadUrl) {
                           const userId = localStorage.getItem('userId');
                           if (!userId) {
                             console.error('User not authenticated');
                             return;
                           }

                           const response = await fetch(`/api/files/download?userId=${userId}&fileId=${file.id}`);
                           if (!response.ok) {
                             throw new Error('Failed to get download URL');
                           }
                           
                           const result = await response.json();
                           if (result.error) {
                             throw new Error(result.error);
                           }
                           
                           fileWithUrl = {
                             ...file,
                             downloadUrl: result.downloadUrl
                           };
                         }

                         openFilePreview(fileWithUrl);
                       } catch (error) {
                         console.error('Failed to open file preview:', error);
                         setError('Failed to open file preview: ' + (error instanceof Error ? error.message : 'Unknown error'));
                       }
                     }}
                     className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                     title="Preview file"
                   >
                     <RiEyeLine className="w-4 h-4" />
                   </button>
                   <button
                     onClick={async (e) => {
                       e.stopPropagation(); // Prevent card click
                       try {
                         let downloadUrl = file.downloadUrl;
                         
                         if (!downloadUrl) {
                           const userId = localStorage.getItem('userId');
                           if (!userId) {
                             console.error('User not authenticated');
                             return;
                           }

                           const response = await fetch(`/api/files/download?userId=${userId}&fileId=${file.id}`);
                           if (!response.ok) {
                             throw new Error('Failed to get download URL');
                           }
                           
                           const result = await response.json();
                           if (result.error) {
                             throw new Error(result.error);
                           }
                           
                           downloadUrl = result.downloadUrl;
                         }

                         if (downloadUrl) {
                           window.open(downloadUrl, '_blank');
                         }
                       } catch (error) {
                         console.error('Failed to download file:', error);
                         setError('Failed to download file: ' + (error instanceof Error ? error.message : 'Unknown error'));
                       }
                     }}
                     className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                     title="Download file"
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                     </svg>
                   </button>
                   <button
                     onClick={(e) => {
                       e.stopPropagation(); // Prevent card click
                       setShowDeleteModal({ isOpen: true, file });
                     }}
                     className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                     title="Delete file"
                   >
                     <RiDeleteBinLine className="w-4 h-4" />
                   </button>
                 </div>
              </div>
              
              <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <div>Size: {formatFileSize(file.size)}</div>
                <div>Type: {file.mimeType}</div>
                <div>Uploaded: {formatDate(file.createdAt)}</div>
              </div>
              
              {file.tags && file.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {file.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {file.tags.length > 3 && (
                    <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                      +{file.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <RiUploadLine className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upload File</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">to {entityName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Drag & Drop Area */}
              <div className="relative">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf,.txt,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={uploading}
                />
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center">
                      <RiUploadLine className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        Drop your file here
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        or click to browse
                      </p>
                      <div className="flex flex-wrap justify-center gap-2 text-xs">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                          CSV
                        </span>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                          Excel
                        </span>
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                          PDF
                        </span>
                        <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full">
                          DOC
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Uploading file...</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">Please wait while we process your file</p>
                    </div>
                  </div>
                </div>
              )}

              {/* File Info */}
              <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                <p>Maximum file size: 50MB</p>
                <p>Supported formats: CSV, Excel (.xls, .xlsx), PDF, DOC, TXT</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-b-2xl">
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal.isOpen && showDeleteModal.file && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
            {/* Header */}
            <div className="flex items-center gap-4 p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
                <RiDeleteBinLine className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Delete File</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <RiFileLine className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                    {showDeleteModal.file.name}
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    {formatFileSize(showDeleteModal.file.size)} • {showDeleteModal.file.mimeType}
                  </p>
                </div>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mt-4 text-center">
                Are you sure you want to delete this file? This action cannot be undone and will also remove any associated transactions.
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-b-2xl">
              <button
                onClick={() => setShowDeleteModal({ isOpen: false })}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteFile(showDeleteModal.file!)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <RiDeleteBinLine className="w-4 h-4" />
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
