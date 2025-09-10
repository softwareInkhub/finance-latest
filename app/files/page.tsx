'use client'

import React, { useState, useEffect, useRef } from 'react';

import FilesSidebar from '../components/FilesSidebar';

import { RiCloseLine, RiAddLine } from 'react-icons/ri';

import Papa from 'papaparse';

import { FiEdit2, FiTrash2, FiGrid, FiList, FiMoreVertical, FiSearch, FiFile, FiFolder } from 'react-icons/fi';

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

  const [countdown, setCountdown] = useState(2);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [banks, setBanks] = useState<{ id: string; bankName: string }[]>([]);

  const [accounts, setAccounts] = useState<{ id: string; accountHolderName: string; accountNumber?: string; tags?: string[] }[]>([]);

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

      // Start countdown and auto-close modal
      let remaining = 2;
      setCountdown(remaining);
      
      const countdownInterval = setInterval(() => {
        remaining--;
        setCountdown(remaining);
        
        if (remaining <= 0) {
          clearInterval(countdownInterval);
          onClose();
        }
      }, 1000);

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

      setCountdown(2);

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

                    <option key={a.id} value={a.id}>

                      {a.accountHolderName}

                      {a.tags && a.tags.length > 0 && ` (${a.tags.join(', ')})`}

                    </option>

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

          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-green-700 dark:text-green-300 font-semibold">

            <div className="flex items-center gap-2">
              <span className="text-lg">✅</span>
              <span>File uploaded successfully! Closing in {countdown} second{countdown !== 1 ? 's' : ''}...</span>
            </div>

          </div>

        )}

      </div>

    </div>

  );

}



interface Folder {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  parentFolderId?: string;
  color?: string;
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

  folderId?: string | null; // Reference to parent folder

  [key: string]: unknown;

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

    <div className="bg-white dark:bg-gray-800 rounded-xl border border-blue-100 dark:border-gray-700 p-4 mt-4 w-[70vw]">

      {isStatement && (

        <div className="mb-4">
          {/* Range Selection Summary */}
          {showRange && headerRow !== null && startRow !== null && endRow !== null && (
            <div className="mb-3 p-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-200">
                <span className="text-lg">📊</span>
                <span>Selected Range: {endRow - startRow + 1} transactions (Rows {startRow + 1} to {endRow + 1})</span>
                <span className="px-2 py-1 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                  Header: Row {headerRow + 1}
                </span>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-4">

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
        </div>

      )}

      <div className="overflow-auto" style={{ maxHeight: 600 }}>

      <table ref={tableRef} className="border-collapse min-w-full text-xs select-none bg-white dark:bg-gray-800" style={{ tableLayout: 'fixed' }}>

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

                      ? 'bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-300 dark:border-blue-600 sticky top-0 z-20'

                      : isHeader

                    ? 'bg-purple-200 dark:bg-purple-800/60 border-l-4 border-purple-600 dark:border-purple-400 shadow-lg'

                    : isStart

                    ? 'bg-green-200 dark:bg-green-800/60 border-l-4 border-green-600 dark:border-green-400 shadow-lg'

                    : isEnd

                    ? 'bg-yellow-200 dark:bg-yellow-800/60 border-r-4 border-yellow-600 dark:border-yellow-400 shadow-lg'

                    : isInSlice

                    ? 'bg-blue-200 dark:bg-blue-800/50 border-l-4 border-r-4 border-blue-400 dark:border-blue-500'

                    : ''

                }

                onMouseEnter={() => setHoveredRow(i)}

                onMouseLeave={() => setHoveredRow(null)}

              >

                {row.map((cell, j) => (

                  <td

                    key={j}

                      className={`border border-blue-200 dark:border-gray-600 px-2 py-1 truncate relative text-black dark:text-white bg-white dark:bg-gray-800 ${isFirstRow ? 'font-semibold text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 group hover:bg-blue-100 dark:hover:bg-blue-900/30' : ''} ${isInSlice ? 'font-medium' : ''} ${isHeader || isStart || isEnd ? 'font-bold' : ''}`}

                    style={{ width: colWidths[j] || 160, minWidth: 60, maxWidth: 600 }}

                  >

                    {cell}

                      {isFirstRow && (

                        <>

                          <span

                            className="absolute right-0 top-0 h-full w-1 bg-gray-300 dark:bg-gray-600 opacity-60"

                            style={{ userSelect: 'none' }}

                          />

                          <span

                            className="absolute right-0 top-0 h-full w-3 cursor-col-resize z-20 bg-blue-300 dark:bg-blue-600 opacity-0 hover:opacity-100 transition-opacity"

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

                      <span className="ml-2 px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-bold shadow-lg animate-pulse">📋 Header</span>

                    )}

                    {allowRangeSelection && isStart && j === 0 && (

                      <span className="ml-2 px-3 py-1 bg-green-600 text-white rounded-full text-xs font-bold shadow-lg animate-pulse">▶️ Start</span>

                    )}

                    {allowRangeSelection && isEnd && j === 0 && (

                      <span className="ml-2 px-3 py-1 bg-yellow-600 text-white rounded-full text-xs font-bold shadow-lg animate-pulse">⏹️ End</span>

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

            <div className="font-semibold mb-1 text-gray-900 dark:text-gray-100">Select fields to check for duplicate transactions:</div>

            <div className="flex flex-wrap gap-2 mb-2">

              {sliceData.length > 0 && sliceData[0].map((header, idx) => (

                <label key={header + '-' + idx} className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 rounded cursor-pointer border border-gray-300 dark:border-gray-700">

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

            <table className="min-w-full border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900">

              <thead className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-900">

                <tr>

                  {sliceData[0]?.map((header, idx) => (

                    <th key={idx} className="border border-gray-200 dark:border-gray-700 px-2 py-2 font-bold bg-blue-50 dark:bg-gray-800 text-blue-900 dark:text-gray-200 whitespace-nowrap">{header}</th>

                  ))}

                </tr>

              </thead>

              <tbody>

                {sliceData.slice(1).map((row, i) => (

                  <tr key={i}>

                    {row.map((cell, j) => (

                      <td key={j} className="border border-gray-200 dark:border-gray-700 px-2 py-1 whitespace-nowrap text-gray-900 dark:text-gray-100">{cell}</td>

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

    { key: 'fileName', label: 'File Name', width: 'w-48' },

    { key: 'bankName', label: 'Bank', width: 'w-24' },

    { key: 'fileType', label: 'Type', width: 'w-20' },

    { key: 'createdAt', label: 'Created', width: 'w-28' },

    { key: 'accountId', label: 'Account ID', width: 'w-32' },

    { key: 'id', label: 'ID', width: 'w-20' },

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

    <div className="overflow-x-auto max-w-full border border-gray-200 rounded-lg bg-white">

      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>

        <table className="min-w-full">

          <thead>

            <tr className="bg-blue-50">

              <th className="px-2 py-1 sticky top-0 bg-gray-50 z-10 w-8">

                <input type="checkbox" checked={allSelected} onChange={e => onSelectAll(e.target.checked)} />

              </th>

              {columns.map(col => (

                <th

                  key={col.key}

                  className={`px-2 py-1 text-left text-gray-700 font-medium border-b border-gray-200 sticky top-0 bg-gray-50 z-10 ${col.width} cursor-pointer hover:bg-gray-100 transition-colors`}

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

              <th className="px-2 py-1 sticky top-0 bg-gray-50 z-10 w-20">Actions</th>

            </tr>

          </thead>

          <tbody>

            {files.map(file => (

              <tr

                key={file.id}

                className={`hover:bg-gray-50 cursor-pointer group ${selectedIds.includes(file.id) ? 'bg-blue-50' : ''}`}

                onClick={e => { if ((e.target as HTMLElement).tagName !== 'INPUT' && !(e.target as HTMLElement).closest('.row-actions')) onFileClick(file); }}

              >

                <td className="px-2 py-1 border-b border-gray-100">

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

                      className={`px-2 py-1 border-b border-gray-100 text-gray-700 align-top ${col.width} ${isExpanded ? '' : 'truncate'} cursor-pointer hover:bg-gray-50 transition-colors`}

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

                <td className="px-2 py-1 border-b border-gray-100 align-top">

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



// Loading skeleton component for files

function FileCardSkeleton() {

  return (

    <div className="bg-white rounded-xl shadow p-4 border border-gray-200 w-full sm:w-80 lg:w-72 xl:w-80 animate-pulse">

      <div className="flex items-center gap-3 mb-4">

        <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>

        <div className="flex-1">

          <div className="h-4 bg-gray-200 rounded mb-2"></div>

          <div className="h-3 bg-gray-200 rounded w-2/3"></div>

        </div>

      </div>

      <div className="space-y-3">

        <div className="flex items-center gap-2">

          <div className="w-4 h-4 bg-gray-200 rounded"></div>

          <div className="h-3 bg-gray-200 rounded flex-1"></div>

        </div>

        <div className="flex items-center gap-2">

          <div className="w-4 h-4 bg-gray-200 rounded"></div>

          <div className="h-3 bg-gray-200 rounded flex-1"></div>

        </div>

        <div className="flex items-center gap-2">

          <div className="w-4 h-4 bg-gray-200 rounded"></div>

          <div className="h-3 bg-gray-200 rounded w-3/4"></div>

        </div>

      </div>

    </div>

  );

}



// Enhanced File Card Component

function FileCard({ file, onFileClick, onEdit, onDelete, onDragStart, onDragEnd, isDragging }: { 
  file: FileData; 
  onFileClick: (file: FileData) => void; 
  onEdit: (file: FileData) => void; 
  onDelete: (file: FileData) => void;
  onDragStart?: (fileId: string) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}) {

  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);



  useEffect(() => {

    function handleClickOutside(event: MouseEvent) {

      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {

        setMenuOpen(false);

      }

    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);

  }, []);



  const formatDate = (dateString: string) => {

    if (!dateString) return 'Unknown';

    const date = new Date(dateString);

    return date.toLocaleDateString('en-US', { 

      month: 'short', 

      day: 'numeric', 

      year: 'numeric',

      hour: '2-digit',

      minute: '2-digit'

    });

  };



  const getFileIcon = (fileType: string) => {

    const iconClass = "w-6 h-6 text-white";

    switch (fileType?.toUpperCase()) {

      case 'CSV':

        return <FiFile className={iconClass} />;

      case 'PDF':

        return <FiFile className={iconClass} />;

      case 'XLSX':

      case 'XLS':

        return <FiFile className={iconClass} />;

      default:

        return <FiFile className={iconClass} />;

    }

  };



  return (

    <div

      className={`relative bg-white border-2 border-gray-200 hover:border-blue-400 transition-all duration-300 cursor-pointer group transform hover:scale-105 w-full h-full min-h-[200px] flex flex-col shadow-md hover:shadow-lg ${isDragging ? 'opacity-50 scale-95' : ''}`}

      onClick={() => onFileClick(file)}

      draggable

      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', file.id);
        onDragStart?.(file.id);
      }}

      onDragEnd={() => onDragEnd?.()}

      style={{

        clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)'

      }}

    >

      {/* File tab */}

      <div className="absolute top-0 right-0 w-6 h-6 bg-blue-500 transform rotate-45 translate-x-3 -translate-y-3 shadow-sm"></div>

      
      
      {/* File content */}

      <div className="p-4 lg:p-6 flex-1 flex flex-col">

        {/* File icon and name */}

        <div className="flex items-start justify-between mb-4">

          <div className="flex items-center gap-3 flex-1">

            <div className="w-10 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm relative">

              {getFileIcon(file.fileType)}

              {/* File fold corner */}

              <div className="absolute top-0 right-0 w-0 h-0 border-l-[8px] border-l-transparent border-b-[8px] border-b-white"></div>

            </div>

            <div className="flex-1 min-w-0">

              <h3 className="font-bold text-gray-900 text-base truncate" title={file.fileName}>

                {file.fileName}

              </h3>

              <p className="text-xs text-gray-500 font-medium">{file.fileType || 'Statement'}</p>

            </div>

          </div>

          
          
          {/* Ellipsis menu */}

          <div className="relative" ref={menuRef}>

            <button

              className="p-1 rounded hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"

              onClick={(e) => {

                e.stopPropagation();

                setMenuOpen(!menuOpen);

              }}

            >

              <FiMoreVertical className="w-3 h-3 text-gray-600" />

            </button>

            
            
            {menuOpen && (

              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">

                <button

                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 w-full text-left"

                  onClick={(e) => {

                    e.stopPropagation();

                    onEdit(file);

                    setMenuOpen(false);

                  }}

                >

                  <FiEdit2 className="w-3 h-3" />

                  Edit

                </button>

                <hr className="my-1" />

                <button

                  className="flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 w-full text-left"

                  onClick={(e) => {

                    e.stopPropagation();

                    onDelete(file);

                    setMenuOpen(false);

                  }}

                >

                  <FiTrash2 className="w-3 h-3" />

                  Delete

                </button>

              </div>

            )}

          </div>

        </div>

        
        
        {/* File details */}

        <div className="space-y-1 text-xs text-gray-600 mt-auto">

          <div className="font-medium">{file.bankName || 'Unknown Bank'}</div>

          <div>{formatDate((file.createdAt as string) || (((file as unknown) as Record<string, unknown>).uploaded as string | undefined) || '')}</div>

          {file.accountName && (

            <div className="truncate">{file.accountName}</div>

          )}

        </div>

      </div>

      
      
      {/* File bottom edge shadow */}

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-300 to-gray-200"></div>

    </div>

  );

}



// Empty state component

function EmptyState({ onUpload }: { onUpload: () => void }) {

  return (

    <div className="flex flex-col items-center justify-center py-16 px-8">

      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-6">

        <FiFile className="w-12 h-12 text-blue-500" />

      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">No files uploaded yet</h3>

      <p className="text-gray-500 text-center mb-6 max-w-md">

        Get started by uploading your first statement or financial document. 

        We support CSV, PDF, and Excel formats.

      </p>

      <button

        onClick={onUpload}

        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors shadow-sm"

      >

        Upload Your First File

      </button>

    </div>

  );

}



function FilesOverview({ files, onUpload, onEdit, onDelete, onFileClick, viewMode, setViewMode, folders, onMoveFileToFolder, selectedFolder, onCreateFolder, onBackToAllFiles }: { 
  files: FileData[]; 
  onUpload: () => void; 
  onEdit: (file: FileData) => void; 
  onDelete: (file: FileData | FileData[]) => void; 
  onFileClick: (file: FileData) => void; 
  viewMode: 'grid' | 'row'; 
  setViewMode: (mode: 'grid' | 'row') => void;
  folders: Folder[];
  onMoveFileToFolder: (fileId: string, folderId: string | null) => void;
  selectedFolder: string | null;
  onCreateFolder: () => void;
  onBackToAllFiles: () => void;
}) {



  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const [search, setSearch] = React.useState('');

  const [sortBy, setSortBy] = React.useState<'name' | 'date' | 'bank'>('date');

  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  const [loading, setLoading] = React.useState(false);

  const [draggedFileId, setDraggedFileId] = React.useState<string | null>(null);

  const [dragOverFolderId, setDragOverFolderId] = React.useState<string | null>(null);

  
  
  const handleSelect = (id: string) => {

    setSelectedIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);

  };

  const handleSelectAll = (checked: boolean) => {

    setSelectedIds(checked ? filteredFiles.map(f => f.id) : []);

  };

  const selectedFiles = files.filter(f => selectedIds.includes(f.id));

  // Drag and drop handlers
  const handleDragStart = (fileId: string) => {
    setDraggedFileId(fileId);
  };

  const handleDragEnd = () => {
    setDraggedFileId(null);
    setDragOverFolderId(null);
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setDragOverFolderId(folderId);
  };

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    if (draggedFileId) {
      onMoveFileToFolder(draggedFileId, folderId);
    }
    setDraggedFileId(null);
    setDragOverFolderId(null);
  };

  // Filter and sort files

  const filteredFiles = files

    .filter(file => {

      if (!search) return true;

      const searchLower = search.toLowerCase();

      return (

        file.fileName?.toLowerCase().includes(searchLower) ||

        file.bankName?.toLowerCase().includes(searchLower) ||

        file.fileType?.toLowerCase().includes(searchLower)

      );

    })

    .sort((a, b) => {

      let aValue, bValue;

      
      
      switch (sortBy) {

        case 'name':

          aValue = a.fileName?.toLowerCase() || '';

          bValue = b.fileName?.toLowerCase() || '';

          break;

        case 'bank':

          aValue = a.bankName?.toLowerCase() || '';

          bValue = b.bankName?.toLowerCase() || '';

          break;

        case 'date':

        default:

          aValue = new Date(((a.createdAt as unknown) as string | number | Date) || (((a as unknown) as Record<string, unknown>).uploaded as string | number | Date) || 0).getTime();
          
          bValue = new Date(((b.createdAt as unknown) as string | number | Date) || (((b as unknown) as Record<string, unknown>).uploaded as string | number | Date) || 0).getTime();

          break;

      }

      
      
      if (sortOrder === 'asc') {

        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;

      } else {

        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;

      }

    });



  // Simulate loading for demonstration

  useEffect(() => {

    if (files.length === 0) {

      setLoading(true);

      const timer = setTimeout(() => setLoading(false), 1000);

      return () => clearTimeout(timer);

    } else {

      setLoading(false);

    }

  }, [files.length]);



  return (

    <div className='min-h-screen bg-gray-50'>

      {/* Header */}

      <div className="bg-white border-b border-gray-200 px-6 py-4">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

          <div>

            <h1 className="text-3xl font-bold text-gray-900">Files</h1>

            <p className="text-gray-600 mt-1">

              {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'} total

            </p>

          </div>

          
          
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">

            {/* Search bar */}

            <div className="relative">

              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />

              <input

                type="text"

                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"

                placeholder="Search files..."

                value={search}

                onChange={e => setSearch(e.target.value)}

              />

            </div>

            
            
            {/* Sort dropdown */}

            <select

              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

              value={`${sortBy}-${sortOrder}`}

              onChange={e => {

                const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];

                setSortBy(newSortBy);

                setSortOrder(newSortOrder);

              }}

            >

              <option value="date-desc">Latest First</option>

              <option value="date-asc">Oldest First</option>

              <option value="name-asc">Name A-Z</option>

              <option value="name-desc">Name Z-A</option>

              <option value="bank-asc">Bank A-Z</option>

              <option value="bank-desc">Bank Z-A</option>

            </select>

            
            
            {/* View toggle */}

              <button 

              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"

              onClick={() => setViewMode(viewMode === 'grid' ? 'row' : 'grid')}

              title={`Switch to ${viewMode === 'grid' ? 'List' : 'Grid'} View`}

              >

              {viewMode === 'grid' ? <FiList className="w-4 h-4" /> : <FiGrid className="w-4 h-4" />}

              <span className="hidden sm:inline">{viewMode === 'grid' ? 'List' : 'Grid'} View</span>

              </button>

              

                  <button

              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors shadow-sm"

              onClick={onUpload}

                  >

              Upload File

                  </button>

          </div>

        </div>

        {/* Folder Drop Zones - Only show when in "All Files" view */}
        {folders.length > 0 && selectedFolder === null && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Drop files into folders:</h3>
              <button
                onClick={onCreateFolder}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <RiAddLine className="w-4 h-4" />
                Create Folder
                  </button>
                </div>
            <div className="flex flex-wrap gap-3">
              <div
                className={`p-3 rounded-lg border-2 border-dashed transition-all ${
                  dragOverFolderId === null 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 bg-gray-100'
                }`}
                onDragOver={(e) => handleDragOver(e, null)}
                onDrop={(e) => handleDrop(e, null)}
              >
                <div className="text-center">
                  <FiFolder className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                  <div className="text-sm font-medium text-gray-700">Root</div>
                  <div className="text-xs text-gray-500">Move to root</div>
                </div>
              </div>
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className={`p-3 rounded-lg border-2 border-dashed transition-all ${
                    dragOverFolderId === folder.id 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-300 bg-gray-100'
                  }`}
                  onDragOver={(e) => handleDragOver(e, folder.id)}
                  onDrop={(e) => handleDrop(e, folder.id)}
                >
                  <div className="text-center">
                    <FiFolder 
                      className="w-6 h-6 mx-auto mb-1" 
                      style={{ color: folder.color || '#6b7280' }}
                    />
                    <div className="text-sm font-medium text-gray-700">{folder.name}</div>
                    <div className="text-xs text-gray-500">Drop here</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back to All Files button - Show when inside a folder */}
        {selectedFolder !== null && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiFolder className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-800">
                    {folders.find(f => f.id === selectedFolder)?.name || 'Folder'} Files
                  </h3>
                  <p className="text-xs text-blue-600">
                    {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''} in this folder
                  </p>
            </div>
              </div>
            <button 
                onClick={onBackToAllFiles}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                ← Back to All Files
            </button>
          </div>
        </div>
        )}

      </div>



      {/* Selected items actions */}

      {viewMode === 'row' && selectedIds.length > 0 && (

        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">

          <div className="flex items-center gap-3">

            <span className="text-blue-800 font-medium">

              {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected

            </span>

            <button

              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"

              onClick={() => onEdit(selectedFiles[0])}

            >

              Edit

            </button>

            <button

              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"

              onClick={() => onDelete(selectedFiles)}

            >

              Delete

            </button>

          </div>

        </div>

      )}

      
      
      {/* Content */}

      <div className="p-6">

        {loading ? (

          // Loading skeletons

          <div className={viewMode === 'grid' 

            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6"

            : "space-y-4"

          }>

            {Array.from({ length: 8 }).map((_, i) => (

              <FileCardSkeleton key={i} />

            ))}

          </div>

        ) : filteredFiles.length === 0 ? (

          // Empty state

          search ? (

            <div className="text-center py-16">

              <FiSearch className="w-16 h-16 text-gray-300 mx-auto mb-4" />

              <h3 className="text-xl font-semibold text-gray-900 mb-2">No files found</h3>

              <p className="text-gray-500">Try adjusting your search criteria</p>

            </div>

          ) : (

            <EmptyState onUpload={onUpload} />

          )

        ) : viewMode === 'grid' ? (

          // Grid view

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">

            {filteredFiles.map((file) => (

              <FileCard

                key={file.id}

                file={file}

                onFileClick={onFileClick}

                onEdit={onEdit}

                onDelete={onDelete}

                onDragStart={handleDragStart}

                onDragEnd={handleDragEnd}

                isDragging={draggedFileId === file.id}

              />

            ))}

          </div>

        ) : (

          // List view

          <FilesTable 

            files={filteredFiles} 

            onFileClick={onFileClick} 

            selectedIds={selectedIds} 

            onSelect={handleSelect} 

            onSelectAll={handleSelectAll} 

            onEdit={onEdit} 

            onDelete={onDelete} 

          />

        )}

      </div>

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

function CreateFolderModal({ isOpen, onClose, onCreate }: { isOpen: boolean; onClose: () => void; onCreate: (name: string) => void }) {
  const [folderName, setFolderName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderName.trim()) {
      onCreate(folderName.trim());
      setFolderName('');
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${isOpen ? 'block' : 'hidden'}`}>
      <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
        <h2 className="text-xl font-bold mb-4">Create New Folder</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Folder Name</label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter folder name..."
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!folderName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Create Folder
            </button>
          </div>
        </form>
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

  const [saveCancelled, setSaveCancelled] = useState(false);

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

  // Serial number generation state
  const [originalData, setOriginalData] = useState<string[][]>([]);
  const [serialNumbersGenerated, setSerialNumbersGenerated] = useState(false);




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

      // Ensure selectedFields is populated with all columns if it's empty

      let fieldsToUse = selectedFields;

      if (selectedFields.length === 0 && previewData.length > 0) {

        console.log('selectedFields is empty, using all columns');

        fieldsToUse = previewData[0].map((header, idx) => `${header}-${idx}`);

        setSelectedFields(fieldsToUse);

      }

      
      
      console.log('Fields to use for duplicate check:', fieldsToUse);

      console.log('Preview data length:', previewData.length);

      console.log('Preview data headers:', previewData[0]);

      
      
      // Ensure we have data to check

      if (previewData.length <= 1) {

        throw new Error('No data to check for duplicates');

      }

      
      
      if (fieldsToUse.length === 0) {

        throw new Error('No fields selected for duplicate checking');

      }

      
      
      const userId = localStorage.getItem('userId') || '';

      const res = await fetch(`/api/transactions?accountId=${file.accountId}&userId=${userId}&bankName=${encodeURIComponent(file.bankName || '')}`);

      const existing = await res.json();

      
      
      if (!Array.isArray(existing)) {

        throw new Error('Failed to fetch existing transactions');

      }

      
      
      console.log('Found existing transactions:', existing.length);

      console.log('Sample existing transaction:', existing[0]);

      
      
      const uniqueFields = fieldsToUse.map(f => f.split('-')[0]);

      console.log('Selected fields (raw):', fieldsToUse);

      console.log('Checking against fields:', uniqueFields);

      console.log('Available fields in existing data:', existing.length > 0 ? Object.keys(existing[0]) : []);

      console.log('Preview data headers:', previewData[0]);

      
      
      // Debug: Show sample data from both sources

      if (existing.length > 0 && previewData.length > 1) {

        console.log('=== DEBUG: Sample Data Comparison ===');

        console.log('Sample existing transaction:', existing[0]);

        console.log('Sample new transaction:', previewData[1]);

        console.log('Selected fields to check:', uniqueFields);

        console.log('=====================================');

      }

      
      
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

                // Try common field name variations

                const commonVariations: { [key: string]: string[] } = {

                  'Date': ['Transaction Date', 'Txn Date', 'Date'],

                  'Description': ['Narration', 'Transaction Description', 'Particulars', 'Description'],

                  'Amount': ['Transaction Amount', 'Amount', 'Txn Amount'],

                  'Balance': ['Running Balance', 'Balance', 'Closing Balance'],

                  'Reference': ['Reference No.', 'Chq / Ref No.', 'Cheque No.', 'Ref No.'],

                  'Time': ['Transaction Time', 'Time', 'Txn Time']

                };

                
                
                const variations = commonVariations[field] || [];

                const variationMatch = variations.find(v => existingFields.includes(v));

                if (variationMatch) {

                  fieldMapping[field] = variationMatch;

                  console.log(`Field "${field}" mapped to "${variationMatch}" (common variation)`);

                } else {

                  fieldMapping[field] = field; // Keep original if no match found

                  console.log(`Field "${field}" not found in database, keeping original`);

                }

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

      
      
      // Enhanced duplicate detection with better field mapping

      console.log('Final duplicate check results:', {

        totalRows: previewData.length - 1,

        internalDuplicates: currentDataDups.size,

        databaseDuplicates: dbDupRows.size,

        totalDuplicates: allDupRows.size,

        fieldsChecked: uniqueFields,

        fieldsMapped: Object.keys(fieldMapping),

        existingTransactionsCount: existing.length

      });



      // If we found very few duplicates, try enhanced field mapping

      if (allDupRows.size < 10 && existing.length > 0) {

        console.log('Trying enhanced duplicate detection with better field mapping...');

        
        
        // Try multiple field combinations for better duplicate detection

        const enhancedFieldCombinations = [

          ['Date', 'Description', 'Amount'], // Most common combination

          ['Date', 'Description'], // Fallback

          ['Date', 'Amount'], // Alternative

          uniqueFields // Original selected fields

        ];

        
        
        let bestResult = { duplicates: new Set<number>(), info: [] as Array<{ row: number; key: string; fields: string; type: string }>, fields: [] as string[] };

        
        
        for (const fieldCombo of enhancedFieldCombinations) {

          console.log(`Trying field combination: ${fieldCombo.join(', ')}`);

          
          
          // Create enhanced field mapping for this combination

          const enhancedMapping: { [key: string]: string } = {};

          fieldCombo.forEach(field => {

            if (existing.length > 0) {

              const existingFields = Object.keys(existing[0]);

              // Try multiple matching strategies

              let mappedField = field;

              
              
              // 1. Exact match

              if (existingFields.includes(field)) {

                mappedField = field;

              }

              // 2. Case-insensitive match

              else {

                const lowerField = field.toLowerCase();

                const matchedField = existingFields.find(ef => ef.toLowerCase() === lowerField);

                if (matchedField) {

                  mappedField = matchedField;

                }

                // 3. Partial match

                else {

                  const partialMatch = existingFields.find(ef => 

                    ef.toLowerCase().includes(lowerField) || lowerField.includes(ef.toLowerCase())

                  );

                  if (partialMatch) {

                    mappedField = partialMatch;

                  }

                }

              }

              enhancedMapping[field] = mappedField;

            }

          });

          
          
          console.log('Enhanced field mapping:', enhancedMapping);

          
          
          // Create keys set for this combination

          const comboKeys = new Set(

            existing.map((tx: Record<string, unknown>) => fieldCombo.map(f => {

              const dbField = enhancedMapping[f] || f;

              let value = (tx[dbField] || '').toString().trim().toLowerCase();

              if (f.toLowerCase().includes('amount') || f.toLowerCase().includes('balance')) {

                value = value.replace(/,/g, '');

              }

              return value;

            }).join('|'))

          );

          
          
          // Check for duplicates with this combination

          const comboDups = new Set<number>();

          const comboDupInfo: Array<{ row: number; key: string; fields: string; type: string }> = [];

          
          
          previewData.slice(1).forEach((row, i) => {

            const rowObj: Record<string, string> = {};

            previewData[0].forEach((header, j) => { rowObj[header] = row[j]; });

            const key = fieldCombo.map(f => {

              let value = (rowObj[f] || '').toString().trim().toLowerCase();

              if (f.toLowerCase().includes('amount') || f.toLowerCase().includes('balance')) {

                value = value.replace(/,/g, '');

              }

              return value;

            }).join('|');

            
            
            if (comboKeys.has(key)) {

              comboDups.add(i + 1);

              comboDupInfo.push({ 

                row: i + 2, 

                key,

                fields: fieldCombo.map(f => `${f}: ${rowObj[f]}`).join(', '),

                type: 'enhanced'

              });

            }

          });

          
          
          // Update best result if this combination found more duplicates

          if (comboDups.size > bestResult.duplicates.size) {

            bestResult = {

              duplicates: new Set([...currentDataDups, ...comboDups]),

              info: [...currentDataDupInfo, ...comboDupInfo],

              fields: fieldCombo

            };

            console.log(`Better result found with ${fieldCombo.join(', ')}: ${comboDups.size} duplicates`);

          }

        }

        
        
        // Use the best result found

        if (bestResult.duplicates.size > allDupRows.size) {

          setDuplicateRows(bestResult.duplicates);

          setDuplicateInfo(bestResult.info);

          setDuplicateChecked(true);

          
          
          // Auto-select all duplicate rows

          setSelectedRows(prev => {

            const newSelected = new Set(prev);

            bestResult.duplicates.forEach(rowIndex => {

              newSelected.add(rowIndex);

            });

            return newSelected;

          });

          
          
          console.log(`Enhanced check found ${bestResult.duplicates.size} duplicates using fields: ${bestResult.fields.join(', ')}`);

        }

        
        
        // If still very few duplicates found, show a warning

        if (bestResult.duplicates.size < 50 && existing.length > 100) {

          console.warn('⚠️ WARNING: Very few duplicates detected despite large existing dataset. This might indicate:');

          console.warn('1. Field mapping issues between uploaded file and database');

          console.warn('2. Different date formats or field names');

          console.warn('3. Data structure differences between banks');

          console.warn('Consider checking the field mapping and data formats.');

        }

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



  // Manual duplicate check with specific fields

  const handleManualDuplicateCheck = async (manualFields: string[]) => {

    console.log('Manual duplicate check with fields:', manualFields);

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

      
      
      // Create manual field mapping

      const manualMapping: { [key: string]: string } = {};

      if (existing.length > 0) {

        const existingFields = Object.keys(existing[0]);

        manualFields.forEach(field => {

          // Try to find the best match

          let mappedField = field;

          if (existingFields.includes(field)) {

            mappedField = field;

          } else {

            const lowerField = field.toLowerCase();

            const matchedField = existingFields.find(ef => ef.toLowerCase() === lowerField);

            if (matchedField) {

              mappedField = matchedField;

            }

          }

          manualMapping[field] = mappedField;

        });

      }

      
      
      // Create keys set

      const manualKeys = new Set(

        existing.map((tx: Record<string, unknown>) => manualFields.map(f => {

          const dbField = manualMapping[f] || f;

          let value = (tx[dbField] || '').toString().trim().toLowerCase();

          if (f.toLowerCase().includes('amount') || f.toLowerCase().includes('balance')) {

            value = value.replace(/,/g, '');

          }

          return value;

        }).join('|'))

      );

      
      
      // Check for duplicates

      const manualDups = new Set<number>();

      const manualDupInfo: Array<{ row: number; key: string; fields: string; type: string }> = [];

      
      
      previewData.slice(1).forEach((row, i) => {

        const rowObj: Record<string, string> = {};

        previewData[0].forEach((header, j) => { rowObj[header] = row[j]; });

        const key = manualFields.map(f => {

          let value = (rowObj[f] || '').toString().trim().toLowerCase();

          if (f.toLowerCase().includes('amount') || f.toLowerCase().includes('balance')) {

            value = value.replace(/,/g, '');

          }

          return value;

        }).join('|');

        
        
        if (manualKeys.has(key)) {

          manualDups.add(i + 1);

          manualDupInfo.push({ 

            row: i + 2, 

            key,

            fields: manualFields.map(f => `${f}: ${rowObj[f]}`).join(', '),

            type: 'manual'

          });

        }

      });

      
      
      setDuplicateRows(manualDups);

      setDuplicateInfo(manualDupInfo);

      setDuplicateChecked(true);

      
      
      // Auto-select all duplicate rows

      setSelectedRows(prev => {

        const newSelected = new Set(prev);

        manualDups.forEach(rowIndex => {

          newSelected.add(rowIndex);

        });

        return newSelected;

      });

      
      
      console.log(`Manual check found ${manualDups.size} duplicates using fields: ${manualFields.join(', ')}`);
      
      

    } catch (err) {

      console.error('Error in manual duplicate check:', err);

      setSaveError(err instanceof Error ? err.message : 'Failed to check for duplicates');

    } finally {

      setCheckingDuplicates(false);

    }

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

  // Serial number generation function
  const handleGenerateSerialNumbers = () => {
    if (previewData.length === 0) return;

    // Store original data before making changes
    setOriginalData([...previewData]);
    setSerialNumbersGenerated(true);

    const newData = [...previewData];
    
    // Check if serial number column already exists
    const headerRow = newData[0];
    const serialColIndex = headerRow.findIndex(col => 
      col.toLowerCase().includes('serial') || 
      col.toLowerCase().includes('sr') || 
      col.toLowerCase().includes('s.no') ||
      col.toLowerCase().includes('sl no') ||
      col.toLowerCase().includes('s.no.')
    );

    if (serialColIndex !== -1) {
      // Serial column exists, update it
      for (let i = 1; i < newData.length; i++) {
        newData[i][serialColIndex] = i.toString();
      }
    } else {
      // Add new serial number column at the beginning
      const newHeader = ['S.No.', ...headerRow];
      const newRows = newData.slice(1).map((row, index) => [
        (index + 1).toString(),
        ...row
      ]);
      
      setPreviewData([newHeader, ...newRows]);
      return;
    }

    setPreviewData(newData);
  };

  // Cancel serial number generation
  const handleCancelSerialNumbers = () => {
    if (originalData.length > 0) {
      setPreviewData([...originalData]);
      setSerialNumbersGenerated(false);
      setOriginalData([]);
    }
  };



  // Cancel save handler
  const handleCancelSave = () => {
    setSaving(false);
    setSaveCancelled(true);
    setIsBatchSaving(false);
    setSaveProgress(0);
    setSaveTotal(0);
    setSaveError(null);
  };

  // Save handler

  const handleSave = async () => {

    setSaving(true);

    setSaveError(null);

    setSaveSuccess(false);

    setSaveCancelled(false);

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

        // Check if save was cancelled
        if (saveCancelled) {
          break;
        }

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

      if (!saveCancelled) {
        setSaveSuccess(true);
      }

    } catch (err: unknown) {

      const errorMessage = err instanceof Error ? err.message : 'Failed to save transactions';

      setSaveError(errorMessage);

    } finally {

      setSaving(false);

      setIsBatchSaving(false);

    }

  };



  return (

    <div className="bg-white dark:bg-gray-800 rounded-xl border border-blue-100 dark:border-gray-700 p-4 mt-4 w-[70vw] h-[73vh] overflow-y-auto">

      {/* Duplicate check field selection UI */}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-3 ">

        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">

          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">

            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />

          </svg>

          Select fields to check for duplicate transactions

        </h3>

        
        
        <div className="grid grid-cols-10 gap-2 mb-4 " >

          {previewData[0]?.filter(header => header && header.trim() !== '').map((header, idx) => (

            <label key={idx} className="flex items-center space-x-1 p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">

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

                className="w-3 h-3 text-blue-600 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-1"

              />

              <span className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate" title={header}>

                {header}

              </span>

            </label>

          ))}

        </div>



        <div className="flex flex-wrap gap-2 items-center justify-between">

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

            
            
            {/* Manual duplicate check buttons for debugging */}

            <div className="flex gap-1">

              <button

                className="flex items-center gap-1 px-2 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"

                onClick={() => handleManualDuplicateCheck(['Date', 'Description'])}

                disabled={checkingDuplicates || previewData.length === 0}

                title="Manual check with Date + Description only"

              >

                Date+Desc

              </button>

              <button

                className="flex items-center gap-1 px-2 py-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"

                onClick={() => handleManualDuplicateCheck(['Date', 'Description', 'Amount'])}

                disabled={checkingDuplicates || previewData.length === 0}

                title="Manual check with Date + Description + Amount"

              >

                Date+Desc+Amt

              </button>

            </div>

            

            {/* Serial Number Generation Buttons */}

            {!serialNumbersGenerated ? (
              <button
                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded hover:from-cyan-600 hover:to-cyan-700 transition-all duration-200 shadow-sm hover:shadow text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleGenerateSerialNumbers}
                disabled={previewData.length === 0}
                title="Generate or update serial numbers for transactions"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                Generate Serial No.
              </button>
            ) : (
              <button
                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow text-xs font-medium"
                onClick={handleCancelSerialNumbers}
                title="Cancel and revert serial number changes"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            )}

            
            
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

          
          
          <div className="flex gap-2">
            <button

              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"

              onClick={handleSave}

              disabled={saving || selectedRows.size === 0}

            >

              {saving ? 'Saving...' : `Save ${selectedRows.size} row(s)`}

            </button>

            {saving && (

              <button

                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"

                onClick={handleCancelSave}

                title="Cancel the saving process"

              >

                Cancel

              </button>

            )}

          </div>

        </div>

      </div>

      <div className="overflow-auto h-[45vh]" >

        <table ref={tableRef} className="border-collapse min-w-full text-xs select-none bg-white dark:bg-gray-800" style={{ tableLayout: 'fixed' }}>

          <tbody>

            {previewData.map((row, i) => {

              const isHeader = i === 0;

              return (

                <tr

                  key={i}

                  ref={el => { rowRefs.current[i] = el; }}

                  className={

                    isHeader

                      ? 'bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-300 dark:border-blue-600'

                      : duplicateRows.has(i)

                      ? 'bg-red-100 dark:bg-red-900/30 border-l-4 border-red-400 dark:border-red-500'

                      : selectedRows.has(i)

                      ? 'bg-blue-50 dark:bg-blue-900/20'

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

                  <td className="px-2 py-1 border border-blue-200 dark:border-gray-600 text-center bg-white dark:bg-gray-800">

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

                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2" 

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

                      }} className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2" />

                    )}

                  </td>

                  {row.map((cell, j) => (

                    <td 

                      key={j} 

                      className={`border border-blue-200 dark:border-gray-600 px-2 py-1 truncate relative text-black dark:text-white bg-white dark:bg-gray-800 ${isHeader ? 'font-semibold text-blue-900 dark:text-blue-300' : ''} ${duplicateRows.has(i) ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' : ''}`} 

                      style={{ width: colWidths[j] || 160, minWidth: 60, maxWidth: 600 }}

                    >

                      {cell}

                      {isHeader && (

                        <>

                          <span

                            className="absolute right-0 top-0 h-full w-1 bg-gray-300 dark:bg-gray-600 opacity-60"

                            style={{ userSelect: 'none' }}

                          />

                          <span

                            className="absolute right-0 top-0 h-full w-3 cursor-col-resize z-20 bg-blue-300 dark:bg-blue-600 opacity-0 hover:opacity-100 transition-opacity"

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

        <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">

          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span className="font-medium">{duplicateRows.size} duplicate row(s) found - highlighted in light red and will be skipped</span>
          </div>

        </div>

      )}

      {duplicateChecked && duplicateRows.size === 0 && (

        <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-green-700 dark:text-green-300 text-sm font-semibold">

          <div className="flex items-center gap-2">
            <span className="text-lg">✅</span>
            <span>No duplicate rows found</span>
          </div>

        </div>

      )}

      {/* Progress bar UI below the table */}

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

      {saveError && <div className="mt-2 text-red-600 text-sm">{saveError}</div>}

      {saveSuccess && <div className="mt-2 text-green-600 text-sm">Saved successfully!</div>}

      {saveCancelled && (

        <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-yellow-700 dark:text-yellow-300 text-sm">

          <div className="flex items-center gap-2">
            <span className="text-lg">⏹️</span>
            <span className="font-medium">Save process cancelled</span>
          </div>

        </div>

      )}

      
      
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
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');






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



  // Check for slice tab data from localStorage

  useEffect(() => {

    const sliceTabData = localStorage.getItem('sliceTabData');

    if (sliceTabData) {

      try {

        const data = JSON.parse(sliceTabData);

        const newTab = {

          id: data.tabId,

          name: data.tabName,

          sliceData: data.sliceData,

          file: data.file,

          selectedFields: data.selectedFields,

        };

        setOpenSliceTabs(prev => [...prev, newTab]);

        setActiveTabId(data.tabId);

        // Clear the localStorage data

        localStorage.removeItem('sliceTabData');

      } catch (error) {

        console.error('Error parsing slice tab data:', error);

        localStorage.removeItem('sliceTabData');

      }

    }

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

    // Trigger Super Bank refresh after file upload
    console.log('File uploaded successfully, triggering Super Bank refresh...');
    
    // Method 1: Dispatch custom event
    window.dispatchEvent(new CustomEvent('fileUploaded'));
    
    // Method 2: Update localStorage to trigger storage event
    localStorage.setItem('lastFileUpload', new Date().toISOString());
    
    // Method 3: Small delay to ensure the event is processed
    setTimeout(() => {
      localStorage.removeItem('lastFileUpload');
    }, 100);
  };

  // Folder functions
  const createFolder = async (name?: string) => {
    const folderName = name || newFolderName;
    if (!folderName.trim()) return;
    
    const userId = localStorage.getItem('userId');
    const newFolder: Folder = {
      id: `folder_${Date.now()}`,
      name: folderName.trim(),
      userId: userId || '',
      createdAt: new Date().toISOString(),
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`
    };
    
    setFolders(prev => [...prev, newFolder]);
    setNewFolderName('');
    setShowCreateFolderModal(false);
    
    // TODO: Save to backend
    try {
      await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFolder)
      });
    } catch (error) {
      console.error('Error saving folder:', error);
    }
  };

  const moveFileToFolder = async (fileId: string, folderId: string | null) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, folderId } : file
    ));
    
    // TODO: Save to backend
    try {
      await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId })
      });
    } catch (error) {
      console.error('Error moving file:', error);
    }
  };

  

  const getFilteredFiles = () => {
    if (selectedFolder === null) {
      return files.filter(file => !file.folderId); // Show files not in any folder
    }
    return files.filter(file => file.folderId === selectedFolder);
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

          if ((deleteFile as unknown as Record<string, unknown>).rowCount) {

            totalRows = Number((deleteFile as unknown as Record<string, unknown>).rowCount) || 0;

            console.log(`Using file rowCount: ${totalRows}`);

          } else if ((deleteFile as unknown as Record<string, unknown>).totalRows) {

            totalRows = Number((deleteFile as unknown as Record<string, unknown>).totalRows) || 0;

            console.log(`Using file totalRows: ${totalRows}`);

          } else if ((deleteFile as unknown as Record<string, unknown>).csvData) {

            // Try to parse CSV data from file

            try {

              const csvData = String((deleteFile as unknown as Record<string, unknown>).csvData || '');

              const lines = csvData.split('\n').filter((line: string) => line.trim());

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

            mainContent = <FilesOverview 
          files={getFilteredFiles()} 
          onUpload={() => setShowUploadModal(true)} 
          onEdit={handleEditFile} 
          onDelete={handleDeleteFile} 
          onFileClick={handleFileClick} 
          viewMode={viewMode} 
          setViewMode={setViewMode}
          folders={folders}
          onMoveFileToFolder={moveFileToFolder}
          selectedFolder={selectedFolder}
          onCreateFolder={() => setShowCreateFolderModal(true)}
          onBackToAllFiles={() => setSelectedFolder(null)}
        />;

  } else if (activeTabId.startsWith('slice-')) {

    const sliceTab = openSliceTabs.find(tab => tab.id === activeTabId);

    if (sliceTab) {

      mainContent = (

        <div className="p-8">

          <div className="mb-4">

            <h2 className="text-xl font-bold text-blue-800">{sliceTab.name}</h2>

            {/* Account Information Header */}

            <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">

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

                <span className="text-xs text-gray-400 mt-1">Uploaded: {String((file as unknown as Record<string, unknown>).uploaded ?? '')}</span>

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

    <div className="flex min-h-screen bg-gray-50">

      <FilesSidebar

        files={banks || []}

        selectedFileId={selectedFileId}

        onFileClick={handleFileClick as unknown as (file: { id: string; fileName: string }) => void}

        statements={files as unknown as Array<{ id: string; fileName: string; fileType: string; bankId: string; accountId: string }>}

      />

      <main className="flex-1">

        {/* Only show tabs if there are multiple tabs or non-all tabs */}

        {([...openTabs, ...openSliceTabs].length > 1 || activeTabId !== 'all') && (

          <div className="bg-white border-b border-gray-200">

            <div className="flex overflow-x-auto">

              {[...openTabs, ...openSliceTabs.map(tab => ({ id: tab.id, name: tab.name }))].map((tab) => (

                <div

                  key={tab.id}

                  className={`flex items-center px-6 py-3 cursor-pointer border-b-2 whitespace-nowrap ${

                    activeTabId === tab.id 

                      ? 'border-blue-500 bg-white text-blue-700 font-semibold' 

                      : 'border-transparent bg-gray-50 text-gray-600 hover:text-gray-900 hover:bg-gray-100'

                  }`}

                  onClick={() => handleTabClick(tab.id)}

                >

                  <span>{tab.name}</span>

                  {tab.id !== 'all' && (

                    <button

                      className="ml-3 text-gray-400 hover:text-red-500 focus:outline-none"

                      onClick={(e) => handleCloseTab(tab.id, e)}

                      title="Close tab"

                    >

                      <RiCloseLine className="w-4 h-4" />

                    </button>

                  )}

                </div>

              ))}

            </div>

          </div>

        )}

        
        
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

        <CreateFolderModal 

          isOpen={showCreateFolderModal} 

          onClose={() => setShowCreateFolderModal(false)} 

          onCreate={createFolder} 

        />

      </main>

    </div>

  );

};



export default FilesPage;