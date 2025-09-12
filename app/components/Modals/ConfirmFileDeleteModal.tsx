'use client';
import React from 'react';
import { RiDeleteBinLine, RiErrorWarningLine, RiCloseLine } from 'react-icons/ri';

interface ConfirmFileDeleteModalProps {
  isOpen: boolean;
  fileName: string;
  fileType?: string;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
  deleting?: boolean;
}

export default function ConfirmFileDeleteModal({ 
  isOpen, 
  fileName, 
  fileType = 'file',
  onCancel, 
  onConfirm, 
  deleting = false 
}: ConfirmFileDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full mx-4 transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <RiErrorWarningLine className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Delete {fileType === 'file' ? 'File' : fileType}
            </h3>
          </div>
          <button
            onClick={onCancel}
            disabled={deleting}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RiCloseLine className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <RiDeleteBinLine className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                Are you sure you want to delete this {fileType}?
              </p>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {fileType === 'file' ? 'File' : fileType} Name
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1 truncate">
                  {fileName}
                </p>
              </div>
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Warning:</strong> This action cannot be undone. The {fileType} and all associated data will be permanently deleted.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <RiDeleteBinLine className="w-4 h-4" />
                  Delete {fileType === 'file' ? 'File' : fileType}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


