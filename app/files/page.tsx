'use client'
import React, { useState, useEffect, useRef } from 'react';
import FilesSidebar from '../components/FilesSidebar';
import { RiCloseLine } from 'react-icons/ri';
import Papa from 'papaparse';
import { FiEdit2, FiTrash2, FiGrid, FiList } from 'react-icons/fi';
import Modal from '../components/Modals/Modal';





interface UploadedFile {
  id: string;
  fileName: string;
  fileType: string;
  bankId: string;
  bankName: string;
  accountId: string;
  userId: string;
  createdAt: string;
}

function UploadModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: (file: UploadedFile) => void }) {
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [bankId, setBankId] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [banks, setBanks] = useState<{ id: string; bankName: string }[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; accountHolderName: string; accountNumber?: string }[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch banks on open
  useEffect(() => {
    if (isOpen) {
      fetch('/api/bank')
        .then(res => res.json())
        .then(data => setBanks(Array.isArray(data) ? data : []));
    }
  }, [isOpen]);

  // Fetch accounts when bankId changes
  useEffect(() => {
    if (bankId) {
      setLoadingAccounts(true);
      const userId = localStorage.getItem('userId');
      fetch(`/api/account?bankId=${bankId}&userId=${userId}`)
        .then(res => res.json())
        .then(data => setAccounts(Array.isArray(data) ? data : []))
        .finally(() => setLoadingAccounts(false));
    } else {
      setAccounts([]);
    }
  }, [bankId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedFile || !fileName || !fileType || !bankId || !bankAccount) {
      setError('Please fill all fields and select a file.');
      return;
    }
    setUploading(true);
    const userId = localStorage.getItem('userId');
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('fileName', fileName);
    formData.append('fileType', fileType);
    formData.append('bankId', bankId);
    formData.append('bankName', banks.find(b => b.id === bankId)?.bankName || '');
    formData.append('accountId', bankAccount);
    
    // Get account details for the selected account
    const selectedAccount = accounts.find(a => a.id === bankAccount);
    if (selectedAccount) {
      formData.append('accountName', selectedAccount.accountHolderName || '');
      formData.append('accountNumber', selectedAccount.accountNumber || '');
    }
    
    formData.append('userId', userId || '');
    try {
      const res = await fetch('/api/statement/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to upload file');
        setUploading(false);
        return;
      }
      setShowSuccess(true);
      setUploading(false);
      onSuccess(await res.json());
    } catch {
      setError('Failed to upload file');
      setUploading(false);
    }
  };

  React.useEffect(() => {
    if (!isOpen) {
      setFileName('');
      setFileType('');
      setBankId('');
      setBankAccount('');
      setShowSuccess(false);
      setSelectedFile(null);
      setAccounts([]);
      setError(null);
      setUploading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
        <button className="absolute top-3 right-3 text-gray-400 hover:text-red-500" onClick={onClose}><RiCloseLine size={24} /></button>
        <h2 className="text-xl font-bold mb-4 text-blue-800">Upload File</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">File Name</label>
            <input type="text" className="w-full border rounded px-3 py-2" value={fileName} onChange={e => setFileName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Select File</label>
            <input type="file" className="w-full border rounded px-3 py-2" onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)} required />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">File Type</label>
            <select className="w-full border rounded px-3 py-2" value={fileType} onChange={e => setFileType(e.target.value)} required>
              <option value="">Select type</option>
              <option value="Statement">Statement</option>
              <option value="Other">Other</option>
            </select>
          </div>
          {fileType === 'Statement' && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-1">Bank Name</label>
                <select className="w-full border rounded px-3 py-2" value={bankId} onChange={e => setBankId(e.target.value)} required>
                  <option value="">Select bank</option>
                  {banks.map(b => (
                    <option key={b.id} value={b.id}>{b.bankName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Bank Account</label>
                <select className="w-full border rounded px-3 py-2" value={bankAccount} onChange={e => setBankAccount(e.target.value)} required disabled={!bankId || loadingAccounts}>
                  <option value="">{loadingAccounts ? 'Loading...' : 'Select bank account'}</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.accountHolderName}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          {error && <div className="text-red-600 text-sm font-semibold">{error}</div>}
          <div className="flex justify-end">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg shadow transition-all" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
          </div>
        </form>
        {showSuccess && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded text-green-700 font-semibold">File uploaded successfully!</div>
        )}
      </div>
    </div>
  );
}

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
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
  const [showSliceModal, setShowSliceModal] = useState(false);
  const [sliceData] = useState<string[][]>([]);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [sliceSaving, setSliceSaving] = useState(false);
  const [sliceSaveError, setSliceSaveError] = useState<string | null>(null);
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

  // Column resize logic - improved version like TransactionTable
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
    <div className="bg-white rounded-xl border border-blue-100 p-4 mt-4">
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
                onSlice(sliced, file, selectedFields);
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
      {/* Slice Modal */}
      {showSliceModal && (
        <Modal isOpen={showSliceModal} onClose={() => setShowSliceModal(false)} title="Sliced Transactions Preview">
          <div className="mb-2">
            <div className="font-semibold mb-1">Select fields to check for duplicate transactions:</div>
            <div className="flex flex-wrap gap-2 mb-2">
              {sliceData.length > 0 && sliceData[0].map((header, idx) => (
                <label key={header + '-' + idx} className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(header + '-' + idx)}
                    onChange={e => {
                      setSelectedFields(fields =>
                        e.target.checked
                          ? [...fields, header + '-' + idx]
                          : fields.filter(f => f !== header + '-' + idx)
                      );
                    }}
                  />
                  {header}
                </label>
              ))}
            </div>
            <button
              className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs mb-2"
              // onClick={...} // Delimit column logic placeholder
              disabled={sliceData.length === 0}
              title="Delimit a column (e.g., split date/time)"
            >
              {/* <FiColumns /> */} Delimit Column
            </button>
          </div>
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="min-w-full border text-sm">
              <thead className="sticky top-0 z-20 bg-white">
                <tr>
                  {sliceData[0]?.map((header, idx) => (
                    <th key={idx} className="border px-2 py-2 font-bold bg-blue-50 text-blue-900 whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sliceData.slice(1).map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className="border px-2 py-1 whitespace-nowrap">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={async () => {
                setSliceSaving(true);
                setSliceSaveError(null);
                try {
                  // Prepare CSV string from sliceData
                  const csv = Papa.unparse(sliceData);
                  // Prepare payload for /api/transaction/slice
                  const payload = {
                    csv,
                    statementId: file.id || '',
                    startRow: startRow,
                    endRow: endRow,
                    bankId: file.bankId || '',
                    accountId: file.accountId || '',
                    fileName: file.fileName || '',
                    userId: localStorage.getItem('userId') || '',
                    bankName: file.bankName || '',
                    accountName: file.accountName || '',
                    accountNumber: file.accountNumber || '',
                    duplicateCheckFields: selectedFields.map(f => f.split('-')[0]),
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
                  setShowSliceModal(false);
                  setSliceSaveError(null);
                  alert('Transactions saved successfully!');
                } catch (err: unknown) {
                  const errorMessage = err instanceof Error ? err.message : 'Failed to save transactions';
                  setSliceSaveError(errorMessage);
                } finally {
                  setSliceSaving(false);
                }
              }}
              disabled={sliceSaving}
            >
              {sliceSaving ? 'Saving...' : 'Save'}
            </button>
            {sliceSaveError && <span className="text-red-600 ml-4">{sliceSaveError}</span>}
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              onClick={() => setShowSliceModal(false)}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}





function FilesTable({ files, onFileClick, selectedIds, onSelect, onSelectAll, onEdit, onDelete }: { files: FileData[], onFileClick: (file: FileData) => void, selectedIds: string[], onSelect: (id: string) => void, onSelectAll: (checked: boolean) => void, onEdit: (file: FileData) => void, onDelete: (file: FileData) => void }) {
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());
  const [expandedHeaders, setExpandedHeaders] = useState<Set<string>>(new Set());
  
  const columns = [
    { key: 'id', label: 'ID', width: 'w-16' },
    { key: 'accountId', label: 'Account ID', width: 'w-24' },
    { key: 'bankId', label: 'Bank ID', width: 'w-20' },
    { key: 'bankName', label: 'Bank Name', width: 'w-32' },
    { key: 'createdAt', label: 'Created At', width: 'w-28' },
    { key: 'fileName', label: 'File Name', width: 'w-48' },
    { key: 'fileType', label: 'File Type', width: 'w-20' },
    { key: 's3FileUrl', label: 'S3 File URL', width: 'w-40' },
    { key: 'tags', label: 'Tags', width: 'w-32' },
    { key: 'transaction', label: 'Transaction', width: 'w-24' },
  ];
  
  const allSelected = files.length > 0 && files.every(f => selectedIds.includes(f.id));
  
  const toggleCellExpansion = (fileId: string, columnKey: string) => {
    const key = `${fileId}-${columnKey}`;
    setExpandedCells(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };
  
  const toggleHeaderExpansion = (columnKey: string) => {
    setExpandedHeaders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      return newSet;
    });
  };
  
  const formatCellContent = (value: unknown) => {
    if (value === undefined || value === null) return { display: '', full: '' };
    
    let displayValue = '';
    if (typeof value === 'object') {
      displayValue = JSON.stringify(value);
    } else {
      displayValue = String(value);
    }
    
    // Truncate content for display
    const maxLength = 20;
    const truncated = displayValue.length > maxLength ? displayValue.substring(0, maxLength) + '...' : displayValue;
    
    return { display: truncated, full: displayValue };
  };
  
  return (
    <div className="overflow-x-auto max-w-full">
      <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
        <table className="min-w-full border border-blue-100 rounded-lg">
          <thead>
            <tr className="bg-blue-50">
              <th className="px-2 py-2 sticky top-0 bg-blue-50 z-10 w-8">
                <input type="checkbox" checked={allSelected} onChange={e => onSelectAll(e.target.checked)} />
              </th>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-2 py-2 text-left text-blue-900 font-semibold border-b border-blue-100 sticky top-0 bg-blue-50 z-10 ${col.width} cursor-pointer hover:bg-blue-100 transition-colors`}
                  onClick={() => toggleHeaderExpansion(col.key)}
                  title={`Click to ${expandedHeaders.has(col.key) ? 'collapse' : 'expand'} ${col.label}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{col.label}</span>
                    <svg 
                      width="12" 
                      height="12" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      className={`text-blue-600 transition-transform ${expandedHeaders.has(col.key) ? 'rotate-180' : ''}`}
                    >
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {expandedHeaders.has(col.key) && (
                    <div className="mt-1 text-xs text-blue-700 font-normal">
                      Full column data visible
                    </div>
                  )}
                </th>
              ))}
              <th className="px-2 py-2 sticky top-0 bg-blue-50 z-10 w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map(file => (
              <tr
                key={file.id}
                className={`hover:bg-blue-100 cursor-pointer group ${selectedIds.includes(file.id) ? 'bg-blue-50' : ''}`}
                onClick={e => { if ((e.target as HTMLElement).tagName !== 'INPUT' && !(e.target as HTMLElement).closest('.row-actions')) onFileClick(file); }}
              >
                <td className="px-2 py-2 border-b border-blue-50">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(file.id)}
                    onChange={() => onSelect(file.id)}
                    onClick={e => e.stopPropagation()}
                  />
                </td>
                {columns.map(col => {
                  const content = formatCellContent(file[col.key]);
                  const isExpanded = expandedCells.has(`${file.id}-${col.key}`) || expandedHeaders.has(col.key);
                  
                  return (
                    <td 
                      key={col.key} 
                      className={`px-2 py-2 border-b border-blue-50 text-gray-800 align-top ${col.width} ${isExpanded ? '' : 'truncate'} cursor-pointer hover:bg-blue-50 transition-colors`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCellExpansion(file.id, col.key);
                      }}
                      title={content.full !== content.display ? `Click to ${isExpanded ? 'collapse' : 'expand'}. Full content: ${content.full}` : content.full}
                    >
                      <div className="flex items-center justify-between">
                        <span className={isExpanded ? 'break-words' : 'truncate'}>
                          {isExpanded ? content.full : content.display}
                        </span>
                        {content.full !== content.display && (
                          <svg 
                            width="10" 
                            height="10" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            className={`text-blue-500 ml-1 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                          >
                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="px-2 py-2 border-b border-blue-50 align-top">
                  <div className="flex gap-2 opacity-100 row-actions" onClick={e => e.stopPropagation()}>
                    <button className="text-blue-600 hover:text-blue-800 p-1" title="Edit" onClick={() => onEdit(file)}>
                      <FiEdit2 size={18} />
                    </button>
                    <button className="text-red-600 hover:text-red-800 p-1" title="Delete" onClick={() => onDelete(file)}>
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilesOverview({ files, onUpload, onEdit, onDelete, onFileClick, viewMode, setViewMode }: { files: FileData[]; onUpload: () => void; onEdit: (file: FileData) => void; onDelete: (file: FileData | FileData[]) => void; onFileClick: (file: FileData) => void; viewMode: 'grid' | 'row'; setViewMode: (mode: 'grid' | 'row') => void }) {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState('');
  const [searchField, setSearchField] = React.useState<'fileName' | 'bankName' | 'fileType'>('fileName');
  const handleSelect = (id: string) => {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  };
  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? files.map(f => f.id) : []);
  };
  const selectedFiles = files.filter(f => selectedIds.includes(f.id));

  // Filter files based on search
  const filteredFiles = files.filter(file => {
    const value = (file[searchField] || '').toString().toLowerCase();
    return value.includes(search.toLowerCase());
  });

  return (
    <div className='p-8 relative w-[70vw] overflow-x-auto'>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-blue-800">Files</h1>
        <div className="flex gap-2 items-center ">
          {/* Search bar and field selector */}
          <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-lg px-2 py-1 shadow-sm">
            <input
              type="text"
              className="px-2 py-1 outline-none text-sm bg-transparent"
              placeholder={`Search by ${searchField === 'fileName' ? 'File Name' : searchField === 'bankName' ? 'Bank Name' : 'File Type'}`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ minWidth: 120 }}
            />
            <select
              className="bg-transparent text-blue-700 font-semibold text-sm outline-none"
              value={searchField}
              onChange={e => setSearchField(e.target.value as 'fileName' | 'fileType' | 'bankName')}
            >
              <option value="fileName">File Name</option>
              <option value="bankName">Bank Name</option>
              <option value="fileType">File Type</option>
            </select>
          </div>
          <div className="relative">
            <button className="bg-gray-100 hover:bg-gray-200 text-blue-800 font-semibold px-4 py-2 rounded-lg shadow flex items-center gap-2" onClick={e => { e.stopPropagation(); setShowDropdown(v => !v); }}>
              <span>View</span>
              {viewMode === 'grid' ? <FiGrid /> : <FiList />}
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow z-[100]" style={{ zIndex: 100 }}>
                <button className={`w-full px-4 py-2 text-left hover:bg-blue-50 ${viewMode === 'grid' ? 'font-bold text-blue-700' : ''}`} onClick={() => { setViewMode('grid'); setShowDropdown(false); }}><FiGrid className="inline mr-2" />Grid</button>
                <button className={`w-full px-4 py-2 text-left hover:bg-blue-50 ${viewMode === 'row' ? 'font-bold text-blue-700' : ''}`} onClick={() => { setViewMode('row'); setShowDropdown(false); }}><FiList className="inline mr-2" />Row</button>
              </div>
            )}
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg shadow transition-all" onClick={onUpload}>Upload</button>
        </div>
      </div>
      {viewMode === 'row' && selectedIds.length > 0 && (
        <div className="flex gap-2 mb-2">
          <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded" onClick={() => onDelete(selectedFiles)}>Delete</button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded" onClick={() => onEdit(selectedFiles[0])}>Edit</button>
        </div>
      )}
      {viewMode === 'grid' ? (
        <div className="flex flex-wrap gap-6 p-6">
          {filteredFiles.length === 0 ? (
            <div className="text-gray-400 text-lg mt-16 w-full text-center">No files found. Try a different search or upload a new file!</div>
          ) : (
            filteredFiles.map((file) => (
            <div
              key={file.id}
                className="bg-white rounded-xl shadow-lg p-4 flex flex-col items-start border border-gray-200 w-64 relative group cursor-pointer transition-all hover:shadow-xl hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                tabIndex={0}
                aria-label={`File: ${file.fileName}`}
              onClick={() => onFileClick(file)}
                onKeyDown={e => { if (e.key === 'Enter') onFileClick(file); }}
            >
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50" title="Edit" onClick={e => { e.stopPropagation(); onEdit(file); }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M15.232 5.232a2.5 2.5 0 1 1 3.536 3.536l-9.193 9.193a2 2 0 0 1-.707.464l-3.11 1.037a.5.5 0 0 1-.632-.632l1.037-3.11a2 2 0 0 1 .464-.707l9.193-9.193Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                  <button className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50" title="Delete" onClick={e => { e.stopPropagation(); onDelete(file); }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M6 7h12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
              
              {/* File icon with better styling */}
              <div className="flex items-center gap-2 mb-3 w-full">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                                          {file.fileType === 'PDF' ? (
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M14 2v6h6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M9 13h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                          <path d="M9 17h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                          <path d="M9 9h1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      ) : file.fileType === 'CSV' ? (
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M14 2v6h6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M8 13l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : file.fileType === 'XLSX' ? (
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M14 2v6h6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M8 13l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M8 17l3-3 5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M14 2v6h6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 truncate" title={file.fileName}>{file.fileName}</h3>
                  <p className="text-sm text-gray-500">{file.fileType || 'File'}</p>
                </div>
              </div>
              
                             {/* File details with icons */}
               <div className="space-y-1.5 w-full">
                <div className="flex items-center gap-2 text-sm">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" className="text-gray-400">
                    <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2H8V5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-gray-600">{file.bankName || 'Unknown Bank'}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" className="text-gray-400">
                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-gray-600">{file.fileType || 'Statement'}</span>
                </div>
                
                {file.size && (
                  <div className="flex items-center gap-2 text-sm">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" className="text-gray-400">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-gray-600">{file.size}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-sm">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" className="text-gray-400">
                    <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-gray-600">
                    Created at: {file.createdAt ? new Date(file.createdAt).toLocaleString() : file.uploaded ? new Date(file.uploaded).toLocaleString() : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
            ))
          )}
        </div>
      ) : (
        <FilesTable files={files} onFileClick={onFileClick} selectedIds={selectedIds} onSelect={handleSelect} onSelectAll={handleSelectAll} onEdit={onEdit} onDelete={onDelete} />
      )}
    </div>
  );
}

function EditFileModal({ isOpen, file, onClose, onSave }: { isOpen: boolean; file: FileData | null; onClose: () => void; onSave: (newName: string, newBankId: string, newFileType: string) => void }) {
  const [newName, setNewName] = useState(file?.fileName || '');
  const [newFileType, setNewFileType] = useState(file?.fileType || '');
  const [newBankId, setNewBankId] = useState(file?.bankId || '');
  const [banks, setBanks] = useState<{ id: string; bankName: string }[]>([]);
  useEffect(() => {
    setNewName(file?.fileName || '');
    setNewFileType(file?.fileType || '');
    setNewBankId(file?.bankId || '');
    if (isOpen) {
      fetch('/api/bank')
        .then(res => res.json())
        .then(data => setBanks(Array.isArray(data) ? data : []));
    }
  }, [file, isOpen]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
        <button className="absolute top-3 right-3 text-gray-400 hover:text-red-500" onClick={onClose}>✖️</button>
        <h2 className="text-xl font-bold mb-4 text-blue-800">Edit File</h2>
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">File Name</label>
          <input type="text" className="w-full border rounded px-3 py-2" value={newName} onChange={e => setNewName(e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">File Type</label>
          <select className="w-full border rounded px-3 py-2" value={newFileType} onChange={e => setNewFileType(e.target.value)}>
            <option value="">Select type</option>
            <option value="Statement">Statement</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">Bank Name</label>
          <select className="w-full border rounded px-3 py-2" value={newBankId} onChange={e => setNewBankId(e.target.value)}>
            <option value="">Select bank</option>
            {banks.map(b => (
              <option key={b.id} value={b.id}>{b.bankName}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => onSave(newName, newBankId, newFileType)}>Save</button>
        </div>
      </div>
    </div>
  );
}

function DeleteFileModal({ isOpen, file, onClose, onDelete, loading, deleteProgress, deleteTotal, isBatchDeleting }: { 
  isOpen: boolean; 
  file: FileData | null; 
  onClose: () => void; 
  onDelete: () => void; 
  loading: boolean;
  deleteProgress?: number;
  deleteTotal?: number;
  isBatchDeleting?: boolean;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
        <button className="absolute top-3 right-3 text-gray-400 hover:text-red-500" onClick={onClose}>✖️</button>
        <h2 className="text-xl font-bold mb-4 text-red-700">Delete File</h2>
        <div className="mb-4">Are you sure you want to delete <span className="font-semibold">{file?.fileName}</span>?</div>
        
        {/* Progress bar for deletion */}
        {isBatchDeleting && deleteTotal !== undefined && deleteProgress !== undefined && (
          <div className="mb-4">
            <div className="mb-1 text-red-700 font-semibold">
              {deleteTotal > 25 
                ? `Deleting ${deleteProgress} of ${deleteTotal} rows (Batch ${Math.ceil(deleteProgress/25)} of ${Math.ceil(deleteTotal/25)})...`
                : `Deleting ${deleteProgress} of ${deleteTotal} rows...`
              }
            </div>
            <div className="w-full bg-red-100 rounded-full h-3">
              <div
                className="bg-red-600 h-3 rounded-full transition-all"
                style={{ width: `${deleteTotal > 0 ? (deleteProgress || 0) / deleteTotal * 100 : 0}%` }}
              />
            </div>
            <div className="text-xs text-red-600 mt-1">
              {deleteTotal > 25 
                ? `Batch ${Math.ceil(deleteProgress/25)} of ${Math.ceil(deleteTotal/25)} - ${Math.round((deleteProgress/deleteTotal)*100)}% complete`
                : `${Math.round((deleteProgress/deleteTotal)*100)}% complete`
              }
            </div>
          </div>
        )}
        
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700" onClick={onDelete} disabled={loading}>
            {loading ? (isBatchDeleting ? 'Deleting...' : 'Deleting...') : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SlicePreviewComponent({ sliceData, file }: { sliceData: string[][]; file: FileData; selectedFields: string[] }) {
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
  // Delimit state and logic
  const [delimitDialogOpen, setDelimitDialogOpen] = useState(false);
  const [delimitColIdx, setDelimitColIdx] = useState<number | null>(null);
  const [delimiter, setDelimiter] = useState<string>(' ');
  const [newColNames, setNewColNames] = useState<string[]>(['Date', 'Time']);
  const [delimitPreview, setDelimitPreview] = useState<string[][] | null>(null);
  const [delimitError, setDelimitError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<string[][]>(sliceData);
  const [allDuplicatesSelected, setAllDuplicatesSelected] = useState(false);

  // Update previewData when sliceData changes
  useEffect(() => {
    setPreviewData(sliceData);
  }, [sliceData]);

  // All columns selected by default for duplicate checking
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  // Update selectedFields when previewData changes, but preserve user selections when possible
  useEffect(() => {
    if (previewData.length > 0) {
      // Only reset selectedFields if they don't match the current columns
      const currentHeaders = previewData[0];
      const currentFieldNames = currentHeaders.map((header, idx) => `${header}-${idx}`);
      
      // Check if current selectedFields match the new headers
      const selectedFieldNames = selectedFields.map(f => f.split('-')[0]);
      const currentHeaderNames = currentHeaders.map(h => h);
      
      const fieldsMatch = selectedFieldNames.length === currentHeaderNames.length &&
        selectedFieldNames.every((name, idx) => name === currentHeaderNames[idx]);
      
      if (!fieldsMatch) {
        // Reset selectedFields to match the current columns exactly
        setSelectedFields(currentFieldNames);
      }
      setColWidths(currentHeaders.map(() => 160));
    }
  }, [previewData, selectedFields]);

  // Update allDuplicatesSelected whenever selectedRows or duplicateRows changes
  useEffect(() => {
    const allDupSelected = Array.from(duplicateRows).every(rowIndex => selectedRows.has(rowIndex));
    setAllDuplicatesSelected(allDupSelected);
  }, [selectedRows, duplicateRows]);

  if (!sliceData || !sliceData.length) return <div>No data to display.</div>;

  // Duplicate check handler
  const handleCheckDuplicates = async () => {
    console.log('Check for Duplicates button clicked');
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
      
      console.log('Found existing transactions:', existing.length);
      console.log('Sample existing transaction:', existing[0]);
      
      const uniqueFields = selectedFields.map(f => f.split('-')[0]);
      console.log('Selected fields (raw):', selectedFields);
      console.log('Checking against fields:', uniqueFields);
      console.log('Available fields in existing data:', existing.length > 0 ? Object.keys(existing[0]) : []);
      console.log('Preview data headers:', previewData[0]);
      
      // Check for duplicates within the current slice data first
      const currentDataKeys = new Set<string>();
      const currentDataDups = new Set<number>();
      const currentDataDupInfo: Array<{ row: number; key: string; fields: string; type: string }> = [];
      
      previewData.slice(1).forEach((row, i) => {
        const rowObj: Record<string, string> = {};
        previewData[0].forEach((header, j) => { rowObj[header] = row[j]; });
        const key = uniqueFields.map(f => {
          let value = (rowObj[f] || '').toString().trim().toLowerCase();
          // Normalize amount fields by removing commas
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
      // Create a mapping of field names to handle potential mismatches
      const fieldMapping: { [key: string]: string } = {};
      if (existing.length > 0) {
        const existingFields = Object.keys(existing[0]);
        console.log('Available database fields:', existingFields);
        console.log('Fields to check:', uniqueFields);
        
        uniqueFields.forEach(field => {
          // Try exact match first
          if (existingFields.includes(field)) {
            fieldMapping[field] = field;
            console.log(`Field "${field}" mapped to "${field}" (exact match)`);
          } else {
            // Try case-insensitive match
            const lowerField = field.toLowerCase();
            const matchedField = existingFields.find(ef => ef.toLowerCase() === lowerField);
            if (matchedField) {
              fieldMapping[field] = matchedField;
              console.log(`Field "${field}" mapped to "${matchedField}" (case-insensitive match)`);
            } else {
              // Try partial match (for cases like "Chq / Ref number" vs "Chq / Ref nu...")
              const partialMatch = existingFields.find(ef => 
                ef.toLowerCase().includes(lowerField) || lowerField.includes(ef.toLowerCase())
              );
              if (partialMatch) {
                fieldMapping[field] = partialMatch;
                console.log(`Field "${field}" mapped to "${partialMatch}" (partial match)`);
              } else {
                fieldMapping[field] = field; // Keep original if no match found
                console.log(`Field "${field}" not found in database, keeping original`);
              }
            }
          }
        });
      }
      
      console.log('Field mapping:', fieldMapping);
      
      // Debug: Check what values are being extracted for each field
      if (existing.length > 0) {
        console.log('Sample existing transaction field values:');
        uniqueFields.forEach(field => {
          const dbField = fieldMapping[field];
          const value = existing[0][dbField];
          console.log(`  ${field} (mapped to ${dbField}): "${value}"`);
        });
      }
      
      const existingSet = new Set(
        existing.map((tx: Record<string, unknown>) => uniqueFields.map(f => {
          const dbField = fieldMapping[f];
          let value = (tx[dbField] || '').toString().trim().toLowerCase();
          // Normalize amount fields by removing commas
          if (f.toLowerCase().includes('amount') || f.toLowerCase().includes('balance')) {
            value = value.replace(/,/g, '');
          }
          return value;
        }).join('|'))
      );
      
      console.log('Existing keys sample:', Array.from(existingSet).slice(0, 5));
      
      const dbDupRows = new Set<number>();
      const dbDupInfo: Array<{ row: number; key: string; fields: string; type: string }> = [];
      
      previewData.slice(1).forEach((row, i) => {
        const rowObj: Record<string, string> = {};
        previewData[0].forEach((header, j) => { rowObj[header] = row[j]; });
        const key = uniqueFields.map(f => {
          let value = (rowObj[f] || '').toString().trim().toLowerCase();
          // Normalize amount fields by removing commas
          if (f.toLowerCase().includes('amount') || f.toLowerCase().includes('balance')) {
            value = value.replace(/,/g, '');
          }
          return value;
        }).join('|');
        
        console.log(`Row ${i + 1} key:`, key);
        console.log(`Row ${i + 1} data:`, rowObj);
        
        // Debug: Show what values are being extracted for each field
        console.log(`Row ${i + 1} field values:`);
        uniqueFields.forEach(field => {
          const value = rowObj[field];
          console.log(`  ${field}: "${value}"`);
        });
        
        // Also check if this key exists in any existing transaction for debugging
        const matchingExisting = existing.filter(tx => {
          const existingKey = uniqueFields.map(f => {
            const dbField = fieldMapping[f];
            let value = (tx[dbField] || '').toString().trim().toLowerCase();
            // Normalize amount fields by removing commas
            if (f.toLowerCase().includes('amount') || f.toLowerCase().includes('balance')) {
              value = value.replace(/,/g, '');
            }
            return value;
          }).join('|');
          return existingKey === key;
        });
        
        if (matchingExisting.length > 0) {
          console.log(`Row ${i + 1} matches ${matchingExisting.length} existing transactions:`, matchingExisting);
        }
        
        if (existingSet.has(key)) {
          dbDupRows.add(i + 1);
          dbDupInfo.push({ 
            row: i + 2, 
            key,
            fields: uniqueFields.map(f => `${f}: ${rowObj[f]}`).join(', '),
            type: 'database'
          });
          console.log(`Row ${i + 1} is a database duplicate`);
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
      
      console.log('Duplicate check complete:', {
        totalRows: previewData.length - 1,
        internalDuplicates: currentDataDups.size,
        databaseDuplicates: dbDupRows.size,
        totalDuplicates: allDupRows.size,
        duplicateInfo: allDupInfo,
        fieldsChecked: uniqueFields,
        fieldsMapped: Object.keys(fieldMapping)
      });
      
      // If we found very few duplicates, use the alternative approach as primary
      if (allDupRows.size < 5 && existing.length > 0) {
        console.log('Using alternative duplicate check with Date + Description fields...');
        
        // Use Date and Description as the primary duplicate check fields
        const primaryFields = ['Date', 'Description'];
        const primaryKeys = new Set(
          existing.map((tx: Record<string, unknown>) => primaryFields.map(f => {
            const dbField = fieldMapping[f] || f;
            let value = (tx[dbField] || '').toString().trim().toLowerCase();
            if (f.toLowerCase().includes('amount') || f.toLowerCase().includes('balance')) {
              value = value.replace(/,/g, '');
            }
            return value;
          }).join('|'))
        );
        
        const primaryDups = new Set<number>();
        const primaryDupInfo: Array<{ row: number; key: string; fields: string; type: string }> = [];
        
        previewData.slice(1).forEach((row, i) => {
          const rowObj: Record<string, string> = {};
          previewData[0].forEach((header, j) => { rowObj[header] = row[j]; });
          const key = primaryFields.map(f => {
            let value = (rowObj[f] || '').toString().trim().toLowerCase();
            if (f.toLowerCase().includes('amount') || f.toLowerCase().includes('balance')) {
              value = value.replace(/,/g, '');
            }
            return value;
          }).join('|');
          
          if (primaryKeys.has(key)) {
            primaryDups.add(i + 1);
            primaryDupInfo.push({ 
              row: i + 2, 
              key,
              fields: primaryFields.map(f => `${f}: ${rowObj[f]}`).join(', '),
              type: 'database'
            });
            console.log(`Row ${i + 1} is a duplicate with primary fields (Date + Description)`);
          }
        });
        
        // Use the primary results instead of the original results
        const allDupRows = new Set([...currentDataDups, ...primaryDups]);
        const allDupInfo = [...currentDataDupInfo, ...primaryDupInfo];
        
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
        
        console.log(`Primary check found ${primaryDups.size} duplicates using Date + Description only`);
      }
      
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



  // Delimit handlers
  const handleDelimitPreview = () => {
    setDelimitError(null);
    if (delimitColIdx === null || !delimiter) {
      setDelimitError('Select a column and delimiter.');
      return;
    }
    const header = [...previewData[0]];
    const rows = previewData.slice(1);
    const newRows = rows.map(row => {
      const cell = row[delimitColIdx] || '';
      let parts: string[];
      if (delimiter === '\\s+' || (delimiter.startsWith('/') && delimiter.endsWith('/'))) {
        let regex: RegExp;
        if (delimiter === '\\s+') {
          regex = /\s+/;
        } else {
          regex = new RegExp(delimiter.slice(1, -1));
        }
        parts = cell.split(regex);
      } else {
        parts = cell.split(delimiter);
      }
      const newParts = newColNames.map((_, i) => parts[i] || '');
      const newRow = [...row];
      newRow.splice(delimitColIdx, 1, ...newParts);
      return newRow;
    });
    const newHeader = [...header];
    newHeader.splice(delimitColIdx, 1, ...newColNames);
    setDelimitPreview([newHeader, ...newRows]);
  };

  const handleDelimitSave = () => {
    if (!delimitPreview) return;
    setPreviewData(delimitPreview);
    setDelimitDialogOpen(false);
    setDelimitPreview(null);
    setDelimitColIdx(null);
    setNewColNames(['Date', 'Time']);
    setDelimiter(' ');
  };

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    setDuplicateChecked(false); // Reset before saving
    setIsBatchSaving(true);
    try {
      // Only include selected rows
      const selectedData = [previewData[0], ...previewData.slice(1).filter((_, i) => selectedRows.has(i + 1))];
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
          startRow: 1, // Not used in backend for slice
          endRow: batchData.length - 1,
          bankId: file.bankId || '',
          accountId: file.accountId || '',
          fileName: file.fileName || '',
          userId: localStorage.getItem('userId') || '',
          bankName: file.bankName || '',
          accountName: file.accountName || '',
          accountNumber: file.accountNumber || '',
          duplicateCheckFields: selectedFields.map(f => f.split('-')[0]),
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
    <div className="bg-white rounded-xl border border-blue-100 p-4 mt-4">
      {/* Duplicate check field selection UI */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-3">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Select fields to check for duplicate transactions
        </h3>
        
        <div className="grid grid-cols-10 gap-2 mb-4">
          {previewData[0]?.filter(header => header && header.trim() !== '').map((header, idx) => (
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
              <span className="text-xs font-medium text-gray-700 truncate" title={header}>
                {header}
              </span>
            </label>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setDelimitDialogOpen(true)}
            disabled={previewData.length === 0}
            title="Split a column into multiple columns (e.g., date/time)"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Delimit
          </button>
          
          <button
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleCheckDuplicates}
            disabled={checkingDuplicates || previewData.length === 0}
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
      <div className="overflow-auto" style={{ maxHeight: 600 }}>
        <table ref={tableRef} className="border-collapse min-w-full text-xs select-none" style={{ tableLayout: 'fixed' }}>
          <tbody>
            {previewData.map((row, i) => {
              const isHeader = i === 0;
              return (
                <tr
                  key={i}
                  ref={el => { rowRefs.current[i] = el; }}
                  className={
                    isHeader
                      ? 'bg-blue-50 border-b-2 border-blue-300'
                      : duplicateRows.has(i)
                      ? 'bg-red-200 border-2 border-red-600'
                      : selectedRows.has(i)
                      ? 'bg-blue-50'
                      : ''
                  }
                  title={
                    duplicateRows.has(i) 
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
                        checked={selectedRows.size === previewData.slice(1).length && selectedRows.size > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRows(new Set(previewData.slice(1).map((_, i) => i + 1)));
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
      
      {/* Delimit Dialog */}
      {delimitDialogOpen && (
        <Modal isOpen={delimitDialogOpen} onClose={() => setDelimitDialogOpen(false)} title="Delimit Column" maxWidthClass="max-w-sm">
          <div className="mb-2">
            <label className="block mb-1 font-medium text-sm">Select column to delimit:</label>
            <select
              className="w-full border rounded px-2 py-1 mb-2"
              value={delimitColIdx ?? ''}
              onChange={e => setDelimitColIdx(Number(e.target.value))}
            >
              <option value="" disabled>Select column</option>
              {previewData[0].map((col, idx) => (
                <option key={col + idx} value={idx}>{col}</option>
              ))}
            </select>
            <label className="block mb-1 font-medium text-sm">Delimiter:</label>
            <input
              className="w-full border rounded px-2 py-1 mb-2"
              value={delimiter}
              onChange={e => setDelimiter(e.target.value)}
              placeholder="e.g. space, /, -"
            />
            <label className="block mb-1 font-medium text-sm">New column names (comma separated):</label>
            <input
              className="w-full border rounded px-2 py-1 mb-2"
              value={newColNames.join(',')}
              onChange={e => setNewColNames(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="e.g. Date,Time"
            />
            <button
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
              onClick={handleDelimitPreview}
              type="button"
            >Preview</button>
            {delimitError && <div className="text-red-600 mt-1 text-xs">{delimitError}</div>}
          </div>
          {delimitPreview && (
            <div className="overflow-x-auto max-h-40 border rounded mb-2">
              <table className="min-w-full border text-xs">
                <tbody>
                  {delimitPreview.slice(0, 6).map((row, i) => (
                    <tr key={i}>{row.map((cell, j) => <td key={j} className="border px-2 py-1">{cell}</td>)}</tr>
                  ))}
                </tbody>
              </table>
              <div className="text-xs text-gray-500">Previewing first 5 rows.</div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
              onClick={handleDelimitSave}
              disabled={!delimitPreview}
            >Save</button>
            <button
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs"
              onClick={() => setDelimitDialogOpen(false)}
            >Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const FilesPage: React.FC = () => {

  const [openTabs, setOpenTabs] = useState<{ id: string; name: string }[]>([{ id: 'all', name: 'All Files' }]);
  const [openSliceTabs, setOpenSliceTabs] = useState<{ id: string; name: string; sliceData: string[][]; file: FileData; selectedFields: string[] }[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('all');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [banks, setBanks] = useState<{ id: string; fileName: string; versions: unknown[] }[]>([]);
  const [files, setFiles] = useState<FileData[]>([]);

  const [filesLoading, setFilesLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editFile, setEditFile] = useState<FileData | null>(null);
  const [deleteFile, setDeleteFile] = useState<FileData | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteTotal, setDeleteTotal] = useState(0);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'row'>('grid');


  useEffect(() => {
    const fetchAllUserFiles = async () => {
      setFilesLoading(true);
      const userId = localStorage.getItem('userId');
      // 1. Fetch all banks
      const banksRes = await fetch('/api/bank');
      const banksData = await banksRes.json();
      setBanks(Array.isArray(banksData) ? banksData.map((b: Record<string, unknown>) => ({ id: b.id as string, fileName: b.bankName as string, versions: [] })) : []);
      let allAccounts: Record<string, unknown>[] = [];
      // 2. For each bank, fetch all accounts for the user
      for (const bank of banksData) {
        const accountsRes = await fetch(`/api/account?bankId=${(bank as Record<string, unknown>).id}&userId=${userId}`);
        const accounts = await accountsRes.json();
        if (Array.isArray(accounts)) {
          allAccounts = allAccounts.concat(accounts);
        }
      }
      // 3. For each account, fetch all statements for the user and merge account info
      let allStatements: Record<string, unknown>[] = [];
      for (const account of allAccounts) {
        const statementsRes = await fetch(`/api/statements?accountId=${account.id as string}&userId=${userId}`);
        const statements = await statementsRes.json();
        if (Array.isArray(statements)) {
          // Merge account information with each statement
          const statementsWithAccountInfo = statements.map((statement: Record<string, unknown>) => ({
            ...statement,
            accountName: account.accountHolderName || statement.accountName || '',
            accountNumber: account.accountNumber || statement.accountNumber || '',
          }));
          allStatements = allStatements.concat(statementsWithAccountInfo);
        }
      }
      setFiles(allStatements as FileData[]);
      setFilesLoading(false);
    };
    fetchAllUserFiles();
  }, []);

  // Add a function to refresh files
  const refreshFiles = async () => {
    setFilesLoading(true);
    const userId = localStorage.getItem('userId');
    const banksRes = await fetch('/api/bank');
    const banksData = await banksRes.json();
    let allAccounts: Record<string, unknown>[] = [];
    for (const bank of banksData) {
      const accountsRes = await fetch(`/api/account?bankId=${(bank as Record<string, unknown>).id}&userId=${userId}`);
      const accounts = await accountsRes.json();
      if (Array.isArray(accounts)) {
        allAccounts = allAccounts.concat(accounts);
      }
    }
    let allStatements: Record<string, unknown>[] = [];
    for (const account of allAccounts) {
      const statementsRes = await fetch(`/api/statements?accountId=${account.id as string}&userId=${userId}`);
      const statements = await statementsRes.json();
      if (Array.isArray(statements)) {
        // Merge account information with each statement
        const statementsWithAccountInfo = statements.map((statement: Record<string, unknown>) => ({
          ...statement,
          accountName: account.accountHolderName || statement.accountName || '',
          accountNumber: account.accountNumber || statement.accountNumber || '',
        }));
        allStatements = allStatements.concat(statementsWithAccountInfo);
      }
    }
    setFiles(allStatements as FileData[]);
    setFilesLoading(false);
  };



  // File click (main file, not version)
  const handleFileClick = (file: { id: string; fileName: string }) => {
    setSelectedFileId(file.id);
    setActiveTabId(file.id);
    setOpenTabs((prevTabs) => {
      if (prevTabs.find((tab) => tab.id === file.id)) return prevTabs;
      return [...prevTabs, { id: file.id, name: file.fileName }];
    });
  };

  // Version click (not used here, but keep for compatibility)
  const handleVersionClick = (file: { id: string; fileName: string }, version: { id: string; versionName: string }) => {
    setSelectedFileId(version.id);
    setActiveTabId(version.id);
    setOpenTabs((prevTabs) => {
      if (prevTabs.find((tab) => tab.id === version.id)) return prevTabs;
      return [...prevTabs, { id: version.id, name: `${file.fileName} - ${version.versionName}` }];
    });
  };

  const handleExpand = (fileId: string) => {
    setExpandedFileId(expandedFileId === fileId ? null : fileId);
  };

  // Update handleTabClick to NOT open any modal
  const handleTabClick = (tabId: string) => {
    setActiveTabId(tabId);
    setSelectedFileId(tabId === 'all' ? null : tabId);
    // No modal logic here
  };

  // Helper to open a slice tab
  const handleOpenSliceTab = (sliceData: string[][], file: FileData, selectedFields: string[]) => {
    const newTabId = 'slice-' + Date.now();
    const newTab = {
      id: newTabId,
      name: `Slice Preview ${openSliceTabs.length + 1}`,
      sliceData,
      file,
      selectedFields,
    };
    setOpenSliceTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);
  };

  // Update handleCloseTab to support slice tabs
  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabs((prevTabs) => prevTabs.filter((tab) => tab.id !== tabId));
    setOpenSliceTabs((prevTabs) => prevTabs.filter((tab) => tab.id !== tabId));
    if (activeTabId === tabId) {
      setTimeout(() => {
        setOpenTabs((tabs) => {
          const allTabs = [...tabs, ...openSliceTabs.filter(tab => tab.id !== tabId)];
          if (allTabs.length === 0) {
            setActiveTabId('all');
            setSelectedFileId(null);
            return [{ id: 'all', name: 'All Files' }];
          }
          const lastTab = allTabs[allTabs.length - 1];
          setActiveTabId(lastTab.id);
          setSelectedFileId(lastTab.id === 'all' ? null : lastTab.id);
          return tabs;
        });
      }, 0);
    }
  };

  const handleEditFile = (file: FileData) => {
    setEditFile(file);
    setEditModalOpen(true);
  };
  const handleDeleteFile = (file: FileData | FileData[]) => {
    if (Array.isArray(file)) {
      // Handle multiple files deletion
      setDeleteFile(file[0]); // For now, just use the first file for the modal
      setDeleteModalOpen(true);
    } else {
      setDeleteFile(file);
      setDeleteModalOpen(true);
    }
  };
  const handleEditSave = async (newName: string, newBankId: string, newFileType: string) => {
    if (!editFile) return;
    setEditModalOpen(false);
    setEditFile(null);
    const userId = localStorage.getItem('userId') || '';
    try {
      await fetch('/api/statement/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statementId: editFile.id,
          userId,
          fileName: newName,
          bankName: newBankId,
          fileType: newFileType,
        }),
      });
      refreshFiles();
    } catch {
      // Optionally show error toast
    }
  };
  const handleDeleteConfirm = async () => {
    if (!deleteFile) return;
    setDeleteLoading(true);
    setDeleteProgress(0);
    setDeleteTotal(0);
    setIsBatchDeleting(false);
    
    const userId = localStorage.getItem('userId') || '';
    
    try {
      // First, count how many transaction rows need to be deleted
      let totalRows = 0;
      
      // Try multiple ways to find transactions and count their rows
      try {
        // Method 1: Search by statementId
        const countRes = await fetch(`/api/transactions?accountId=${deleteFile.accountId}&userId=${userId}&bankName=${encodeURIComponent(deleteFile.bankName || '')}`);
        if (countRes.ok) {
          const txs = await countRes.json();
          console.log('Found transactions:', txs);
          if (Array.isArray(txs)) {
            const relatedTransactions = txs.filter((tx: Record<string, unknown>) => (tx.statementId as string) === deleteFile.id);
            console.log('Related transactions:', relatedTransactions);
            
            // Count the actual rows in each transaction (if they have row data)
            totalRows = relatedTransactions.reduce((total: number, tx: Record<string, unknown>) => {
              console.log('Processing transaction:', tx);
              let rowCount = 0;
              
              // If transaction has rowCount field, use it
              if (tx.rowCount) {
                rowCount = tx.rowCount as number;
                console.log(`Using rowCount: ${rowCount}`);
              }
              // If transaction has rows array, count the rows
              else if (tx.rows && Array.isArray(tx.rows)) {
                rowCount = tx.rows.length;
                console.log(`Using rows array length: ${rowCount}`);
              }
              // If transaction has data array, count the data rows
              else if (tx.data && Array.isArray(tx.data)) {
                rowCount = tx.data.length;
                console.log(`Using data array length: ${rowCount}`);
              }
              // If transaction has csvData, try to parse it
              else if (tx.csvData) {
                try {
                  const lines = (tx.csvData as string).split('\n').filter((line: string) => line.trim());
                  rowCount = lines.length - 1; // Subtract header
                  console.log(`Using csvData lines: ${rowCount}`);
                } catch {
                  console.log('Failed to parse csvData');
                }
              }
              // If transaction has startRow and endRow, calculate difference
              else if (tx.startRow && tx.endRow) {
                rowCount = (tx.endRow as number) - (tx.startRow as number) + 1;
                console.log(`Using startRow/endRow: ${rowCount}`);
              }
              // Default to 1 row per transaction
              else {
                rowCount = 1;
                console.log(`Using default: 1 row`);
              }
              
              return total + rowCount;
            }, 0);
          }
        }
      } catch (error) {
        console.log('Method 1 failed, trying alternative...', error);
      }
      
      // If no rows found, try searching by fileName or s3FileUrl
      if (totalRows === 0) {
        try {
          const countRes2 = await fetch(`/api/transactions?accountId=${deleteFile.accountId}&userId=${userId}&bankName=${encodeURIComponent(deleteFile.bankName || '')}&fileName=${encodeURIComponent(deleteFile.fileName || '')}`);
          if (countRes2.ok) {
            const txs = await countRes2.json();
            if (Array.isArray(txs)) {
              const relatedTransactions = txs.filter((tx: Record<string, unknown>) => 
                (tx.statementId as string) === deleteFile.id || 
                (tx.fileName as string) === deleteFile.fileName ||
                (tx.s3FileUrl as string) === deleteFile.s3FileUrl
              );
              totalRows = relatedTransactions.reduce((total: number, tx: Record<string, unknown>) => {
                if (tx.rowCount) return total + (tx.rowCount as number);
                if (tx.rows && Array.isArray(tx.rows)) return total + tx.rows.length;
                if (tx.data && Array.isArray(tx.data)) return total + tx.data.length;
                return total + 1;
              }, 0);
            }
          }
        } catch {
          console.log('Method 2 failed');
        }
      }
      
      // If still no rows found, try to get row count from the file itself
      if (totalRows === 0) {
        try {
          // Try to get row count from file metadata
          if (deleteFile.rowCount) {
            totalRows = deleteFile.rowCount;
            console.log(`Using file rowCount: ${totalRows}`);
          } else if (deleteFile.totalRows) {
            totalRows = deleteFile.totalRows;
            console.log(`Using file totalRows: ${totalRows}`);
          } else if (deleteFile.csvData) {
            // Try to parse CSV data from file
            try {
              const lines = deleteFile.csvData.split('\n').filter((line: string) => line.trim());
              totalRows = lines.length - 1; // Subtract header
              console.log(`Using file csvData lines: ${totalRows}`);
            } catch {
              console.log('Failed to parse file csvData');
            }
          } else {
            // Try to fetch the actual file data to count rows
            try {
              console.log('Attempting to fetch file data to count rows...');
              const fileDataRes = await fetch(`/api/statement/data?statementId=${deleteFile.id}&userId=${userId}`);
              if (fileDataRes.ok) {
                const fileData = await fileDataRes.json();
                console.log('File data received:', fileData);
                
                if (fileData.totalRows) {
                  totalRows = fileData.totalRows;
                  console.log(`Using API totalRows: ${totalRows} rows`);
                } else if (fileData.csvData) {
                  const lines = fileData.csvData.split('\n').filter((line: string) => line.trim());
                  totalRows = lines.length - 1; // Subtract header
                  console.log(`Using fetched file data: ${totalRows} rows`);
                } else if (fileData.data && Array.isArray(fileData.data)) {
                  totalRows = fileData.data.length;
                  console.log(`Using fetched file data array: ${totalRows} rows`);
                } else if (fileData.transactions && Array.isArray(fileData.transactions)) {
                  // Count rows from transactions
                  totalRows = fileData.transactions.reduce((total: number, tx: Record<string, unknown>) => {
                    if (tx.rowCount) return total + (tx.rowCount as number);
                    if (tx.rows && Array.isArray(tx.rows)) return total + tx.rows.length;
                    if (tx.data && Array.isArray(tx.data)) return total + tx.data.length;
                    if (tx.csvData) {
                      const lines = (tx.csvData as string).split('\n').filter((line: string) => line.trim());
                      return total + (lines.length - 1);
                    }
                    if (tx.startRow && tx.endRow) return total + ((tx.endRow as number) - (tx.startRow as number) + 1);
                    return total + 1;
                  }, 0);
                  console.log(`Using transactions data: ${totalRows} rows`);
                }
              } else {
                console.log('File data API returned error:', fileDataRes.status);
              }
            } catch (fetchError) {
              console.log('Failed to fetch file data:', fetchError);
            }
            
            // If still no rows found, try to estimate based on file size or other properties
            if (totalRows === 0) {
              console.log('No row count found, checking file properties:', deleteFile);
              // Set a reasonable default based on file type
              totalRows = 10; // Default assumption for a typical file
              console.log(`Using default estimate: ${totalRows} rows`);
            }
          }
        } catch {
          console.log('Error getting file row count');
          totalRows = 10; // Default fallback
        }
      }
      
      console.log(`Found ${totalRows} rows to delete for file ${deleteFile.fileName}`);
      
      // Always show progress bar, even for small files
      setIsBatchDeleting(true);
      setDeleteTotal(totalRows);
      
              // For now, let's use single deletion for all files to avoid batch issues
        console.log(`Deleting file with ${totalRows} rows`);
        
        // Show initial progress
        setDeleteProgress(0);
        
        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
          setDeleteProgress(prev => {
            const newProgress = Math.min(prev + Math.ceil(totalRows / 10), totalRows);
            return newProgress;
          });
        }, 200);
        
      try {
        const res = await fetch('/api/statement/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            statementId: deleteFile.id,
            s3FileUrl: deleteFile.s3FileUrl,
            userId,
            bankName: deleteFile.bankName || '',
          }),
        });
          
          if (!res.ok) {
          const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to delete file');
          }
          
          // Clear the progress interval and set to 100%
          clearInterval(progressInterval);
          setDeleteProgress(totalRows);
          console.log(`Progress: ${totalRows}/${totalRows} (100%)`);
          
      } catch {
          clearInterval(progressInterval);
          throw new Error('Failed to delete file');
        }
      
      // Verify deletion was successful
      const verifyRes = await fetch(`/api/transactions?accountId=${deleteFile.accountId}&userId=${userId}&bankName=${encodeURIComponent(deleteFile.bankName || '')}`);
      let remainingTransactions = 0;
      if (verifyRes.ok) {
        const txs = await verifyRes.json();
        if (Array.isArray(txs)) {
          remainingTransactions = txs.filter((tx: Record<string, unknown>) => (tx.statementId as string) === deleteFile.id).length;
        }
      }
      
      if (remainingTransactions > 0) {
        throw new Error(`Failed to delete all transactions. ${remainingTransactions} transactions remaining.`);
      }
      
    } catch (error) {
      console.error('Error deleting file:', error);
      // You could show an error toast here
    } finally {
    setDeleteLoading(false);
      setIsBatchDeleting(false);
      setDeleteProgress(0);
      setDeleteTotal(0);
    setDeleteModalOpen(false);
    setDeleteFile(null);
    refreshFiles();
    }
  };

  // Determine what to show in the main area
  let mainContent = null;
  if (filesLoading) {
    mainContent = <div className="p-8 text-blue-700 font-semibold">Loading files...</div>;
  } else if (activeTabId === 'all') {
    mainContent = <FilesOverview files={files} onUpload={() => setShowUploadModal(true)} onEdit={handleEditFile} onDelete={handleDeleteFile} onFileClick={handleFileClick} viewMode={viewMode} setViewMode={setViewMode} />;
  } else if (activeTabId.startsWith('slice-')) {
    const sliceTab = openSliceTabs.find(tab => tab.id === activeTabId);
    if (sliceTab) {
      mainContent = (
        <div className="p-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-blue-800">{sliceTab.name}</h2>
            {/* Account Information Header */}
            <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-blue-900">Bank:</span>
                  <span className="text-blue-700">{sliceTab.file.bankName || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-blue-900">Account Name:</span>
                  <span className="text-blue-700">{sliceTab.file.accountName || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-blue-900">Account Number:</span>
                  <span className="text-blue-700">{sliceTab.file.accountNumber || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
          {/* Render the sliced transactions preview table here, reusing the modal's content as a standalone component */}
          <SlicePreviewComponent sliceData={sliceTab.sliceData} file={sliceTab.file} selectedFields={sliceTab.selectedFields} />
        </div>
      );
    }
  } else {
    // Check if activeTabId is a bank id
    const bank = banks.find(b => b.id === activeTabId);
    if (bank) {
      // Show all files for this bank
      const bankFiles = files.filter(f => f.fileType === 'Statement' && f.bankId === bank.id);
      mainContent = (
        <div className="p-8">
          <h2 className="text-xl font-bold mb-4 text-blue-800">{bank.fileName} Files</h2>
          <div className="flex flex-wrap gap-8">
            {bankFiles.length === 0 && <div className="text-gray-500">No files for this bank.</div>}
            {bankFiles.map(file => (
              <div
                key={file.id}
                className="bg-white rounded-xl shadow-md p-3 flex flex-col items-center justify-center border border-blue-100 mb-3 w-48 relative group cursor-pointer"
                onClick={() => handleFileClick(file)}
              >
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button className="text-blue-600 hover:text-blue-800 p-1" title="Edit" onClick={() => handleEditFile(file)}>
                    <FiEdit2 size={18} />
                  </button>
                  <button className="text-red-600 hover:text-red-800 p-1" title="Delete" onClick={() => handleDeleteFile(file)}>
                    <FiTrash2 size={18} />
                  </button>
                </div>
                <span className="inline-block bg-blue-50 p-3 rounded-full mb-3">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#EEF2FF"/><path d="M7 7.75A.75.75 0 0 1 7.75 7h8.5a.75.75 0 0 1 .75.75v8.5a.75.75 0 0 1-.75.75h-8.5a.75.75 0 0 1-.75-.75v-8.5ZM9 10.5h6M9 13.5h6" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </span>
                <span className="text-lg font-semibold text-blue-900 text-center">{file.fileName}</span>
                <div className="text-xs text-gray-500 text-center w-full mt-1">
                  <div><span className="font-semibold">Bank:</span> {file.bankName || '-'}</div>
                  <div><span className="font-semibold">Type:</span> {file.fileType || '-'}</div>
                  {/* Uncomment if you have a bankType field: */}
                  {/* <div><span className="font-semibold">Bank Type:</span> {file.bankType || '-'}</div> */}
                </div>
                <span className="text-xs text-gray-400 mt-1">Uploaded: {file.uploaded}</span>
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      // Show file details and preview if a file is selected
      const file = files.find(f => f.id === activeTabId);
      if (file) {
        mainContent = (
          <div className="p-8">
            <h2 className="text-xl font-bold mb-4 text-blue-800">{file.fileName}</h2>
            <FilePreview file={file} onSlice={handleOpenSliceTab} />
          </div>
        );
      }
    }
  }

  return (
    <div className="flex min-h-screen">
      <FilesSidebar
        files={banks}
        selectedFileId={selectedFileId}
        expandedFileId={expandedFileId}
        onFileClick={handleFileClick}
        onVersionClick={handleVersionClick}
        onExpand={handleExpand}
        statements={files}
      />
      <main className="flex-1 ">
        {/* Tabs */}
        <div className="flex mb-6 border-b border-blue-100">
          {[...openTabs, ...openSliceTabs.map(tab => ({ id: tab.id, name: tab.name }))].map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center px-4 py-2 mr-2 rounded-t-lg cursor-pointer border-b-2 ${activeTabId === tab.id ? 'border-blue-500 bg-white font-bold text-blue-700' : 'border-transparent bg-blue-50 text-blue-800'}`}
              onClick={() => handleTabClick(tab.id)}
            >
              <span>{tab.name}</span>
              {tab.id !== 'all' && (
                <button
                  className="ml-2 text-gray-400 hover:text-red-500 focus:outline-none"
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  title="Close tab"
                >
                  <RiCloseLine />
                </button>
              )}
            </div>
          ))}
        </div>
        {/* Main content */}
        {mainContent}
        <UploadModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} onSuccess={refreshFiles} />
        <EditFileModal isOpen={editModalOpen} file={editFile} onClose={() => setEditModalOpen(false)} onSave={handleEditSave} />
        <DeleteFileModal 
          isOpen={deleteModalOpen} 
          file={deleteFile} 
          onClose={() => setDeleteModalOpen(false)} 
          onDelete={handleDeleteConfirm} 
          loading={deleteLoading}
          deleteProgress={deleteProgress}
          deleteTotal={deleteTotal}
          isBatchDeleting={isBatchDeleting}
        />
      </main>
    </div>
  );
};

export default FilesPage;