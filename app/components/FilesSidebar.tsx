'use client';
import { useState } from 'react';
import { RiMenuFoldLine, RiMenuUnfoldLine } from 'react-icons/ri';

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
        </div>
      </nav>

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