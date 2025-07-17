import React, { useRef, useState, useEffect } from 'react';
import { RiPriceTag3Line } from 'react-icons/ri';
import { Transaction, TransactionRow, Tag } from '../types/transaction';

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
}

const DEFAULT_WIDTH = 140;

// Helper to normalize date to dd/mm/yyyy
function normalizeDateToDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '';
  const match = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (match) {
    const [, ddRaw, mmRaw, yyyyRaw] = match;
    let dd = ddRaw, mm = mmRaw, yyyy = yyyyRaw;
    if (yyyy.length === 2) yyyy = '20' + yyyy;
    if (dd.length === 1) dd = '0' + dd;
    if (mm.length === 1) mm = '0' + mm;
    return `${dd}/${mm}/${yyyy}`;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  return dateStr;
}

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

  // Double scroll logic
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [tableWidth, setTableWidth] = useState(0);

  useEffect(() => {
    // Set the width of the top scroll bar to match the table
    if (tableScrollRef.current) {
      setTableWidth(tableScrollRef.current.scrollWidth);
    }
  }, [headers, columnWidths, rows.length]);

  // Sync scroll positions
  useEffect(() => {
    const handleTopScroll = () => {
      if (tableScrollRef.current && topScrollRef.current) {
        tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
      }
    };
    const handleTableScroll = () => {
      if (tableScrollRef.current && topScrollRef.current) {
        topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
      }
    };
    const top = topScrollRef.current;
    const table = tableScrollRef.current;
    if (top) top.addEventListener('scroll', handleTopScroll);
    if (table) table.addEventListener('scroll', handleTableScroll);
    return () => {
      if (top) top.removeEventListener('scroll', handleTopScroll);
      if (table) table.removeEventListener('scroll', handleTableScroll);
    };
  }, [rows.length, headers.length, columnWidths]);

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
    if (!draggedHeader || draggedHeader === targetHeader) return;
    const fromIdx = headers.indexOf(draggedHeader);
    const toIdx = headers.indexOf(targetHeader);
    if (fromIdx === -1 || toIdx === -1) return;
    const newHeaders = [...headers];
    newHeaders.splice(fromIdx, 1);
    newHeaders.splice(toIdx, 0, draggedHeader);
    setDraggedHeader(null);
    if (typeof onReorderHeaders === 'function') onReorderHeaders(newHeaders);
  };

  const handleDragEnd = () => {
    setDraggedHeader(null);
  };

  return (
    <div className="h-[43vh] flex flex-col">
      {/* Top horizontal scrollbar */}
      <div
        ref={topScrollRef}
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          height: 16,
          width: '100%',
          marginBottom: 2,
        }}
      >
        <div style={{ width: tableWidth, height: 1 }} />
      </div>
      {/* Table container with vertical scroll */}
      <div ref={tableScrollRef} className="flex-1 overflow-auto">
      {loading ? (
        <div className="text-gray-500 text-sm">Loading transactions...</div>
      ) : error ? (
        <div className="text-red-600 text-sm">{error}</div>
      ) : rows.length === 0 ? (
        <div className="text-gray-500 text-sm">No mapped transactions found.</div>
      ) : (
        <table className="min-w-full border text-xs sm:text-sm bg-white/80 rounded-xl shadow" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 40 }} />
            <col style={{ width: 40 }} />
            {headers.map(h => (
              <col key={h} style={{ width: columnWidths[h] || DEFAULT_WIDTH }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-20 bg-white shadow">
            <tr>
              <th className="border px-2 py-1 bg-gray-100" style={{ width: 40 }}>
                <input type="checkbox" checked={selectAll} onChange={onSelectAll} />
              </th>
              <th className="border px-2 py-1 font-bold bg-gray-100" style={{ width: 40 }}>#</th>
              {headers.map((sh) => (
                <th
                  key={sh}
                  className="border px-2 py-1 font-bold bg-gray-100 group relative select-none whitespace-nowrap overflow-hidden text-ellipsis"
                  style={{ width: columnWidths[sh] || DEFAULT_WIDTH, minWidth: 60, maxWidth: columnWidths[sh] || DEFAULT_WIDTH }}
                  draggable
                  onDragStart={() => handleDragStart(sh)}
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, sh)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate block w-full">{sh}</span>
                    <span
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize z-10 group-hover:bg-blue-100"
                      onMouseDown={e => handleMouseDown(e, sh)}
                      style={{ userSelect: 'none' }}
                    >
                      <span className="block h-full w-1 mx-auto bg-gray-400 rounded" style={{ opacity: 0.6 }}></span>
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const tx = transactions?.find(t => t.id === row.id);
              return (
                <tr key={idx} data-row-idx={idx}>
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
                      {sh.toLowerCase() === 'tags' && Array.isArray(row[sh]) ? (
                        <div className="flex gap-1">
                          {(row[sh] as Tag[]).map((tag, tagIdx: number) => (
                            <span key={tag.id + '-' + tagIdx} className="inline-flex items-center text-xs px-2 py-0.5 rounded mr-1 mb-1 max-w-[120px] group" style={{ background: tag.color, color: '#222' }}>
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
                            if (typeof val === 'string') return normalizeDateToDDMMYYYY(val);
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