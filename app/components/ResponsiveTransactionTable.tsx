'use client';
import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiChevronUp, FiDownload, FiSearch, FiGrid } from 'react-icons/fi';
import { TransactionRow, Tag } from '../types/transaction';
import { formatDisplayDate } from '../utils/dateUtils';



interface ResponsiveTransactionTableProps {
  rows: TransactionRow[];
  headers: string[];
  selectedRows: Set<number>;
  selectAll: boolean;
  onRowSelect: (idx: number) => void;
  onSelectAll: () => void;
  loading?: boolean;
  error?: string | null;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onExport?: (format: 'csv' | 'excel' | 'pdf') => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

const ResponsiveTransactionTable: React.FC<ResponsiveTransactionTableProps> = ({
  rows,
  headers,
  selectedRows,
  selectAll,
  onRowSelect,
  onSelectAll,
  loading,
  error,
  onSort,
  sortColumn,
  sortDirection,
  onExport,
  searchQuery = '',
  onSearchChange,
}) => {
  const [columnWidths, setColumnWidths] = useState<{ [header: string]: number }>(
    () => Object.fromEntries(headers.map(h => [h, 150]))
  );
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const resizingCol = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  // Detect device type
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Column resizing handlers
  const handleMouseDown = (e: React.MouseEvent, header: string) => {
    resizingCol.current = header;
    startX.current = e.clientX;
    startWidth.current = columnWidths[header] || 150;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingCol.current) return;
    const delta = e.clientX - startX.current;
    const newWidth = Math.max(80, startWidth.current + delta);
    setColumnWidths(prev => ({
      ...prev,
      [resizingCol.current!]: newWidth
    }));
  };

  const handleMouseUp = () => {
    resizingCol.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 dark:text-red-400">Error: {error}</div>
      </div>
    );
  }

  // Mobile/Tablet Grid View
  if (viewMode === 'grid' && (isMobile || isTablet)) {
    return (
      <div className="space-y-4">
        {/* Grid View Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('table')}
              className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
            >
              <FiGrid className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">Grid View</span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {rows.length} transactions
          </span>
        </div>

        {/* Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((row, index) => (
            <div
              key={index}
              className={`bg-white dark:bg-gray-800 rounded-xl border-2 transition-all duration-200 ${
                selectedRows.has(index)
                  ? 'border-purple-500 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
              }`}
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(index)}
                      onChange={() => onRowSelect(index)}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      #{index + 1}
                    </span>
                  </div>
                  {row.tags && row.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {row.tags.map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-2">
                  {headers.map((header, headerIndex) => {
                    const value = row[header as keyof TransactionRow];
                    if (!value) return null;

                    return (
                      <div key={headerIndex} className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">
                          {header}:
                        </span>
                        <span className="text-sm text-gray-900 dark:text-gray-100 truncate max-w-[60%]">
                          {header.toLowerCase() === 'amount' && typeof value === 'number'
                            ? `₹${value.toLocaleString('en-IN')}`
                            : header.toLowerCase() === 'date'
                            ? formatDisplayDate(value as string)
                            : String(value)
                          }
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Table View (Desktop and Mobile)
  return (
    <div className="space-y-4">
      {/* Table Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          {isMobile || isTablet ? (
            <button
              onClick={() => setViewMode('grid')}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            >
              <FiGrid className="w-4 h-4" />
            </button>
          ) : null}
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {rows.length} transactions
          </span>
        </div>

        {/* Search and Export */}
        <div className="flex items-center space-x-2">
          {onSearchChange && (
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          )}
          
          {onExport && (
            <div className="relative">
              <button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <FiDownload className="w-4 h-4" />
              </button>
              
              {exportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                  <button
                    onClick={() => { onExport('csv'); setExportDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => { onExport('excel'); setExportDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Export Excel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Excel-like Table */}
      <div 
        ref={tableScrollRef}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 text-left border-r border-gray-200 dark:border-gray-700" style={{ width: 40 }}>
                  <input 
                    type="checkbox" 
                    checked={selectAll} 
                    onChange={onSelectAll}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                  />
                </th>
                <th className="px-3 py-3 text-left font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700" style={{ width: 40 }}>
                  #
                </th>
                {headers.map((header, index) => (
                  <th
                    key={header}
                    className={`px-3 py-3 text-left font-medium text-gray-700 dark:text-gray-300 group relative select-none whitespace-nowrap ${
                      index === headers.length - 1 ? '' : 'border-r border-gray-200 dark:border-gray-700'
                    }`}
                    style={{ 
                      width: columnWidths[header] || 150, 
                      minWidth: 80, 
                      maxWidth: columnWidths[header] || 150 
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate block w-full" title={`Column: ${header}`}>
                        {header}
                      </span>
                      
                      {/* Column resize handle */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-purple-300 dark:hover:bg-purple-600"
                        onMouseDown={(e) => handleMouseDown(e, header)}
                      />
                      
                      {/* Sort and filter controls */}
                      <div className="flex items-center gap-1 ml-2">
                        {onSort && (
                          <button
                            onClick={() => {
                              if (onSort) {
                                const newDirection = sortColumn === header && sortDirection === 'asc' ? 'desc' : 'asc';
                                onSort(header, newDirection);
                              }
                            }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                          >
                            {sortColumn === header ? (
                              sortDirection === 'asc' ? (
                                <FiChevronUp className="w-3 h-3 text-purple-600" />
                              ) : (
                                <FiChevronDown className="w-3 h-3 text-purple-600" />
                              )
                            ) : (
                              <FiChevronDown className="w-3 h-3 text-gray-400" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map((row, index) => (
                <tr
                  key={index}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    selectedRows.has(index) ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                  }`}
                >
                  <td className="px-3 py-3 border-r border-gray-200 dark:border-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(index)}
                      onChange={() => onRowSelect(index)}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                    />
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                    {index + 1}
                  </td>
                  {headers.map((header, headerIndex) => {
                    const value = row[header as keyof TransactionRow];
                    
                    return (
                      <td
                        key={headerIndex}
                        className={`px-3 py-3 text-sm text-gray-900 dark:text-gray-100 ${
                          headerIndex === headers.length - 1 ? '' : 'border-r border-gray-200 dark:border-gray-700'
                        }`}
                        style={{ 
                          width: columnWidths[header] || 150, 
                          minWidth: 80, 
                          maxWidth: columnWidths[header] || 150 
                        }}
                      >
                        <div className="truncate" title={String(value || '')}>
                          {header.toLowerCase() === 'amount' && typeof value === 'number'
                            ? `₹${value.toLocaleString('en-IN')}`
                            : header.toLowerCase() === 'date'
                            ? formatDisplayDate(value as string)
                            : header.toLowerCase() === 'tags' && Array.isArray(value)
                            ? (
                              <div className="flex flex-wrap gap-1">
                                {value.map((tag: Tag, tagIndex: number) => (
                                  <span
                                    key={tagIndex}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            )
                            : String(value || '')
                          }
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResponsiveTransactionTable;





