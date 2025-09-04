import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { RiPriceTag3Line } from 'react-icons/ri';
import { Transaction, TransactionRow, Tag } from '../types/transaction';
import { formatDisplayDate, fixAndConvertToISO } from '../utils/dateUtils';

interface BankMapping {
  id: string;
  bankId: string;
  header: string[];
  mapping?: { [key: string]: string };
  conditions?: Array<{
    if: { field: string; op: string };
    then: { [key: string]: string };
  }>;
}

interface TransactionTableProps {
  rows: TransactionRow[];
  headers: string[];
  selectedRows: Set<number>;
  selectAll: boolean;
  onRowSelect: (idx: number) => void;
  onSelectAll: () => void;
  loading?: boolean;
  error?: string | null;
  onRemoveTag?: (rowIdx: number, tagId: string) => void;
  onReorderHeaders?: (newHeaders: string[]) => void;
  transactions?: Transaction[];
  bankMappings?: { [bankId: string]: BankMapping };
  getValueForColumn?: (tx: Transaction, bankId: string, columnName: string) => string | number | undefined;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  // New props for filtering
  onDateFilter?: (direction: 'newest' | 'oldest' | 'clear') => void;
  onBankFilter?: (bankName: string | 'clear') => void;
  onDrCrFilter?: (type: 'DR' | 'CR' | 'clear') => void;
  onAccountFilter?: (accountNumber: string | 'clear') => void;
  availableBanks?: string[];
  availableAccounts?: Array<{ bankName: string; accountNumber: string; count: number }>;
}

const DEFAULT_WIDTH = 120;
const VIRTUALIZATION_ROW_HEIGHT = 44; // approximate row height in px



const TransactionTable: React.FC<TransactionTableProps> = ({
  rows,
  headers,
  selectedRows,
  selectAll,
  onRowSelect,
  onSelectAll,
  loading,
  error,
  onRemoveTag,
  onReorderHeaders,
  transactions,
  getValueForColumn,
  onSort,
  sortColumn,
  sortDirection,
  onDateFilter,
  onBankFilter,
  onDrCrFilter,
  onAccountFilter,
  availableBanks = [],
  availableAccounts = [],
}) => {
  // Column widths state
  const [columnWidths, setColumnWidths] = useState<{ [header: string]: number }>(
    () => Object.fromEntries(headers.map(h => [h, DEFAULT_WIDTH]))
  );
  const resizingCol = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  // Drag and drop state for headers
  const [draggedHeader, setDraggedHeader] = useState<string | null>(null);

  // Table scroll logic
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  // Sort dropdown state
  const [sortDropdownOpen, setSortDropdownOpen] = useState<string | null>(null);

  // Mouse event handlers for resizing
  const handleMouseDown = (e: React.MouseEvent, header: string) => {
    resizingCol.current = header;
    startX.current = e.clientX;
    startWidth.current = columnWidths[header] || DEFAULT_WIDTH;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingCol.current) return;
    const delta = e.clientX - startX.current;
    setColumnWidths(widths => ({
      ...widths,
      [resizingCol.current!]: Math.max(60, startWidth.current + delta),
    }));
  };

  const handleMouseUp = () => {
    resizingCol.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  // Virtualized window calculations
  const overscanCount = 10;
  const enableVirtualization = rows.length > 500; // enable only for larger datasets
  const totalContentHeight = rows.length * VIRTUALIZATION_ROW_HEIGHT;
  const visibleCount = Math.ceil(containerHeight / VIRTUALIZATION_ROW_HEIGHT) + overscanCount;
  const startIndex = enableVirtualization ? Math.max(0, Math.floor(scrollTop / VIRTUALIZATION_ROW_HEIGHT) - Math.floor(overscanCount / 2)) : 0;
  const endIndex = enableVirtualization ? Math.min(rows.length, startIndex + visibleCount) : rows.length;
  const topSpacerHeight = enableVirtualization ? startIndex * VIRTUALIZATION_ROW_HEIGHT : 0;
  const bottomSpacerHeight = enableVirtualization ? Math.max(0, totalContentHeight - topSpacerHeight - (endIndex - startIndex) * VIRTUALIZATION_ROW_HEIGHT) : 0;

  // Track container scroll to compute window
  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      setScrollTop(el.scrollTop);
    };
    const handleResize = () => {
      setContainerHeight(el.clientHeight || 600);
    };
    handleResize();
    el.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleDragStart = (header: string) => {
    setDraggedHeader(header);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetHeader: string) => {
    e.preventDefault();
    if (draggedHeader && draggedHeader !== targetHeader && onReorderHeaders) {
      const newHeaders = [...headers];
      const draggedIndex = newHeaders.indexOf(draggedHeader);
      const targetIndex = newHeaders.indexOf(targetHeader);
      newHeaders.splice(draggedIndex, 1);
      newHeaders.splice(targetIndex, 0, draggedHeader);
      onReorderHeaders(newHeaders);
    }
  };

  const handleDragEnd = () => {
    setDraggedHeader(null);
  };

  const handleSortDropdownToggle = (column: string) => {
    setSortDropdownOpen(sortDropdownOpen === column ? null : column);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownOpen && !(event.target as Element).closest('.sort-dropdown')) {
        setSortDropdownOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sortDropdownOpen]);



  return (
    <div className="flex flex-col h-[65vh]" style={{ minHeight: '500px' }}>
      {/* Table container with vertical scroll only */}
             <div ref={tableScrollRef} className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded">
      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-500">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <div className="text-sm">Loading transactions...</div>
            <div className="text-xs text-gray-400 mt-1">Please wait while we fetch your data</div>
            <div className="text-xs text-blue-600 mt-2 font-medium">This may take a few minutes for large datasets</div>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-32 text-red-600">
          <div className="text-center">
            <div className="text-sm font-medium mb-1">Error loading transactions</div>
            <div className="text-xs text-red-500">{error}</div>
            <div className="text-xs text-gray-400 mt-2">Please try refreshing the page</div>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-500">
          <div className="text-center">
            <div className="text-sm font-medium mb-1">No transactions found</div>
            <div className="text-xs text-gray-400">No mapped transactions found for this account</div>
          </div>
        </div>
      ) : (
        <table className="w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700" style={{ height: 'fit-content' }}>
          <colgroup>
            <col style={{ width: 40 }} />
            <col style={{ width: 40 }} />
            {headers.map(h => (
              <col key={h} style={{ width: columnWidths[h] || DEFAULT_WIDTH }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-2 py-2 text-left border-r border-gray-200" style={{ width: 40 }} title="Select all transactions">
                <input 
                  type="checkbox" 
                  checked={selectAll} 
                  onChange={onSelectAll}
                  className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
              </th>
              <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700" style={{ width: 40 }} title="Row number">#</th>
              {headers.map((sh, index) => (
                <th
                  key={sh}
                  className={`px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-300 group relative select-none whitespace-nowrap text-ellipsis ${index === headers.length - 1 ? '' : 'border-r border-gray-200 dark:border-gray-700'}`}
                  style={{ width: columnWidths[sh] || DEFAULT_WIDTH, minWidth: 60, maxWidth: columnWidths[sh] || DEFAULT_WIDTH }}
                  draggable
                  onDragStart={() => handleDragStart(sh)}
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, sh)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate block w-full" title={`Column: ${sh}`}>{sh}</span>
                    <div className="flex items-center gap-1">
                      {/* Sort dropdown for Amount column */}
                      {sh.toLowerCase() === 'amount' && onSort && (
                        <div className="relative sort-dropdown">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Sort button clicked for:', sh);
                              handleSortDropdownToggle(sh);
                            }}
                            className="sort-button p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 dark:border-gray-600"
                            title="Sort by amount"
                          >
                            {sortColumn === sh ? (
                              sortDirection === 'asc' ? (
                                <FiChevronUp className="w-3 h-3 text-blue-600" />
                              ) : (
                                <FiChevronDown className="w-3 h-3 text-blue-600" />
                              )
                            ) : (
                              <FiChevronDown className="w-3 h-3 text-gray-400" />
                            )}
                          </button>
                          
                          {/* Sort dropdown menu */}
                          {sortDropdownOpen === sh && (
                            <div className="sort-dropdown absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-[9999] min-w-[140px]">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Sort ascending clicked');
                                  if (onSort) onSort(sh, 'asc');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 flex items-center gap-2"
                              >
                                <FiChevronUp className="w-3 h-3" />
                                Sort Ascending
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Sort descending clicked');
                                  if (onSort) onSort(sh, 'desc');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 flex items-center gap-2"
                              >
                                <FiChevronDown className="w-3 h-3" />
                                Sort Descending
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Date filter dropdown */}
                      {(sh.toLowerCase() === 'date') && onDateFilter && (
                        <div className="relative sort-dropdown">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSortDropdownToggle(sh);
                            }}
                            className="sort-button p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 dark:border-gray-600"
                            title="Filter by date"
                          >
                            <FiChevronDown className="w-3 h-3 text-gray-400" />
                          </button>
                          
                          {sortDropdownOpen === sh && (
                            <div className="sort-dropdown absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-[9999] min-w-[140px]">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (onDateFilter) onDateFilter('newest');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 flex items-center gap-2"
                              >
                                <FiChevronDown className="w-3 h-3" />
                                Newest to Oldest
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (onDateFilter) onDateFilter('oldest');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 flex items-center gap-2"
                              >
                                <FiChevronUp className="w-3 h-3" />
                                Oldest to Newest
                              </button>
                              <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (onDateFilter) onDateFilter('clear');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                              >
                                Clear filter
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bank Name filter dropdown */}
                      {(sh.toLowerCase() === 'bank name' || sh.toLowerCase() === 'bankname') && onBankFilter && (
                        <div className="relative sort-dropdown">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSortDropdownToggle(sh);
                            }}
                            className="sort-button p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 dark:border-gray-600"
                            title="Filter by bank"
                          >
                            <FiChevronDown className="w-3 h-3 text-gray-400" />
                          </button>
                          
                          {sortDropdownOpen === sh && (
                            <div className="sort-dropdown absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-[9999] min-w-[140px] max-h-48 overflow-y-auto">
                              {availableBanks.map((bank) => (
                                <button
                                  key={bank}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (onBankFilter) onBankFilter(bank);
                                    setSortDropdownOpen(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 flex items-center gap-2"
                                >
                                  {bank}
                                </button>
                              ))}
                              <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (onBankFilter) onBankFilter('clear');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                              >
                                Clear filter
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Dr./Cr. filter dropdown */}
                      {(sh.toLowerCase() === 'dr./cr.' || sh.toLowerCase() === 'dr/cr' || sh.toLowerCase() === 'dr. cr.') && onDrCrFilter && (
                        <div className="relative sort-dropdown">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSortDropdownToggle(sh);
                            }}
                            className="sort-button p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 dark:border-gray-600"
                            title="Filter by transaction type"
                          >
                            <FiChevronDown className="w-3 h-3 text-gray-400" />
                          </button>
                          
                          {sortDropdownOpen === sh && (
                            <div className="sort-dropdown absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-[9999] min-w-[140px]">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (onDrCrFilter) onDrCrFilter('DR');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 flex items-center gap-2"
                              >
                                DR (Debit)
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (onDrCrFilter) onDrCrFilter('CR');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 flex items-center gap-2"
                              >
                                CR (Credit)
                              </button>
                              <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (onDrCrFilter) onDrCrFilter('clear');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                              >
                                Clear filter
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Account No. filter dropdown */}
                      {(sh.toLowerCase() === 'account no.' || sh.toLowerCase() === 'account no' || sh.toLowerCase() === 'accountnumber') && onAccountFilter && (
                        <div className="relative sort-dropdown">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSortDropdownToggle(sh);
                            }}
                            className="sort-button p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 dark:border-gray-600"
                            title="Filter by account number"
                          >
                            <FiChevronDown className="w-3 h-3 text-gray-400" />
                          </button>
                          
                          {sortDropdownOpen === sh && (
                            <div className="sort-dropdown absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-[9999] min-w-[200px] max-h-48 overflow-y-auto">
                              {availableAccounts.map((account) => (
                                <button
                                  key={`${account.bankName}-${account.accountNumber}`}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (onAccountFilter) onAccountFilter(account.accountNumber);
                                    setSortDropdownOpen(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 flex items-center justify-between"
                                >
                                  <span className="truncate">{account.accountNumber}</span>
                                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">- {account.bankName}</span>
                                </button>
                              ))}
                              <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (onAccountFilter) onAccountFilter('clear');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                              >
                                Clear filter
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Resize handle */}
                      <span
                        className="absolute right-0 top-0 h-full w-2 cursor-col-resize z-10 group-hover:bg-blue-100 dark:group-hover:bg-blue-900"
                        onMouseDown={e => handleMouseDown(e, sh)}
                        style={{ userSelect: 'none' }}
                      >
                        <span className="block h-full w-1 mx-auto bg-gray-400 dark:bg-gray-500 rounded" style={{ opacity: 0.6 }}></span>
                      </span>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {enableVirtualization && topSpacerHeight > 0 && (
              <tr style={{ height: topSpacerHeight }}>
                <td colSpan={2 + headers.length} />
              </tr>
            )}
            {rows.slice(startIndex, endIndex).map((row, idxLocal) => {
              const idx = enableVirtualization ? startIndex + idxLocal : idxLocal;
              const tx = transactions?.find(t => t.id === row.id);
              
              // Use neutral background for all rows
              const rowBackgroundClass = 'hover:bg-gray-100 dark:hover:bg-gray-700';
              
              return (
                <tr key={idx} data-row-idx={idx} data-transaction-id={row.id} className={`${rowBackgroundClass} transition-colors duration-150`}>
                  <td className="border px-2 py-1 text-center border-r border-gray-200 dark:border-gray-700" style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selectedRows.has(idx)}
                      onChange={() => onRowSelect(idx)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </td>
                  <td className="border px-2 py-1 text-center border-r border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100" style={{ width: 40 }}>{idx + 1}</td>
                  {headers.map((sh, index) => (
                                         <td key={sh} className={`border border-gray-200 dark:border-gray-700 px-2 py-1 whitespace-nowrap overflow-hidden text-ellipsis text-gray-900 dark:text-gray-100 ${index === headers.length - 1 ? '' : 'border-r border-gray-200 dark:border-gray-700'}`} style={{ width: columnWidths[sh] || DEFAULT_WIDTH, minWidth: 60, maxWidth: columnWidths[sh] || DEFAULT_WIDTH }}>
                      {(sh.toLowerCase() === 'tags' || sh === 'Tags') && Array.isArray(row[sh]) ? (
                        <div className="flex gap-1">
                          {(row[sh] as Tag[]).map((tag, tagIdx: number) => (
                            <span
                              key={tag.id + '-' + tagIdx}
                              className="inline-flex items-center text-xs px-2 py-0.5 rounded mr-1 mb-1 max-w-[140px] group"
                              style={{
                                background: `${tag.color || '#e5e7eb'}30`,
                                color: '#000000',
                                border: `2px solid ${tag.color || '#6366F1'}`,
                                fontWeight: 500
                              }}
                            >
                              <RiPriceTag3Line className="inline mr-1" />
                              <span className="truncate">{tag.name}</span>
                              {onRemoveTag && (
                                <button
                                  type="button"
                                  className="ml-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold focus:outline-none"
                                  title="Remove tag"
                                  onClick={e => { e.stopPropagation(); onRemoveTag(idx, tag.id); }}
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                        ) : sh.toLowerCase() === 'amount' ? (
                          String(row['Amount'] ?? '')
                        ) : sh.toLowerCase() === 'date' ? (
                          (() => {
                            const val = row[sh];
                            if (typeof val === 'string') {
                              // Fix any incorrectly formatted dates and then display them
                              const fixedDate = fixAndConvertToISO(val);
                              return formatDisplayDate(fixedDate);
                            }
                            return val !== undefined && val !== null ? String(val) : '';
                          })()
                      ) : getValueForColumn && tx ? (
                        (() => {
                          const val = getValueForColumn(tx, tx.bankId, sh);
                          if (val !== undefined && val !== null && val !== "") return String(val);
                          const rowValue = row[sh];
                          if (typeof rowValue === 'object' && rowValue !== null && 'name' in rowValue && 'id' in rowValue) {
                            return String((rowValue as unknown as Tag).name);
                          }
                          return rowValue !== undefined && rowValue !== null ? String(rowValue) : '';
                        })()
                      ) : (
                        (() => {
                          const rowValue = row[sh];
                          if (typeof rowValue === 'object' && rowValue !== null && 'name' in rowValue && 'id' in rowValue) {
                            return String((rowValue as unknown as Tag).name);
                          }
                          return rowValue !== undefined && rowValue !== null ? String(rowValue) : '';
                        })()
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
            {enableVirtualization && bottomSpacerHeight > 0 && (
              <tr style={{ height: bottomSpacerHeight }}>
                <td colSpan={2 + headers.length} />
              </tr>
            )}
          </tbody>
        </table>
      )}
      </div>
    </div>
  );
};

export default TransactionTable; 