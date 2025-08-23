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
  availableBanks?: string[];
}

const DEFAULT_WIDTH = 120;



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
  availableBanks = [],
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
      <div ref={tableScrollRef} className="flex-1 overflow-y-auto border border-gray-200 rounded">
      {loading ? (
        <div className="text-gray-500 text-sm">Loading transactions...</div>
      ) : error ? (
        <div className="text-red-600 text-sm">{error}</div>
      ) : rows.length === 0 ? (
        <div className="text-gray-500 text-sm">No mapped transactions found.</div>
      ) : (
        <table className="w-full border text-xs sm:text-sm bg-white/80 rounded-xl shadow" style={{ height: 'fit-content' }}>
          <colgroup>
            <col style={{ width: 40 }} />
            <col style={{ width: 40 }} />
            {headers.map(h => (
              <col key={h} style={{ width: columnWidths[h] || DEFAULT_WIDTH }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-20 bg-white shadow">
            <tr>
              <th className="border px-2 py-1 bg-gray-100" style={{ width: 40 }} title="Select all transactions">
                <input type="checkbox" checked={selectAll} onChange={onSelectAll} />
              </th>
              <th className="border px-2 py-1 font-bold bg-gray-100" style={{ width: 40 }} title="Row number">#</th>
              {headers.map((sh) => (
                <th
                  key={sh}
                  className="border px-2 py-1 font-bold bg-gray-100 group relative select-none whitespace-nowrap text-ellipsis"
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
                            className="sort-button p-1 hover:bg-gray-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300"
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
                            <div className="sort-dropdown absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-[9999] min-w-[140px]">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Sort ascending clicked');
                                  if (onSort) onSort(sh, 'asc');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center gap-2"
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
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center gap-2"
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
                            className="sort-button p-1 hover:bg-gray-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300"
                            title="Filter by date"
                          >
                            <FiChevronDown className="w-3 h-3 text-gray-400" />
                          </button>
                          
                          {sortDropdownOpen === sh && (
                            <div className="sort-dropdown absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-[9999] min-w-[140px]">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (onDateFilter) onDateFilter('newest');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center gap-2"
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
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center gap-2"
                              >
                                <FiChevronUp className="w-3 h-3" />
                                Oldest to Newest
                              </button>
                              <div className="border-t border-gray-200 my-1"></div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (onDateFilter) onDateFilter('clear');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 text-gray-500"
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
                            className="sort-button p-1 hover:bg-gray-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300"
                            title="Filter by bank"
                          >
                            <FiChevronDown className="w-3 h-3 text-gray-400" />
                          </button>
                          
                          {sortDropdownOpen === sh && (
                            <div className="sort-dropdown absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-[9999] min-w-[140px] max-h-48 overflow-y-auto">
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
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center gap-2"
                                >
                                  {bank}
                                </button>
                              ))}
                              <div className="border-t border-gray-200 my-1"></div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (onBankFilter) onBankFilter('clear');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 text-gray-500"
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
                            className="sort-button p-1 hover:bg-gray-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300"
                            title="Filter by transaction type"
                          >
                            <FiChevronDown className="w-3 h-3 text-gray-400" />
                          </button>
                          
                          {sortDropdownOpen === sh && (
                            <div className="sort-dropdown absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-[9999] min-w-[140px]">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (onDrCrFilter) onDrCrFilter('DR');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center gap-2"
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
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center gap-2"
                              >
                                CR (Credit)
                              </button>
                              <div className="border-t border-gray-200 my-1"></div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (onDrCrFilter) onDrCrFilter('clear');
                                  setSortDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 text-gray-500"
                              >
                                Clear filter
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Resize handle */}
                      <span
                        className="absolute right-0 top-0 h-full w-2 cursor-col-resize z-10 group-hover:bg-blue-100"
                        onMouseDown={e => handleMouseDown(e, sh)}
                        style={{ userSelect: 'none' }}
                      >
                        <span className="block h-full w-1 mx-auto bg-gray-400 rounded" style={{ opacity: 0.6 }}></span>
                      </span>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const tx = transactions?.find(t => t.id === row.id);
              return (
                <tr key={idx} data-row-idx={idx} data-transaction-id={row.id} className="hover:bg-blue-50 transition-colors duration-150">
                  <td className="border px-2 py-1 text-center" style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selectedRows.has(idx)}
                      onChange={() => onRowSelect(idx)}
                    />
                  </td>
                  <td className="border px-2 py-1 text-center" style={{ width: 40 }}>{idx + 1}</td>
                  {headers.map((sh) => (
                    <td key={sh} className="border px-2 py-1 whitespace-nowrap overflow-hidden text-ellipsis" style={{ width: columnWidths[sh] || DEFAULT_WIDTH, minWidth: 60, maxWidth: columnWidths[sh] || DEFAULT_WIDTH }}>
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
          </tbody>
        </table>
      )}
      </div>
    </div>
  );
};

export default TransactionTable; 