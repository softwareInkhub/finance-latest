'use client';
import { useState } from 'react';
import ChildSidebar from './ChildSidebar';

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
  onFileClick: (file: BankItem) => void;
  statements: StatementItem[];
  onAddFile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
}

export default function FilesSidebar({ 
  files, 
  selectedFileId, 
  onFileClick, 
  statements, 
  onAddFile,
  isCollapsed = false,
  onToggleCollapse,
  width = 256,
  onWidthChange
}: FilesSidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  
  // Use external collapse state if provided, otherwise use internal
  const collapsed = onToggleCollapse ? isCollapsed : internalCollapsed;
  const handleToggleCollapse = onToggleCollapse || (() => setInternalCollapsed(prev => !prev));

  return (
    <ChildSidebar
      title="Files"
      subtitle="Manage documents"
      isCollapsed={collapsed}
      onToggleCollapse={handleToggleCollapse}
      width={width}
      onWidthChange={onWidthChange || (() => {})}
      minWidth={200}
      maxWidth={400}
    >
      {/* Navigation */}
      <nav className="flex-1 py-2">
        <div className="space-y-1">
          {/* All Files Button */}
          <button 
            className={`flex items-center gap-2 px-3 py-2 rounded-lg w-full text-left transition-all duration-200 ${
              selectedFileId === 'all' 
                ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold border-l-2 border-purple-500' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
            }`}
            onClick={() => onFileClick({ id: 'all', fileName: 'All Files' })}
            title={collapsed ? "All Files" : ""}
          >
            <div className={`w-2 h-2 rounded-full ${
              selectedFileId === 'all' ? 'bg-purple-600' : 'bg-gray-500 dark:bg-gray-400'
            }`}></div>
            {!collapsed && (
              <div>
                <div className="font-semibold text-sm">All Files</div>
                <div className="text-xs opacity-75">{statements.length} files</div>
              </div>
            )}
          </button>

          {/* Banks Section */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              {!collapsed && (
                <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider px-3">Banks</h3>
              )}
              {onAddFile && (
                <button
                  onClick={onAddFile}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Add File"
                >
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>
            <div className="space-y-1">
              {files.map((bank) => (
                <button
                  key={bank.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg w-full text-left transition-all duration-200 ${
                    selectedFileId === bank.id 
                      ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold border-l-2 border-purple-500' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  onClick={() => onFileClick(bank)}
                  title={collapsed ? bank.fileName : ""}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    selectedFileId === bank.id ? 'bg-purple-600' : 'bg-gray-500 dark:bg-gray-400'
                  }`}></div>
                  {!collapsed && (
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
        </div>
      </nav>

      {/* Sidebar Footer */}
      {!collapsed && (
        <div className="mt-auto p-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Files</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{statements.length}</div>
          </div>
        </div>
      )}
    </ChildSidebar>
  );
}