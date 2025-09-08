'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RiDeleteBin6Line, RiFileList3Line } from 'react-icons/ri';
import Papa from 'papaparse';

interface FileData {
  id: string;
  fileName: string;
  fileType: string;
  bankId: string;
  bankName: string;
  accountId: string;
  accountName?: string;
  accountNumber?: string;
  userId: string;
  createdAt: string;
  s3FileUrl?: string;
}

interface BankFilesComponentProps {
  bankId: string;
  bankName: string;
}

function FilePreview({ file, onSlice }: { file: FileData, onSlice?: (sliceData: string[][], file: FileData, selectedFields: string[]) => void }) {
  const [data, setData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colWidths, setColWidths] = useState<number[]>([]);
  const [headerRow, setHeaderRow] = useState<number | null>(null);
  const [startRow, setStartRow] = useState<number | null>(null);
  const [endRow, setEndRow] = useState<number | null>(null);
  const [selectionStep, setSelectionStep] = useState<'header' | 'transactions'>('header');
  const tableRef = React.useRef<HTMLTableElement>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [showRange, setShowRange] = useState(false);

  useEffect(() => {
    if (!file?.s3FileUrl) return;
    setLoading(true);
    setError(null);
    const key = file.s3FileUrl.split('.amazonaws.com/')[1];
    if (!key) {
      setError('Invalid S3 file URL');
      setLoading(false);
      return;
    }
    fetch('/api/statement/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key,
        userId: localStorage.getItem('userId') || ''
      }),
    })
      .then(res => res.json())
      .then(({ url, error }) => {
        if (error || !url) throw new Error(error || 'Failed to get presigned URL');
        return fetch(url);
      })
      .then(res => res.text())
      .then(csvText => {
        const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
        if (parsed.errors.length) throw new Error('Failed to parse CSV');
        setData(parsed.data as string[][]);
        setColWidths(parsed.data[0]?.map(() => 160) || []);
      })
      .catch(() => setError('Failed to load file preview'))
      .finally(() => setLoading(false));
  }, [file?.s3FileUrl]);

  // Column resize logic
  const resizingCol = useRef<number | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent, colIdx: number) => {
    resizingCol.current = colIdx;
    startX.current = e.clientX;
    startWidth.current = colWidths[colIdx] || 160;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingCol.current) return;
    const delta = e.clientX - startX.current;
    setColWidths(widths => widths.map((w, i) => 
      i === resizingCol.current ? Math.max(60, startWidth.current + delta) : w
    ));
  };

  const handleMouseUp = () => {
    resizingCol.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Only show slicing UI for statement files
  const isStatement = file?.fileType === 'Statement';

  // Only allow header/start/end selection when showRange is true
  const allowRangeSelection = isStatement && showRange;

  if (!file?.s3FileUrl) return <div>No preview available.</div>;
  if (loading) return <div>Loading preview...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!data.length) return <div>No data to display.</div>;

  return (
    <div className="bg-white rounded-xl border border-blue-100 p-4 mt-4 w-[70vw]">
      {isStatement && (
        <div className="mb-4 flex items-center gap-4">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={() => {
              if (showRange) {
                setHeaderRow(null);
                setStartRow(null);
                setEndRow(null);
                setSelectionStep('header');
              }
              setShowRange(r => !r);
            }}
          >
            {showRange ? 'Cancel Range Selection' : 'Select Range'}
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={headerRow === null || startRow === null || endRow === null}
            onClick={() => {
              if (headerRow !== null && startRow !== null && endRow !== null && onSlice) {
                const sliced = [data[headerRow], ...data.slice(startRow, endRow + 1)];
                onSlice(sliced, file, []);
              }
            }}
          >
            Slice
          </button>
        </div>
      )}
      <div className="overflow-auto" style={{ maxHeight: 600 }}>
        <table ref={tableRef} className="border-collapse min-w-full text-xs select-none" style={{ tableLayout: 'fixed' }}>
          <tbody>
            {data.map((row, i) => {
              const isFirstRow = i === 0;
              const isHeader = headerRow === i;
              const isInSlice = startRow !== null && endRow !== null && i >= startRow && i <= endRow;
              const isStart = startRow !== null && i === startRow;
              const isEnd = endRow !== null && i === endRow;
              return (
                <tr
                  key={i}
                  className={
                    isFirstRow
                      ? 'bg-blue-50 border-b-2 border-blue-300 sticky top-0 z-20'
                      : isHeader
                      ? 'bg-purple-100 border-l-4 border-purple-500'
                      : isStart
                      ? 'bg-green-100 border-l-4 border-green-500'
                      : isEnd
                      ? 'bg-yellow-100 border-r-4 border-yellow-500'
                      : isInSlice
                      ? 'bg-blue-100'
                      : ''
                  }
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`border border-blue-200 px-2 py-1 truncate relative ${isFirstRow ? 'font-semibold text-blue-900 bg-blue-50 group hover:bg-blue-100' : ''}`}
                      style={{ width: colWidths[j] || 160, minWidth: 60, maxWidth: 600 }}
                    >
                      {cell}
                      {isFirstRow && (
                        <>
                          <span
                            className="absolute right-0 top-0 h-full w-1 bg-gray-300 opacity-60"
                            style={{ userSelect: 'none' }}
                          />
                          <span
                            className="absolute right-0 top-0 h-full w-3 cursor-col-resize z-20 bg-blue-300 opacity-0 hover:opacity-100 transition-opacity"
                            onMouseDown={e => handleMouseDown(e, j)}
                            style={{ userSelect: 'none' }}
                          />
                        </>
                      )}
                      {/* Header selection */}
                      {allowRangeSelection && selectionStep === 'header' && hoveredRow === i && j === 0 && (
                        <button
                          className="ml-2 px-2 py-1 bg-purple-500 text-white rounded text-xs"
                          onClick={() => {
                            setHeaderRow(i);
                            setSelectionStep('transactions');
                          }}
                        >
                          Select as Header
                        </button>
                      )}
                      {/* Start/End badges */}
                      {allowRangeSelection && isHeader && j === 0 && (
                        <span className="ml-2 px-2 py-1 bg-purple-500 text-white rounded text-xs">Header</span>
                      )}
                      {allowRangeSelection && isStart && j === 0 && (
                        <span className="ml-2 px-2 py-1 bg-green-500 text-white rounded text-xs">Start</span>
                      )}
                      {allowRangeSelection && isEnd && j === 0 && (
                        <span className="ml-2 px-2 py-1 bg-yellow-500 text-white rounded text-xs">End</span>
                      )}
                      {allowRangeSelection && selectionStep === 'transactions' && startRow === null && j === 0 && i > (headerRow || 0) && hoveredRow === i && (
                        <button
                          className="ml-2 px-2 py-1 bg-green-500 text-white rounded text-xs"
                          onClick={() => setStartRow(i)}
                        >
                          Start
                        </button>
                      )}
                      {allowRangeSelection && selectionStep === 'transactions' && startRow !== null && endRow === null && j === 0 && i > startRow && hoveredRow === i && (
                        <button
                          className="ml-2 px-2 py-1 bg-yellow-500 text-white rounded text-xs"
                          onClick={() => setEndRow(i)}
                        >
                          End
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SlicePreviewComponent({ sliceData, file, selectedFields: initialSelectedFields }: { sliceData: string[][]; file: FileData; selectedFields: string[] }) {
  const [colWidths, setColWidths] = useState<number[]>([]);
  const tableRef = React.useRef<HTMLTableElement>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set(sliceData.slice(1).map((_, i) => i + 1)));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateRows, setDuplicateRows] = useState<Set<number>>(new Set());
  const [duplicateInfo, setDuplicateInfo] = useState<Array<{ row: number; key: string; fields: string; type: string }>>([]);
  const [duplicateChecked, setDuplicateChecked] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveTotal, setSaveTotal] = useState(0);
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [allDuplicatesSelected, setAllDuplicatesSelected] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>(initialSelectedFields);
  const [workingSlice, setWorkingSlice] = useState<string[][]>(sliceData);
  const [hasSerial, setHasSerial] = useState<boolean>(() => sliceData[0]?.[0]?.toLowerCase().includes('sl') || false);

  // Column resize logic - added for SlicePreviewComponent
  const resizingCol = useRef<number | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent, colIdx: number) => {
    resizingCol.current = colIdx;
    startX.current = e.clientX;
    startWidth.current = colWidths[colIdx] || 160;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingCol.current) return;
    const delta = e.clientX - startX.current;
    setColWidths(widths => widths.map((w, i) => 
      i === resizingCol.current ? Math.max(60, startWidth.current + delta) : w
    ));
  };

  const handleMouseUp = () => {
    resizingCol.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Update selectedFields when sliceData changes
  useEffect(() => {
    setWorkingSlice(sliceData);
    if (sliceData.length > 0) {
      const currentHeaders = sliceData[0];
      const currentFieldNames = currentHeaders.map((header, idx) => `${header}-${idx}`);
      setSelectedFields(currentFieldNames);
      setColWidths(currentHeaders.map(() => 160));
    }
  }, [sliceData]);

  // Update allDuplicatesSelected whenever selectedRows or duplicateRows changes
  useEffect(() => {
    const allDupSelected = Array.from(duplicateRows).every(rowIndex => selectedRows.has(rowIndex));
    setAllDuplicatesSelected(allDupSelected);
  }, [selectedRows, duplicateRows]);

  if (!workingSlice || !workingSlice.length) return <div>No data to display.</div>;

  // Duplicate check handler
  const handleCheckDuplicates = async () => {
    setCheckingDuplicates(true);
    setDuplicateRows(new Set());
    setDuplicateInfo([]);
    setDuplicateChecked(false);
    setSaveError(null);
    
    try {
      const userId = localStorage.getItem('userId') || '';
      const res = await fetch(`/api/transactions?accountId=${file.accountId}&userId=${userId}&bankName=${encodeURIComponent(file.bankName || '')}`);
      const existing = await res.json();
      
      if (!Array.isArray(existing)) {
        throw new Error('Failed to fetch existing transactions');
      }
      
      const uniqueFields = selectedFields.map(f => f.split('-')[0]);
      
      // Check for duplicates within the current slice data first
      const currentDataKeys = new Set<string>();
      const currentDataDups = new Set<number>();
      const currentDataDupInfo: Array<{ row: number; key: string; fields: string; type: string }> = [];
      
      workingSlice.slice(1).forEach((row, i) => {
        const rowObj: Record<string, string> = {};
        workingSlice[0].forEach((header, j) => { rowObj[header] = row[j]; });
        const key = uniqueFields.map(f => {
          let value = (rowObj[f] || '').toString().trim().toLowerCase();
          if (f.toLowerCase().includes('amount') || f.toLowerCase().includes('balance')) {
            value = value.replace(/,/g, '');
          }
          return value;
        }).join('|');
        
        if (currentDataKeys.has(key)) {
          currentDataDups.add(i + 1);
          currentDataDupInfo.push({ 
            row: i + 2, 
            key,
            fields: uniqueFields.map(f => `${f}: ${rowObj[f]}`).join(', '),
            type: 'internal'
          });
        } else {
          currentDataKeys.add(key);
        }
      });
      
      // Check for duplicates against existing database data
      const fieldMapping: { [key: string]: string } = {};
      if (existing.length > 0) {
        const existingFields = Object.keys(existing[0]);
        uniqueFields.forEach(field => {
          if (existingFields.includes(field)) {
            fieldMapping[field] = field;
          } else {
            const lowerField = field.toLowerCase();
            const matchedField = existingFields.find(ef => ef.toLowerCase() === lowerField);
            if (matchedField) {
              fieldMapping[field] = matchedField;
            } else {
              const partialMatch = existingFields.find(ef => 
                ef.toLowerCase().includes(lowerField) || lowerField.includes(ef.toLowerCase())
              );
              if (partialMatch) {
                fieldMapping[field] = partialMatch;
              } else {
                fieldMapping[field] = field;
              }
            }
          }
        });
      }
      
      const existingSet = new Set(
        existing.map((tx: Record<string, unknown>) => uniqueFields.map(f => {
          const dbField = fieldMapping[f];
          let value = (tx[dbField] || '').toString().trim().toLowerCase();
          if (f.toLowerCase().includes('amount') || f.toLowerCase().includes('balance')) {
            value = value.replace(/,/g, '');
          }
          return value;
        }).join('|'))
      );
      
      const dbDupRows = new Set<number>();
      const dbDupInfo: Array<{ row: number; key: string; fields: string; type: string }> = [];
      
      workingSlice.slice(1).forEach((row, i) => {
        const rowObj: Record<string, string> = {};
        workingSlice[0].forEach((header, j) => { rowObj[header] = row[j]; });
        const key = uniqueFields.map(f => {
          let value = (rowObj[f] || '').toString().trim().toLowerCase();
          if (f.toLowerCase().includes('amount') || f.toLowerCase().includes('balance')) {
            value = value.replace(/,/g, '');
          }
          return value;
        }).join('|');
        
        if (existingSet.has(key)) {
          dbDupRows.add(i + 1);
          dbDupInfo.push({ 
            row: i + 2, 
            key,
            fields: uniqueFields.map(f => `${f}: ${rowObj[f]}`).join(', '),
            type: 'database'
          });
        }
      });
      
      // Combine both types of duplicates
      const allDupRows = new Set([...currentDataDups, ...dbDupRows]);
      const allDupInfo = [...currentDataDupInfo, ...dbDupInfo];
      
      setDuplicateRows(allDupRows);
      setDuplicateInfo(allDupInfo);
      setDuplicateChecked(true);
      
      // Auto-select all duplicate rows
      setSelectedRows(prev => {
        const newSelected = new Set(prev);
        allDupRows.forEach(rowIndex => {
          newSelected.add(rowIndex);
        });
        return newSelected;
      });
      
    } catch (err) {
      console.error('Error checking duplicates:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to check for duplicates');
    } finally {
      setCheckingDuplicates(false);
    }
  };

  // Add a button to toggle select/deselect all duplicates
  const handleToggleDuplicates = () => {
    setSelectedRows(prev => {
      const newSelected = new Set(prev);
      const allSelected = Array.from(duplicateRows).every(rowIndex => newSelected.has(rowIndex));
      if (allSelected) {
        // Deselect all duplicates
        duplicateRows.forEach(rowIndex => newSelected.delete(rowIndex));
        setAllDuplicatesSelected(false);
      } else {
        // Select all duplicates
        duplicateRows.forEach(rowIndex => newSelected.add(rowIndex));
        setAllDuplicatesSelected(true);
      }
      return newSelected;
    });
  };

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    setDuplicateChecked(false);
    setIsBatchSaving(true);
    try {
      // Only include selected rows
      const selectedData = [workingSlice[0], ...workingSlice.slice(1).filter((_, i) => selectedRows.has(i + 1))];
      const header = selectedData[0];
      const rows = selectedData.slice(1);
      const batchSize = 25;
      setSaveTotal(rows.length);
      setSaveProgress(0);
      for (let i = 0; i < rows.length; i += batchSize) {
        const batchRows = rows.slice(i, i + batchSize);
        const batchData = [header, ...batchRows];
        const csv = Papa.unparse(batchData);
        const payload = {
          csv,
          statementId: file.id || '',
          startRow: 1,
          endRow: batchData.length - 1,
          bankId: file.bankId || '',
          accountId: file.accountId || '',
          fileName: file.fileName || '',
          userId: localStorage.getItem('userId') || '',
          bankName: file.bankName || '',
          accountName: file.accountName || '',
          accountNumber: file.accountNumber || '',
          duplicateCheckFields: selectedFields.map(f => f.split('-')[0]).filter(n => n !== 'Sl. No.'),
          s3FileUrl: file.s3FileUrl || '',
        };
        const res = await fetch('/api/transaction/slice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.error || 'Failed to save transactions');
        }
        setSaveProgress(prev => prev + batchRows.length);
        if (i + batchSize < rows.length) {
          await new Promise(res => setTimeout(res, 1000));
        }
      }
      setSaveSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save transactions';
      setSaveError(errorMessage);
    } finally {
      setSaving(false);
      setIsBatchSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-blue-100 p-4 mt-4 w-[70vw]">
      {/* Quick Actions */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-700">Row Tools</div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-all duration-200 text-xs font-medium disabled:opacity-50"
            onClick={() => {
              if (hasSerial) return;
              const newSlice = workingSlice.map((row, i) => [i === 0 ? 'Sl. No.' : String(i), ...row]);
              setWorkingSlice(newSlice);
              setHasSerial(true);
              setColWidths([80, ...colWidths]);
              setSelectedFields(prev => ['Sl. No.-0', ...prev.map((f, idx) => `${f.split('-')[0]}-${idx + 1}`)]);
            }}
            disabled={hasSerial}
            title="Add a serial number column to the sliced data"
          >
            Add Sl. No.
          </button>
        </div>
      </div>
      {/* Duplicate check field selection UI */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-3">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Select fields to check for duplicate transactions
        </h3>
        
        <div className="grid grid-cols-10 gap-2 mb-4">
          {workingSlice[0]?.filter(header => header && header.trim() !== '').map((header, idx) => (
            <label key={idx} className="flex items-center space-x-1 p-2 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFields.includes(`${header}-${idx}`)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedFields(prev => [...prev, `${header}-${idx}`]);
                  } else {
                    setSelectedFields(prev => prev.filter(field => field !== `${header}-${idx}`));
                  }
                }}
                className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-1"
              />
              <span className="text-xs font-medium text-white truncate" title={header}>
                {header}
              </span>
            </label>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow text-xs font-medium"
            onClick={handleCheckDuplicates}
            disabled={checkingDuplicates || workingSlice.length === 0}
            title="Check for duplicate transactions in database"
          >
            {checkingDuplicates ? (
              <>
                <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Checking...
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Check Duplicates
              </>
            )}
          </button>
          
          {duplicateRows.size > 0 && (
            <button
              className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-sm hover:shadow text-xs font-medium"
              onClick={handleToggleDuplicates}
              title="Select or deselect all duplicate rows"
            >
              {allDuplicatesSelected ? 'Deselect Duplicates' : 'Select Duplicates'}
            </button>
          )}
        </div>
      </div>
      <div className="overflow-auto" style={{ maxHeight: '45vh', minHeight: '300px' }}>
        <table ref={tableRef} className="border-collapse min-w-full text-xs select-none" style={{ tableLayout: 'fixed' }}>
          <tbody>
            {workingSlice.map((row, i) => {
              const isHeader = i === 0;
              return (
                <tr
                  key={i}
                  ref={el => { rowRefs.current[i] = el; }}
                  className={
                    isHeader
                      ? 'bg-blue-50 border-b-2 border-blue-300'
                      : duplicateRows.has(i) && duplicateChecked
                      ? 'bg-red-200 border-2 border-red-600'
                      : selectedRows.has(i)
                      ? 'bg-blue-50'
                      : ''
                  }
                  title={
                    duplicateRows.has(i) && duplicateChecked
                      ? duplicateInfo.find(info => info.row === i + 2)?.type === 'internal'
                        ? 'Duplicate within uploaded data'
                        : 'Duplicate in database'
                      : undefined
                  }
                >
                  <td className="px-2 py-1 border border-blue-200 text-center">
                    {isHeader ? (
                      <input 
                        type="checkbox" 
                        checked={selectedRows.size === workingSlice.slice(1).length && selectedRows.size > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRows(new Set(workingSlice.slice(1).map((_, i) => i + 1)));
                          } else {
                            setSelectedRows(new Set());
                          }
                        }} 
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2" 
                      />
                    ) : (
                      <input type="checkbox" checked={selectedRows.has(i)} onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRows(prev => new Set([...prev, i]));
                        } else {
                          setSelectedRows(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(i);
                            return newSet;
                          });
                        }
                      }} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2" />
                    )}
                  </td>
                  {row.map((cell, j) => (
                    <td 
                      key={j} 
                      className={`border border-blue-200 px-2 py-1 truncate relative ${isHeader ? 'font-semibold text-blue-900' : ''}`} 
                      style={{ width: colWidths[j] || 160, minWidth: 60, maxWidth: 600 }}
                    >
                      {cell}
                      {isHeader && (
                        <>
                          <span
                            className="absolute right-0 top-0 h-full w-1 bg-gray-300 opacity-60"
                            style={{ userSelect: 'none' }}
                          />
                          <span
                            className="absolute right-0 top-0 h-full w-3 cursor-col-resize z-20 bg-blue-300 opacity-0 hover:opacity-100 transition-opacity"
                            onMouseDown={e => handleMouseDown(e, j)}
                            style={{ userSelect: 'none' }}
                          />
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {duplicateChecked && duplicateRows.size > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-800 text-base font-semibold mb-2">
            ⚠️ {duplicateRows.size} row(s) already exist in database
          </div>
          <div className="text-red-600 text-sm space-y-1">
            {duplicateInfo.some(info => info.type === 'internal') && (
              <div>• Some duplicates exist within the uploaded data</div>
            )}
            {duplicateInfo.some(info => info.type === 'database') && (
              <div>• Some duplicates exist in the database (checked using Date + Description)</div>
            )}
            <div className="mt-2 text-xs">
              These rows are highlighted in red and will be skipped during save to avoid duplicates.
            </div>
          </div>
        </div>
      )}
      {duplicateChecked && duplicateRows.size === 0 && (
        <div className="mt-2 text-green-700 text-sm font-semibold">
          ✅ No duplicate rows found
        </div>
      )}
      {/* Progress bar UI below the table and above the Save button */}
      {isBatchSaving && (
        <div className="w-full my-4">
          <div className="mb-1 text-blue-700 font-semibold">Saving {saveProgress} of {saveTotal} rows...</div>
          <div className="w-full bg-blue-100 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${saveTotal ? (saveProgress / saveTotal) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2 mt-4">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          onClick={handleSave}
          disabled={saving || selectedRows.size === 0}
        >
          {saving ? 'Saving...' : `Save ${selectedRows.size} row(s)`}
        </button>
        {saveError && <span className="text-red-600 ml-4">{saveError}</span>}
        {saveSuccess && <span className="text-green-600 ml-4">Saved successfully!</span>}
      </div>
    </div>
  );
}

export default function BankFilesComponent({ bankId, bankName }: BankFilesComponentProps) {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Slice preview state
  const [showSlicePreview, setShowSlicePreview] = useState(false);
  const [sliceData, setSliceData] = useState<string[][]>([]);
  const [sliceFile, setSliceFile] = useState<FileData | null>(null);
  const [sliceSelectedFields, setSliceSelectedFields] = useState<string[]>([]);  


  const fetchBankFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError('User not authenticated');
        return;
      }

      // Fetch all accounts for this bank
      const accountsRes = await fetch(`/api/account?bankId=${bankId}&userId=${userId}`);
      const accounts = await accountsRes.json();
      
      if (!Array.isArray(accounts)) {
        setError('Failed to fetch accounts');
        return;
      }

      // Fetch all statements for this bank directly
      const statementsRes = await fetch(`/api/statements?bankId=${bankId}&userId=${userId}`);
      const statements = await statementsRes.json();
      
      if (!Array.isArray(statements)) {
        setError('Failed to fetch statements');
        return;
      }

      // Create a map of account information for quick lookup
      const accountMap = new Map();
      accounts.forEach((account: { id: string; accountHolderName?: string; accountNumber?: string }) => {
        accountMap.set(account.id, {
          accountName: account.accountHolderName || '',
          accountNumber: account.accountNumber || ''
        });
      });

      // Add account information to each statement
      const filesWithAccountInfo = statements.map((statement: FileData) => {
        const accountInfo = accountMap.get(statement.accountId) || {};
        return {
          ...statement,
          accountName: accountInfo.accountName || statement.accountName || '',
          accountNumber: accountInfo.accountNumber || statement.accountNumber || '',
        };
      });

      setFiles(filesWithAccountInfo);
    } catch (err) {
      console.error('Error fetching bank files:', err);
      setError('Failed to fetch files');
    } finally {
      setLoading(false);
    }
  }, [bankId]);

  useEffect(() => {
    fetchBankFiles();
  }, [fetchBankFiles]);

  const handleFileClick = (file: FileData) => {
    setSelectedFile(file);
    setShowPreview(true);
  };

  const handleBackToFiles = () => {
    setSelectedFile(null);
    setShowPreview(false);
  };

  const handleSlice = (sliceData: string[][], file: FileData, selectedFields: string[]) => {
    // Show slice preview within the same component
    setSliceData(sliceData);
    setSliceFile(file);
    setSliceSelectedFields(selectedFields);
    setShowSlicePreview(true);
  };

  const handleDeleteFile = async (file: FileData) => {
    if (!confirm(`Are you sure you want to delete "${file.fileName}"?`)) {
      return;
    }

    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch('/api/statement/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statementId: file.id,
          s3FileUrl: file.s3FileUrl,
          userId,
          bankName: file.bankName || '',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to delete file');
      }

      // Refresh the files list
      fetchBankFiles();
    } catch (err) {
      console.error('Error deleting file:', err);
      alert('Failed to delete file');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading files...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {showSlicePreview && sliceFile ? (
        // Slice Preview View
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setShowSlicePreview(false);
                  setSliceFile(null);
                  setSliceData([]);
                  setSliceSelectedFields([]);
                }}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Files
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Slice Preview: {sliceFile.fileName}</h2>
                <p className="text-gray-600 mt-1">Previewing sliced data from {sliceFile.fileName}</p>
              </div>
            </div>
          </div>
          <SlicePreviewComponent 
            sliceData={sliceData} 
            file={sliceFile} 
            selectedFields={sliceSelectedFields} 
          />
        </div>
      ) : showPreview && selectedFile ? (
        // File Preview View
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToFiles}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Files
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">File Preview: {selectedFile.fileName}</h2>
                <p className="text-gray-600 mt-1">Previewing file details and data</p>
              </div>
            </div>
          </div>
          
          {/* File Details */}
          {/* <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 w-[73.5vw]">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">File Name:</span>
                <p className="text-gray-900">{selectedFile.fileName}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">File Type:</span>
                <p className="text-gray-900">{selectedFile.fileType || 'Unknown'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Account:</span>
                <p className="text-gray-900">{selectedFile.accountName || 'Unknown'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Account Number:</span>
                <p className="text-gray-900">{selectedFile.accountNumber || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Created:</span>
                <p className="text-gray-900">{formatDate(selectedFile.createdAt)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Bank:</span>
                <p className="text-gray-900">{selectedFile.bankName}</p>
              </div>
            </div>
            
            {selectedFile.s3FileUrl && (
              <div className="mt-4">
                <span className="font-medium text-gray-700">File URL:</span>
                <p className="text-sm text-blue-600 break-all mt-1">
                  {selectedFile.s3FileUrl}
                </p>
              </div>
            )}
          </div> */}
          
          {/* File Preview with Slice functionality */}
          {selectedFile.fileType === 'Statement' && (
            <FilePreview file={selectedFile} onSlice={handleSlice} />
          )}
        </div>
      ) : (
        // Files List View
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Files for {bankName}</h2>
              <p className="text-gray-600 mt-1">
                {files.length} file{files.length !== 1 ? 's' : ''} found
              </p>
            </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <RiFileList3Line className="text-gray-400" size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
          <p className="text-gray-500">
            No files have been uploaded for {bankName} yet.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200 cursor-pointer group"
              onClick={() => handleFileClick(file)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <RiFileList3Line className="text-blue-600" size={20} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="p-1 bg-red-100 hover:bg-red-200 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFile(file);
                    }}
                    title="Delete file"
                  >
                    <RiDeleteBin6Line className="text-red-600" size={14} />
                  </button>
                </div>
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-1 truncate" title={file.fileName}>
                {file.fileName}
              </h3>
              
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <span className="font-medium">Account:</span>
                  <span className="truncate">{file.accountName || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">Type:</span>
                  <span>{file.fileType || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">Created:</span>
                  <span>{formatDate(file.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {files.map((file) => (
                <tr
                  key={file.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleFileClick(file)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{file.fileName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{file.accountName || 'Unknown'}</div>
                    {file.accountNumber && (
                      <div className="text-sm text-gray-500">{file.accountNumber}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {file.fileType || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(file.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(file);
                      }}
                    >
                      <RiDeleteBin6Line size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
                 </>
       )}
      </div>
    );
  } 