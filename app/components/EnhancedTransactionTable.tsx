import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiChevronUp, FiDownload, FiFilter, FiSearch } from 'react-icons/fi';
import { RiPriceTag3Line, RiBankLine, RiCalendarLine, RiMoneyDollarCircleLine } from 'react-icons/ri';
import { TransactionRow, Tag } from '../types/transaction';
import { formatDisplayDate, fixAndConvertToISO } from '../utils/dateUtils';

// Bank logo mapping
const BANK_LOGOS: { [key: string]: string } = {
  'ICICI': '🏦',
  'HDFC': '🏛️',
  'Kotak': '🏢',
  'IDFC': '🏦',
  'SBI': '🏛️',
  'Axis': '🏢',
  'PNB': '🏦',
  'Canara': '🏛️',
};

interface EnhancedTransactionTableProps {
  rows: TransactionRow[];
  headers: string[];
  selectedRows: Set<number>;
  selectAll: boolean;
  onRowSelect: (idx: number) => void;
  onSelectAll: () => void;
  loading?: boolean;
  error?: string | null;
  onRemoveTag?: (rowIdx: number, tagId: string) => void;
  onAddTag?: (rowIdx: number, tagName: string) => void;
  onSearchChange?: (query: string) => void;
  onExport?: (format: 'csv' | 'excel' | 'pdf') => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  columnWidths?: { [key: string]: number };
}

const EnhancedTransactionTable: React.FC<EnhancedTransactionTableProps> = ({
  rows,
  headers,
  selectedRows,
  selectAll,
  onRowSelect,
  onSelectAll,
  loading,
  error,
  onRemoveTag,
  onAddTag,
  onSearchChange,
  onExport,
  onSort,
  sortColumn,
  sortDirection,
  columnWidths = {},
}) => {
  const [editingTag, setEditingTag] = useState<{ rowIdx: number; tagInput: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  // Lightweight virtualization
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const ROW_HEIGHT = 48; // approximate row height
  const overscan = 10;
  const enableVirtualization = rows.length > 500;
  const totalHeight = rows.length * ROW_HEIGHT;
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + overscan;
  const startIndex = enableVirtualization ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - Math.floor(overscan / 2)) : 0;
  const endIndex = enableVirtualization ? Math.min(rows.length, startIndex + visibleCount) : rows.length;
  const topPad = enableVirtualization ? startIndex * ROW_HEIGHT : 0;
  const bottomPad = enableVirtualization ? Math.max(0, totalHeight - topPad - (endIndex - startIndex) * ROW_HEIGHT) : 0;
  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    const onResize = () => setContainerHeight(el.clientHeight || 600);
    onResize();
    el.addEventListener('scroll', onScroll);
    window.addEventListener('resize', onResize);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Utility functions
  const maskAccountNumber = (accountNumber: string) => {
    if (!accountNumber || accountNumber.length < 8) return accountNumber;
    return `XXXX${accountNumber.slice(-4)}`;
  };

  const getBankLogo = (bankName: string) => {
    const bankKey = Object.keys(BANK_LOGOS).find(key => 
      bankName.toLowerCase().includes(key.toLowerCase())
    );
    return bankKey ? BANK_LOGOS[bankKey] : '🏦';
  };

  const getDrCrBadge = (drCr: string) => {
    const isCredit = drCr?.toUpperCase() === 'CR';
    return (
      <span className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${isCredit 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
        }
      `}>
        <span className={`w-2 h-2 rounded-full mr-1.5 ${isCredit ? 'bg-green-500' : 'bg-red-500'}`}></span>
        {drCr?.toUpperCase() || 'N/A'}
      </span>
    );
  };

  const getTagBadge = (tag: Tag, onRemove?: () => void) => (
    <span
      key={tag.id}
      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mr-1 mb-1 group text-gray-900 dark:text-gray-100 hover:text-gray-900 hover:dark:text-gray-100 focus:text-gray-900 focus:dark:text-gray-100 active:text-gray-900 active:dark:text-gray-100"
      style={{
        backgroundColor: `${tag.color || '#6366F1'}15`,
        border: `1px solid ${tag.color || '#6366F1'}30`,
      }}
    >
      <RiPriceTag3Line className="w-3 h-3 mr-1" />
      {tag.name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-700"
        >
          ×
        </button>
      )}
    </span>
  );

  const handleTagEdit = (rowIdx: number) => {
    setEditingTag({ rowIdx, tagInput: '' });
  };

  const handleTagSave = () => {
    if (editingTag && editingTag.tagInput.trim() && onAddTag) {
      onAddTag(editingTag.rowIdx, editingTag.tagInput.trim());
      setEditingTag(null);
    }
  };

  // Sticky toolbar with search and filters
  const renderToolbar = () => (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onSearchChange?.(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Button */}
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <FiFilter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
          </button>
        </div>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiDownload className="w-4 h-4" />
            <span className="text-sm font-medium">Export</span>
            <FiChevronDown className="w-4 h-4" />
          </button>

          {exportDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <button
                onClick={() => { onExport?.('csv'); setExportDropdownOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 border-b border-gray-100"
              >
                Export as CSV
              </button>
              <button
                onClick={() => { onExport?.('excel'); setExportDropdownOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 border-b border-gray-100"
              >
                Export as PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Enhanced table header
  const renderHeader = () => (
    <thead className="sticky top-16 z-20 bg-gray-50 border-b border-gray-200">
      <tr>
        <th className="px-4 py-3 text-left border-r border-gray-200 bg-gray-50">
          <input 
            type="checkbox" 
            checked={selectAll} 
            onChange={onSelectAll}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
        </th>
        <th className="px-4 py-3 text-left font-semibold text-gray-700 border-r border-gray-200 bg-gray-50">#</th>
        {headers.map((header) => (
          <th
            key={header}
            className="px-4 py-3 text-left font-semibold text-gray-700 border-r border-gray-200 bg-gray-50"
            style={{ width: columnWidths[header] || 150 }}
          >
            <div className="flex items-center space-x-2">
              {/* Column Icon */}
              {header.toLowerCase().includes('date') && <RiCalendarLine className="w-4 h-4 text-blue-600" />}
              {header.toLowerCase().includes('amount') && <RiMoneyDollarCircleLine className="w-4 h-4 text-green-600" />}
              {header.toLowerCase().includes('bank') && <RiBankLine className="w-4 h-4 text-purple-600" />}
              
              <span className="truncate">{header}</span>
              
              {/* Sort/Filter Controls */}
              {onSort && (header.toLowerCase() === 'amount' || header.toLowerCase() === 'date') && (
                <button
                  onClick={() => onSort(header, sortDirection === 'asc' ? 'desc' : 'asc')}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  {sortColumn === header ? (
                    sortDirection === 'asc' ? (
                      <FiChevronUp className="w-3 h-3 text-blue-600" />
                    ) : (
                      <FiChevronDown className="w-3 h-3 text-blue-600" />
                    )
                  ) : (
                    <FiChevronDown className="w-3 h-3 text-gray-400" />
                  )}
                </button>
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );

  // Enhanced table body
  const renderBody = () => (
    <tbody className="bg-white divide-y divide-gray-200">
      {enableVirtualization && topPad > 0 && (
        <tr style={{ height: topPad }}><td colSpan={2 + headers.length} /></tr>
      )}
      {rows.slice(startIndex, endIndex).map((row, localIdx) => {
        const idx = enableVirtualization ? startIndex + localIdx : localIdx;
        
        // Neutral row background (no CR/DR colors)
        const rowBackgroundClass = idx % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50/50 hover:bg-blue-50';
        
        return (
          <tr 
            key={idx} 
            className={`${rowBackgroundClass} transition-colors duration-150`}
          >
            <td className="px-4 py-3 border-r border-gray-200">
              <input
                type="checkbox"
                checked={selectedRows.has(idx)}
                onChange={() => onRowSelect(idx)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
            </td>
            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">
              {idx + 1}
            </td>
            {headers.map((header) => (
              <td 
                key={header} 
                className={`px-4 py-3 text-sm border-r border-gray-200 dark:border-gray-700 ${
                  header === headers[headers.length - 1] ? '' : 'border-r border-gray-200 dark:border-gray-700'
                }`}
                style={{ width: columnWidths[header] || 150 }}
              >
                {(() => {
                  const value = row[header];
                  
                  // Handle different column types
                  if (header.toLowerCase().includes('dr./cr.') || header.toLowerCase().includes('dr/cr')) {
                    return getDrCrBadge(String(value || ''));
                  }
                  
                  if (header.toLowerCase().includes('amount')) {
                    const amount = typeof value === 'number' ? value : parseFloat(String(value || 0));
                    return (
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    );
                  }
                  
                  if (header.toLowerCase().includes('date')) {
                    const dateValue = typeof value === 'string' ? fixAndConvertToISO(value) : String(value || '');
                    return (
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {formatDisplayDate(dateValue)}
                      </span>
                    );
                  }
                  
                  if (header.toLowerCase().includes('bank')) {
                    const bankName = String(value || '');
                    return (
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getBankLogo(bankName)}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{bankName}</span>
                      </div>
                    );
                  }
                  
                  if (header.toLowerCase().includes('account') && header.toLowerCase().includes('no')) {
                    return (
                      <span className="font-mono text-gray-600 dark:text-gray-400">
                        {maskAccountNumber(String(value || ''))}
                      </span>
                    );
                  }
                  
                  if (header.toLowerCase().includes('tags')) {
                    const tags = Array.isArray(value) ? value as Tag[] : [];
                    return (
                      <div className="flex flex-wrap items-center">
                        {tags.map(tag => 
                          getTagBadge(tag, onRemoveTag ? () => onRemoveTag(idx, tag.id) : undefined)
                        )}
                        {onAddTag && (
                          <button
                            onClick={() => handleTagEdit(idx)}
                            className="inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                          >
                            <RiPriceTag3Line className="w-3 h-3 mr-1" />
                            Add
                          </button>
                        )}
                      </div>
                    );
                  }
                  
                  return (
                    <span className="text-gray-700 dark:text-gray-300 truncate block">
                      {String(value || '')}
                    </span>
                  );
                })()}
              </td>
            ))}
          </tr>
        );
      })}
      {enableVirtualization && bottomPad > 0 && (
        <tr style={{ height: bottomPad }}><td colSpan={2 + headers.length} /></tr>
      )}
    </tbody>
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      {renderToolbar()}
      
      <div ref={tableScrollRef} className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading transactions...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-500 text-2xl mb-2">⚠️</div>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-gray-400 text-2xl mb-2">📊</div>
              <p className="text-gray-500">No transactions found</p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            {renderHeader()}
            {renderBody()}
          </table>
        )}
      </div>

      {/* Tag editing modal */}
      {editingTag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Add Tag</h3>
            <input
              type="text"
              value={editingTag.tagInput}
              onChange={(e) => setEditingTag({ ...editingTag, tagInput: e.target.value })}
              placeholder="Enter tag name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleTagSave()}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setEditingTag(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTagSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTransactionTable;

