'use client';
import { useState, useEffect, useRef } from 'react';
import AccountsClient from '../sub-pages/accounts/AccountsClient';
import StatementsPage from '../sub-pages/statements/page';
import SuperBankPage from '../sub-pages/super-bank/page';
import BankTransactionsPage from '../sub-pages/bank-transactions/page';
import StatementPage from '../statement/page';
import CreateBankModal from '../components/Modals/CreateBankModal';
import { RiBankLine, RiCloseLine, RiEdit2Line, RiDeleteBin6Line } from 'react-icons/ri';
import { Bank } from '../types/aws';
import { useRouter, usePathname } from 'next/navigation';
import BanksSidebar from '../components/BanksSidebar';
import { useAuth } from '../hooks/useAuth';

// File Preview Tab Component - Using the same interface as Files page
function FilePreviewTab({ fileId, fileName }: { fileId: string; fileName?: string }) {
  const [fileData, setFileData] = useState<any>(null);
  const [data, setData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colWidths, setColWidths] = useState<number[]>([]);
  const [headerRow, setHeaderRow] = useState<number | null>(null);
  const [startRow, setStartRow] = useState<number | null>(null);
  const [endRow, setEndRow] = useState<number | null>(null);
  const [selectionStep, setSelectionStep] = useState<'header' | 'transactions'>('header');
  const [showRange, setShowRange] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const tableRef = useRef<HTMLTableElement>(null);

  // Slice preview states
  const [showSlicePreview, setShowSlicePreview] = useState(false);
  const [sliceData, setSliceData] = useState<string[][]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
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
  const [previewData, setPreviewData] = useState<string[][]>([]);

  // Delimit column modal states
  const [showDelimitModal, setShowDelimitModal] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [delimitDelimiter, setDelimitDelimiter] = useState<string>('');
  const [newColumnNames, setNewColumnNames] = useState<string>('Date,Time');
  const [delimitPreview, setDelimitPreview] = useState<string[][]>([]);

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

  // Delimit column functionality
  const handleDelimitPreview = () => {
    if (!selectedColumn || !delimitDelimiter || !newColumnNames) return;
    
    const columnIndex = previewData[0]?.findIndex(col => col === selectedColumn);
    if (columnIndex === -1) return;
    
    const newColumnNamesArray = newColumnNames.split(',').map(name => name.trim()).filter(name => name);
    if (newColumnNamesArray.length === 0) return;
    
    const preview: string[][] = [];
    
    // Add header row
    const newHeaders = [...previewData[0]];
    newHeaders.splice(columnIndex, 1, ...newColumnNamesArray);
    preview.push(newHeaders);
    
    // Add data rows (show first 5 rows as preview)
    previewData.slice(1, 6).forEach(row => {
      const newRow = [...row];
      const cellValue = row[columnIndex] || '';
      const splitValues = cellValue.split(delimitDelimiter);
      
      // Replace the original column with split values
      newRow.splice(columnIndex, 1, ...splitValues);
      preview.push(newRow);
    });
    
    setDelimitPreview(preview);
  };

  const handleDelimitSave = () => {
    if (!selectedColumn || !delimitDelimiter || !newColumnNames) return;
    
    const columnIndex = previewData[0]?.findIndex(col => col === selectedColumn);
    if (columnIndex === -1) return;
    
    const newColumnNamesArray = newColumnNames.split(',').map(name => name.trim()).filter(name => name);
    if (newColumnNamesArray.length === 0) return;
    
    const newData: string[][] = [];
    
    // Process header row
    const newHeaders = [...previewData[0]];
    newHeaders.splice(columnIndex, 1, ...newColumnNamesArray);
    newData.push(newHeaders);
    
    // Process all data rows
    previewData.slice(1).forEach(row => {
      const newRow = [...row];
      const cellValue = row[columnIndex] || '';
      const splitValues = cellValue.split(delimitDelimiter);
      
      // Replace the original column with split values
      newRow.splice(columnIndex, 1, ...splitValues);
      newData.push(newRow);
    });
    
    setPreviewData(newData);
    setShowDelimitModal(false);
    setSelectedColumn('');
    setDelimitDelimiter('');
    setNewColumnNames('Date,Time');
    setDelimitPreview([]);
  };

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
      
      // Use the correct properties from fileData
      const accountId = fileData.accountId || fileData.accountNumber || '';
      const bankName = fileData.bankName || fileData.bank || '';
      
      console.log('Checking duplicates with:', { accountId, bankName, userId });
      console.log('Available fileData properties:', Object.keys(fileData));
      
      let existing: any[] = [];
      
      if (accountId && bankName) {
        const res = await fetch(`/api/transactions?accountId=${accountId}&userId=${userId}&bankName=${encodeURIComponent(bankName)}`);
        
        if (!res.ok) {
          console.warn(`API request failed: ${res.status} ${res.statusText}, skipping database duplicate check`);
        } else {
          const existingData = await res.json();
          if (Array.isArray(existingData)) {
            existing = existingData;
          } else {
            console.warn('API returned non-array data, skipping database duplicate check');
          }
        }
      } else {
        console.warn('Missing accountId or bankName, skipping database duplicate check');
      }
      
      const uniqueFields = selectedFields.map(f => f.split('-')[0]);
      
      // Check for duplicates within the current slice data first
      const currentDataKeys = new Set<string>();
      const currentDataDups = new Set<number>();
      const currentDataDupInfo: Array<{ row: number; key: string; fields: string; type: string }> = [];
      
      previewData.slice(1).forEach((row, i) => {
        const rowObj: Record<string, string> = {};
        previewData[0].forEach((header, j) => { rowObj[header] = row[j]; });
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
          const matchingField = existingFields.find(ef => 
            ef.toLowerCase() === field.toLowerCase() ||
            ef.toLowerCase().includes(field.toLowerCase()) ||
            field.toLowerCase().includes(ef.toLowerCase())
          );
          if (matchingField) {
            fieldMapping[field] = matchingField;
          }
        });
      }
      
      const dbDups = new Set<number>();
      const dbDupInfo: Array<{ row: number; key: string; fields: string; type: string }> = [];
      
      previewData.slice(1).forEach((row, i) => {
        const rowObj: Record<string, string> = {};
        previewData[0].forEach((header, j) => { rowObj[header] = row[j]; });
        
        const key = uniqueFields.map(f => {
          let value = (rowObj[f] || '').toString().trim().toLowerCase();
          if (f.toLowerCase().includes('amount') || f.toLowerCase().includes('balance')) {
            value = value.replace(/,/g, '');
          }
          return value;
        }).join('|');
        
        const isDuplicate = existing.some(existingRow => {
          const existingKey = uniqueFields.map(f => {
            const dbField = fieldMapping[f];
            if (!dbField) return '';
            let value = (existingRow[dbField] || '').toString().trim().toLowerCase();
            if (f.toLowerCase().includes('amount') || f.toLowerCase().includes('balance')) {
              value = value.replace(/,/g, '');
            }
            return value;
          }).join('|');
          return existingKey === key && key !== '';
        });
        
        if (isDuplicate) {
          dbDups.add(i + 1);
          dbDupInfo.push({ 
            row: i + 2, 
            key,
            fields: uniqueFields.map(f => `${f}: ${rowObj[f]}`).join(', '),
            type: 'database'
          });
        }
      });
      
      const allDups = new Set([...currentDataDups, ...dbDups]);
      setDuplicateRows(allDups);
      setDuplicateInfo([...currentDataDupInfo, ...dbDupInfo]);
      setDuplicateChecked(true);
      
    } catch (err) {
      console.error('Error checking duplicates:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to check duplicates');
    } finally {
      setCheckingDuplicates(false);
    }
  };

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    setDuplicateChecked(false);
    setIsBatchSaving(true);
    try {
      const selectedData = [previewData[0], ...previewData.slice(1).filter((_, i) => selectedRows.has(i + 1))];
      const header = selectedData[0];
      const rows = selectedData.slice(1);
      const batchSize = 25;
      setSaveTotal(rows.length);
      setSaveProgress(0);
      
      const Papa = (await import('papaparse')).default;
      
      for (let i = 0; i < rows.length; i += batchSize) {
        const batchRows = rows.slice(i, i + batchSize);
        const batchData = [header, ...batchRows];
        const csv = Papa.unparse(batchData);
        // Get the required fields with proper fallbacks
        const statementId = fileData.id || '';
        const bankId = fileData.bankId || '';
        const accountId = fileData.accountId || fileData.accountNumber || '';
        const bankName = fileData.bankName || fileData.bank || '';
        const fileName = fileData.fileName || fileData.name || '';
        const accountName = fileData.accountName || '';
        const accountNumber = fileData.accountNumber || '';
        const s3FileUrl = fileData.s3FileUrl || '';
        const userId = localStorage.getItem('userId') || '';

        console.log('Saving with payload:', {
          statementId,
          bankId,
          accountId,
          bankName,
          fileName,
          accountName,
          accountNumber,
          userId,
          hasCsv: !!csv,
          duplicateCheckFields: selectedFields.map(f => f.split('-')[0])
        });

        // Validate required fields
        if (!statementId || !bankId || !accountId || !bankName) {
          throw new Error(`Missing required fields: statementId=${!!statementId}, bankId=${!!bankId}, accountId=${!!accountId}, bankName=${!!bankName}`);
        }

        const payload = {
          csv,
          statementId,
          startRow: 1,
          endRow: batchData.length - 1,
          bankId,
          accountId,
          fileName,
          userId,
          bankName,
          accountName,
          accountNumber,
          duplicateCheckFields: selectedFields.map(f => f.split('-')[0]),
          s3FileUrl,
        };
        const res = await fetch('/api/transaction/slice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          console.error('API Error Response:', result);
          throw new Error(result.error || `Failed to save transactions: ${res.status} ${res.statusText}`);
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

  useEffect(() => {
    const fetchFileData = async () => {
      try {
        setLoading(true);
        const userId = localStorage.getItem('userId');
        if (!userId) {
          throw new Error('User not authenticated');
        }

        const response = await fetch(`/api/files?userId=${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch files');
        }

        const files = await response.json();
        const file = files.find((f: any) => f.id === fileId);
        
        if (!file) {
          throw new Error('File not found');
        }

        setFileData(file);
        console.log('File data loaded:', file);

        if (file.s3FileUrl) {
          try {
            const key = file.s3FileUrl.split('.amazonaws.com/')[1];
            if (key) {
              const presignRes = await fetch('/api/statement/presign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, userId }),
              });
              
              const { url, error: presignError } = await presignRes.json();
              if (presignError || !url) {
                throw new Error(presignError || 'Failed to get presigned URL');
              }
              
              const fileRes = await fetch(url);
              const csvText = await fileRes.text();
              
              const Papa = (await import('papaparse')).default;
              const parsed = Papa.parse<string[]>(csvText, { 
                skipEmptyLines: true,
                delimiter: ','
              });
              if (parsed.errors.length) {
                throw new Error('Failed to parse CSV');
              }
              
              setData(parsed.data as string[][]);
              setColWidths(parsed.data[0]?.map(() => 160) || []);
            }
          } catch (sliceError) {
            console.error('Error loading slice data:', sliceError);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    fetchFileData();
  }, [fileId]);

  // Update previewData when sliceData changes
  useEffect(() => {
    setPreviewData(sliceData);
  }, [sliceData]);

  // Initialize selectedFields when previewData changes
  useEffect(() => {
    if (previewData.length > 0 && selectedFields.length === 0) {
      const currentHeaders = previewData[0];
      const currentFieldNames = currentHeaders.map((header, idx) => `${header}-${idx}`);
      setSelectedFields(currentFieldNames);
      setColWidths(currentHeaders.map(() => 160));
    } else if (previewData.length > 0) {
      const currentHeaders = previewData[0];
      setColWidths(currentHeaders.map(() => 160));
    }
  }, [previewData]);



  // Show slicing UI for all CSV files
  const isCSVFile = fileData?.name?.toLowerCase().endsWith('.csv') || fileData?.fileType === 'Statement';
  const allowRangeSelection = isCSVFile && showRange;

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">Loading file...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!fileData) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          <p>File not found</p>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          <p>No data to display.</p>
        </div>
      </div>
    );
  }

  // Show slice preview if slice data is available
  if (showSlicePreview && sliceData.length > 0) {
    return (
      <>
        <div className="p-6 w-[160vh]">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Slice Preview - {fileName || fileData.name}</h2>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Bank: {fileData.bank}</span>
            <span>Type: {fileData.type}</span>
            <span>Account: {fileData.accountName}</span>
          </div>
        </div>

        <div className="bg-white w-[156vh] rounded-xl border border-blue-100 p-4 mt-4">
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
                onClick={() => setShowDelimitModal(true)}
                disabled={previewData.length === 0}
                title="Split a column into multiple columns"
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

              <button
                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSave}
                disabled={saving || previewData.length === 0}
                title="Save selected transactions to database"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isBatchSaving ? `Saving ${saveProgress}/${saveTotal}...` : 'Saving...'}
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save to Database
                  </>
                )}
              </button>

              <button
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-500 text-white rounded hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow text-xs font-medium"
                onClick={() => setShowSlicePreview(false)}
                title="Go back to file preview"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Preview
              </button>
            </div>

            {saveError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                <p className="text-sm font-medium">Error</p>
                <p className="text-xs">{saveError}</p>
              </div>
            )}

            {saveSuccess && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                <p className="text-sm font-medium">Success!</p>
                <p className="text-xs">Transactions saved successfully to database.</p>
              </div>
            )}

            {duplicateChecked && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg">
                <p className="text-sm font-medium">Duplicate Check Results</p>
                <p className="text-xs">
                  Found {duplicateRows.size} duplicate rows: {Array.from(duplicateRows).join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Slice data table */}
          <div className="overflow-auto" style={{ maxHeight: 600 }}>
            <table className="border-collapse min-w-full text-xs select-none" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-blue-50 border-b-2 border-blue-300 sticky top-0 z-20">
                <tr>
                  <th className="px-2 py-1 border border-blue-200 font-semibold text-blue-900">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === previewData.slice(1).length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRows(new Set(previewData.slice(1).map((_, i) => i + 1)));
                        } else {
                          setSelectedRows(new Set());
                        }
                      }}
                      className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-1"
                    />
                  </th>
                  {previewData[0]?.map((header, idx) => (
                    <th key={idx} className="px-2 py-1 border border-blue-200 font-semibold text-blue-900" style={{ width: colWidths[idx] || 160 }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.slice(1).map((row, i) => {
                  const isDuplicate = duplicateRows.has(i + 1);
                  return (
                    <tr key={i} className={`border-b border-gray-100 ${isDuplicate ? 'bg-red-50' : ''}`}>
                      <td className="px-2 py-1 border border-gray-200">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(i + 1)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRows(prev => new Set([...prev, i + 1]));
                            } else {
                              setSelectedRows(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(i + 1);
                                return newSet;
                              });
                            }
                          }}
                          className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-1"
                        />
                      </td>
                      {row.map((cell, j) => (
                        <td key={j} className="px-2 py-1 border border-gray-200 truncate" style={{ width: colWidths[j] || 160 }}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delimit Column Modal */}
      {console.log('showDelimitModal state:', showDelimitModal)}
      {showDelimitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Delimit Column</h3>
              <button
                onClick={() => {
                  setShowDelimitModal(false);
                  setSelectedColumn('');
                  setDelimitDelimiter('');
                  setNewColumnNames('Date,Time');
                  setDelimitPreview([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Select column */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select column to delimit:
                </label>
                <select
                  value={selectedColumn}
                  onChange={(e) => {
                    console.log('Column selected:', e.target.value);
                    setSelectedColumn(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select column</option>
                  {previewData[0]?.map((column, index) => (
                    <option key={index} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </div>

              {/* Delimiter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delimiter:
                </label>
                <input
                  type="text"
                  value={delimitDelimiter}
                  onChange={(e) => {
                    console.log('Delimiter changed:', e.target.value);
                    setDelimitDelimiter(e.target.value);
                  }}
                  placeholder="e.g., space, comma, semicolon"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* New column names */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New column names (comma separated):
                </label>
                <input
                  type="text"
                  value={newColumnNames}
                  onChange={(e) => {
                    console.log('New column names changed:', e.target.value);
                    setNewColumnNames(e.target.value);
                  }}
                  placeholder="Date,Time"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Preview */}
              {delimitPreview.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview:
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2 bg-gray-50">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          {delimitPreview[0]?.map((header, index) => (
                            <th key={index} className="text-left p-1 font-medium text-gray-700">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {delimitPreview.slice(1).map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="p-1 text-gray-600">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleDelimitPreview}
                  disabled={!selectedColumn || !delimitDelimiter || !newColumnNames}
                  className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Preview
                </button>
                <button
                  onClick={handleDelimitSave}
                  disabled={!selectedColumn || !delimitDelimiter || !newColumnNames}
                  className="flex-1 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowDelimitModal(false);
                    setSelectedColumn('');
                    setDelimitDelimiter('');
                    setNewColumnNames('Date,Time');
                    setDelimitPreview([]);
                  }}
                  className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  return (
    <>
      <div className="p-6 w-[160vh]">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{fileName || fileData.name}</h2>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Bank: {fileData.bank}</span>
            <span>Type: {fileData.type}</span>
            <span>Account: {fileData.accountName}</span>
          </div>
        </div>

        <div className="bg-white w-[156vh] rounded-xl border border-blue-100 p-4 mt-4">
          {isCSVFile && (
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
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                disabled={headerRow === null || startRow === null || endRow === null}
                onClick={() => {
                  if (headerRow !== null && startRow !== null && endRow !== null) {
                    const sliced = [data[headerRow], ...data.slice(startRow, endRow + 1)];
                    setSliceData(sliced);
                    setSelectedRows(new Set(sliced.slice(1).map((_, i) => i + 1)));
                    setShowSlicePreview(true);
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
      </div>

      {/* Delimit Column Modal */}
      {console.log('showDelimitModal state:', showDelimitModal)}
      {showDelimitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Delimit Column</h3>
              <button
                onClick={() => {
                  setShowDelimitModal(false);
                  setSelectedColumn('');
                  setDelimitDelimiter('');
                  setNewColumnNames('Date,Time');
                  setDelimitPreview([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Select column */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select column to delimit:
                </label>
                <select
                  value={selectedColumn}
                  onChange={(e) => {
                    console.log('Column selected:', e.target.value);
                    setSelectedColumn(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select column</option>
                  {previewData[0]?.map((column, index) => (
                    <option key={index} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </div>

              {/* Delimiter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delimiter:
                </label>
                <input
                  type="text"
                  value={delimitDelimiter}
                  onChange={(e) => {
                    console.log('Delimiter changed:', e.target.value);
                    setDelimitDelimiter(e.target.value);
                  }}
                  placeholder="e.g., space, comma, semicolon"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* New column names */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New column names (comma separated):
                </label>
                <input
                  type="text"
                  value={newColumnNames}
                  onChange={(e) => {
                    console.log('New column names changed:', e.target.value);
                    setNewColumnNames(e.target.value);
                  }}
                  placeholder="Date,Time"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Preview */}
              {delimitPreview.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview:
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2 bg-gray-50">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          {delimitPreview[0]?.map((header, index) => (
                            <th key={index} className="text-left p-1 font-medium text-gray-700">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {delimitPreview.slice(1).map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="p-1 text-gray-600">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleDelimitPreview}
                  disabled={!selectedColumn || !delimitDelimiter || !newColumnNames}
                  className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Preview
                </button>
                <button
                  onClick={handleDelimitSave}
                  disabled={!selectedColumn || !delimitDelimiter || !newColumnNames}
                  className="flex-1 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowDelimitModal(false);
                    setSelectedColumn('');
                    setDelimitDelimiter('');
                    setNewColumnNames('Date,Time');
                    setDelimitPreview([]);
                  }}
                  className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="p-6 w-[160vh]">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{fileName || fileData.name}</h2>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>Bank: {fileData.bank}</span>
          <span>Type: {fileData.type}</span>
          <span>Account: {fileData.accountName}</span>
        </div>
      </div>

      <div className="bg-white w-[156vh] rounded-xl border border-blue-100 p-4 mt-4">
        {isCSVFile && (
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
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
              disabled={headerRow === null || startRow === null || endRow === null}
              onClick={() => {
                if (headerRow !== null && startRow !== null && endRow !== null) {
                  const sliced = [data[headerRow], ...data.slice(startRow, endRow + 1)];
                  setSliceData(sliced);
                  setSelectedRows(new Set(sliced.slice(1).map((_, i) => i + 1)));
                  setShowSlicePreview(true);
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


        
    </div>
  );
}

// Define a type for tabs
interface Tab {
  key: string;
  label: string;
  type: 'overview' | 'accounts' | 'statements' | 'super-bank' | 'file' | 'bank-transactions' | 'bank-statements';
  bankId?: string;
  accountId?: string;
  accountName?: string;
  fileId?: string;
  fileName?: string;
}

export default function BanksTabsClient() {
  const [tabs, setTabs] = useState<Tab[]>([{ key: 'overview', label: 'Overview', type: 'overview' }]);
  const [activeTab, setActiveTab] = useState('overview');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editBank, setEditBank] = useState<Bank | null>(null);
  const [allTags, setAllTags] = useState<Array<{ id: string; name: string; color?: string }>>([]);
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const adminEmail = 'nitesh.inkhub@gmail.com';

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        setError(null);
        const response = await fetch('/api/bank');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch banks');
        }
        const data = await response.json();
        setBanks(data);
      } catch (error) {
        console.error('Error fetching banks:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch banks. Please check your AWS configuration.');
      } finally {
        setIsFetching(false);
      }
    };
    fetchBanks();
  }, []);

  // Fetch tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (userId) {
          const response = await fetch(`/api/tags?userId=${userId}`);
          if (response.ok) {
            const tags = await response.json();
            setAllTags(Array.isArray(tags) ? tags : []);
          }
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };
    fetchTags();
  }, []);



  const handleCreateBank = async (bankName: string, tags: string[]) => {
    const exists = banks.some(
      b => b.bankName.trim().toLowerCase() === bankName.trim().toLowerCase()
    );
    if (exists) {
      alert("A bank with this name already exists.");
      return;
    }
    setError(null);
    try {
      const response = await fetch('/api/bank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bankName, tags }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create bank');
      }
      const newBank = await response.json();
      setBanks((prev) => [...prev, newBank]);
    } catch (error) {
      console.error('Error creating bank:', error);
      setError(error instanceof Error ? error.message : 'Failed to create bank. Please try again.');
    }
  };

  const handleUpdateBank = async (id: string, bankName: string, tags: string[]) => {
    try {
      const response = await fetch(`/api/bank/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankName, tags }),
      });
      if (!response.ok) throw new Error('Failed to update bank');
      const updatedBank = await response.json();
      setBanks(prev => prev.map(b => b.id === id ? updatedBank : b));
      setEditBank(null);
      setIsModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update bank');
    }
  };

  const handleBankCardClick = (bank: Bank) => {
    const tabKey = `accounts-${bank.id}`;
    if (tabs.some(tab => tab.key === tabKey)) {
      setActiveTab(tabKey);
      router.push(`${pathname}?bankId=${bank.id}`);
      return;
    }
    setTabs([...tabs, { key: tabKey, label: bank.bankName, type: 'accounts', bankId: bank.id }]);
    setActiveTab(tabKey);
    router.push(`${pathname}?bankId=${bank.id}`);
  };

  const handleBankTransactionsClick = (bank: Bank) => {
    const tabKey = `bank-transactions-${bank.id}`;
    if (tabs.some(tab => tab.key === tabKey)) {
      setActiveTab(tabKey);
      router.push(`${pathname}?bankId=${bank.id}&view=transactions`);
      return;
    }
    setTabs([...tabs, { 
      key: tabKey, 
      label: `${bank.bankName} - Transactions`, 
      type: 'bank-transactions', 
      bankId: bank.id 
    }]);
    setActiveTab(tabKey);
    router.push(`${pathname}?bankId=${bank.id}&view=transactions`);
  };

  const handleBankStatementsClick = (bank: Bank) => {
    const tabKey = `bank-statements-${bank.id}`;
    if (tabs.some(tab => tab.key === tabKey)) {
      setActiveTab(tabKey);
      router.push(`${pathname}?bankId=${bank.id}&view=statements`);
      return;
    }
    setTabs([...tabs, { 
      key: tabKey, 
      label: `${bank.bankName} - Statements`, 
      type: 'bank-statements', 
      bankId: bank.id 
    }]);
    setActiveTab(tabKey);
    router.push(`${pathname}?bankId=${bank.id}&view=statements`);
  };

  const handleAccountClick = (account: { id: string; accountHolderName: string }, bankId: string) => {
    const tabKey = `statements-${bankId}-${account.id}`;
    if (tabs.some(tab => tab.key === tabKey)) {
      setActiveTab(tabKey);
      router.push(`${pathname}?bankId=${bankId}&accountId=${account.id}`);
      return;
    }
    setTabs([...tabs, { 
        key: tabKey,
        label: account.accountHolderName,
        type: 'statements',
        bankId,
        accountId: account.id,
      accountName: account.accountHolderName
    }]);
    setActiveTab(tabKey);
    router.push(`${pathname}?bankId=${bankId}&accountId=${account.id}`);
  };

  const handleFileClick = (file: any) => {
    const tabKey = `file-${file.id}`;
    if (tabs.some(tab => tab.key === tabKey)) {
      setActiveTab(tabKey);
      return;
    }
    setTabs([...tabs, { 
      key: tabKey,
      label: file.name || file.fileName || 'File',
      type: 'file',
      bankId: file.bankId,
      fileId: file.id,
      fileName: file.name || file.fileName
    }]);
    setActiveTab(tabKey);
  };

  const handleCloseTab = (tabKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = tabs.filter(tab => tab.key !== tabKey);
    if (newTabs.length === 0) {
      setTabs([{ key: 'overview', label: 'Overview', type: 'overview' }]);
      setActiveTab('overview');
    } else {
    setTabs(newTabs);
      if (activeTab === tabKey) {
        setActiveTab(newTabs[newTabs.length - 1].key);
      }
    }
  };

  const handleEditBank = (bank: Bank) => {
    setEditBank(bank);
    setIsModalOpen(true);
  };

  const handleDeleteBank = async (bankId: string) => {
    if (!confirm('Are you sure you want to delete this bank? This will also delete all associated accounts, statements, and transactions.')) {
      return;
    }
    try {
      const response = await fetch(`/api/bank/${bankId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete bank');
      setBanks(prev => prev.filter(b => b.id !== bankId));
      const message = 'Bank deleted successfully. All associated accounts, statements, and transactions have also been deleted.';
      alert(message);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete bank');
    }
  };

  // Render tab bar and content
  return (
    <div className="flex h-screen bg-gray-50">
      <BanksSidebar 
        onSuperBankClick={() => {
          const tabKey = 'super-bank';
          if (tabs.some(tab => tab.key === tabKey)) {
            setActiveTab(tabKey);
            return;
          }
          setTabs([...tabs, { key: tabKey, label: 'Super Bank', type: 'super-bank' }]);
          setActiveTab(tabKey);
        }}
        onBankClick={(bank) => {
          const tabKey = `accounts-${bank.id}`;
          if (tabs.some(tab => tab.key === tabKey)) {
            setActiveTab(tabKey);
            router.push(`${pathname}?bankId=${bank.id}`);
            return;
          }
          setTabs([...tabs, { key: tabKey, label: bank.bankName, type: 'accounts', bankId: bank.id }]);
          setActiveTab(tabKey);
          router.push(`${pathname}?bankId=${bank.id}`);
        }}
        onBankTransactionsClick={handleBankTransactionsClick}
        onBankStatementsClick={handleBankStatementsClick}
        onAccountClick={handleAccountClick}
        onFileClick={handleFileClick}
      />
      <div className="flex-1 flex flex-col">
       

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200 px-6">
          <div className="flex items-center space-x-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center space-x-2 ${
                activeTab === tab.key
                    ? 'border-blue-600 text-blue-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
                <span>{tab.label}</span>
              {tab.key !== 'overview' && (
                <RiCloseLine 
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={(e) => handleCloseTab(tab.key, e)}
                />
              )}
            </button>
          ))}
        </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'overview' && (
            <div className="p-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                  {error.includes('AWS configuration') && (
                    <p className="text-sm mt-2">
                      Please check your .env.local file and ensure AWS credentials are properly configured.
                    </p>
                  )}
                </div>
              )}
              
              <CreateBankModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditBank(null); }}
                onCreate={handleCreateBank}
                editBank={editBank}
                onUpdate={handleUpdateBank}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isFetching ? (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    Loading banks...
                  </div>
                ) : banks.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <RiBankLine className="text-gray-400" size={32} />
                    </div>
                    <p className="text-lg font-medium text-gray-900 mb-2">No banks added yet</p>
                    <p className="text-sm text-gray-500">Click &quot;Add Bank&quot; to get started</p>
                  </div>
                ) : (
                  banks.map((bank) => (
                    <div
                      key={bank.id}
                      onClick={() => handleBankCardClick(bank)}
                      className="cursor-pointer bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 group relative overflow-hidden"
                    >
                      {/* Watermark Icon */}
                      <div className="absolute top-4 right-4 opacity-5 text-blue-500 text-4xl pointer-events-none select-none rotate-12">
                        <RiBankLine />
                      </div>
                      
                      {/* Edit/Delete Buttons */}
                      {user?.email === adminEmail && (
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            className="p-1 bg-blue-100 hover:bg-blue-200 rounded-full"
                            onClick={e => { e.stopPropagation(); handleEditBank(bank); }}
                            title="Edit Bank"
                          >
                            <RiEdit2Line className="text-blue-600" size={14} />
                          </button>
                          <button
                            className="p-1 bg-red-100 hover:bg-red-200 rounded-full"
                            onClick={e => { e.stopPropagation(); handleDeleteBank(bank.id); }}
                            title="Delete Bank"
                          >
                            <RiDeleteBin6Line className="text-red-600" size={14} />
                          </button>
                        </div>
                      )}
                      
                      {/* Bank Content */}
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <RiBankLine className="text-blue-600" size={20} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">{bank.bankName}</h3>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {activeTab !== 'overview' && (() => {
            const tab = tabs.find(t => t.key === activeTab);
            if (tab?.type === 'accounts' && tab.bankId) {
              return <AccountsClient bankId={tab.bankId} onAccountClick={account => handleAccountClick(account, tab.bankId!)} allTags={allTags} />;
            }
            if (tab?.type === 'statements' && tab.bankId && tab.accountId) {
              return <StatementsPage />;
            }
            if (tab?.type === 'bank-transactions' && tab.bankId) {
              return <BankTransactionsPage />;
            }
            if (tab?.type === 'bank-statements' && tab.bankId) {
              return <StatementPage />;
            }
            if (tab?.type === 'super-bank') {
              return <SuperBankPage />;
            }
            if (tab?.type === 'file' && tab.fileId) {
              return <FilePreviewTab fileId={tab.fileId} fileName={tab.fileName} />;
            }
            return <div>Custom Tab Content</div>;
          })()}
        </div>
      </div>
    </div>
  );
} 