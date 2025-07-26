'use client';
import { useState } from 'react';
import { RiFileLine, RiArrowDownSLine, RiArrowRightSLine } from 'react-icons/ri';

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
  expandedFileId: string | null;
  onFileClick: (file: FileItem) => void;
  onVersionClick: (file: FileItem, version: { id: string; versionName: string }) => void;
  onExpand: (fileId: string) => void;
  statements: StatementItem[];
}

export default function FilesSidebar({ files, selectedFileId, expandedFileId, onFileClick, onVersionClick, onExpand, statements }: FilesSidebarProps) {
  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col py-4 px-2">
      <nav className="flex-1">
        <ul className="space-y-2 text-gray-700 text-sm">
          <li>
            <button className="flex items-center gap-2 px-2 py-2 rounded hover:bg-blue-50 w-full text-left font-bold text-blue-700 bg-blue-100">
              <RiFileLine /> All Files
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
} 