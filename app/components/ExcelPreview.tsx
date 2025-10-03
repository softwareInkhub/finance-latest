'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import { RiFileExcelLine, RiTableLine, RiDownloadLine, RiCloseLine, RiScissorsLine, RiSaveLine } from 'react-icons/ri';
import { useGlobalTabs } from '../contexts/GlobalTabContext';
import Modal from './Modals/Modal';

interface ExcelData {
  sheetNames: string[];
  sheets: { [key: string]: unknown[][] };
  headers: { [key: string]: string[] };
}

interface ExcelPreviewProps {
  file: {
    id: string;
    name: string;
    downloadUrl?: string;
  };
  onClose: () => void;
  excelData?: ExcelData; // Optional pre-loaded data for CSV files
  enableSlicing?: boolean; // Enable slicing functionality for CSV files
}

export default function ExcelPreview({ file, onClose, excelData: preloadedData, enableSlicing = false }: ExcelPreviewProps) {
  const [excelData, setExcelData] = useState<ExcelData | null>(preloadedData || null);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [loading, setLoading] = useState(!preloadedData);
  const [error, setError] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<number>(10000); // High limit to show most files completely
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const [isResizing, setIsResizing] = useState<number | null>(null);
  
  const { addTab, setActiveTab } = useGlobalTabs();
  
  // Slicing state
  const [showSlicing, setShowSlicing] = useState(false);
  const [headerRow, setHeaderRow] = useState<number | null>(null);
  const [startRow, setStartRow] = useState<number | null>(null);
  const [endRow, setEndRow] = useState<number | null>(null);
  const [selectionStep, setSelectionStep] = useState<'header' | 'transactions'>('header');
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const loadExcelData = useCallback(async () => {
    // Skip loading if we already have preloaded data
    if (preloadedData) {
      setExcelData(preloadedData);
      setActiveSheet(preloadedData.sheetNames[0] || '');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (!file || !file.id || !file.name) {
        throw new Error('Invalid file data');
      }

      if (!file.downloadUrl) {
        throw new Error('No download URL available. Please ensure the file is properly uploaded and accessible.');
      }

      // Try to fetch the Excel file
      let response;
      let actualDownloadUrl = file.downloadUrl;
      
      // If downloadUrl is a local API endpoint, call it first to get the actual download URL
      if (file.downloadUrl.startsWith('/api/files/download')) {
        console.log('Getting download URL from local API...');
        console.log('API endpoint:', file.downloadUrl);
        const downloadResponse = await fetch(file.downloadUrl);
        console.log('Download API response status:', downloadResponse.status);
        console.log('Download API response headers:', Object.fromEntries(downloadResponse.headers.entries()));
        
        if (downloadResponse.ok) {
          const downloadData = await downloadResponse.json();
          console.log('Download API response data:', downloadData);
          if (downloadData.downloadUrl) {
            actualDownloadUrl = downloadData.downloadUrl;
            console.log('Got actual download URL:', actualDownloadUrl);
          } else {
            throw new Error('No download URL received from API');
          }
        } else {
          const errorText = await downloadResponse.text();
          console.error('Download API error response:', errorText);
          throw new Error(`Failed to get download URL: ${downloadResponse.status} ${downloadResponse.statusText}`);
        }
      }
      
      // Now fetch the actual file
      response = await fetch(actualDownloadUrl);
      
      // If the direct URL fails, try to get download URL from BRMH Drive API as fallback
      if (!response.ok) {
        console.log('Direct download failed, trying to get download URL from BRMH Drive API...');
        const userId = localStorage.getItem('userId');
        if (userId) {
          try {
            const downloadResponse = await fetch(`/api/files/download?userId=${userId}&fileId=${file.id}`);
            if (downloadResponse.ok) {
              const downloadData = await downloadResponse.json();
              if (downloadData.downloadUrl) {
                response = await fetch(downloadData.downloadUrl);
              }
            }
          } catch (e) {
            console.warn('Failed to get download URL from API:', e);
          }
        }
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }

      // Check if response is HTML (error page) instead of binary data
      const contentType = response.headers.get('content-type');
      console.log('Response content-type:', contentType);
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (contentType && contentType.includes('text/html')) {
        const htmlText = await response.text();
        console.error('Received HTML instead of Excel file:', htmlText.substring(0, 200));
        throw new Error('File not found or access denied. The server returned an error page instead of the Excel file.');
      }
      
      // Check if response is JSON instead of binary data
      if (contentType && contentType.includes('application/json')) {
        const jsonText = await response.text();
        console.error('Received JSON instead of Excel file:', jsonText.substring(0, 200));
        throw new Error('The server returned JSON data instead of the Excel file. This might be file metadata instead of the actual file content.');
      }

      const arrayBuffer = await response.arrayBuffer();
      
      // Validate that we have actual file content
      if (arrayBuffer.byteLength === 0) {
        throw new Error('The file appears to be empty or corrupted.');
      }

      let workbook;
      try {
        workbook = XLSX.read(arrayBuffer, { type: 'array' });
      } catch (parseError) {
        console.error('Error parsing Excel file:', parseError);
        throw new Error('Failed to parse Excel file. The file may be corrupted or in an unsupported format.');
      }

      // Extract sheet names
      const sheetNames = workbook.SheetNames;
      
      if (!sheetNames || sheetNames.length === 0) {
        throw new Error('No sheets found in the Excel file.');
      }
      
      // Extract data from each sheet
      const sheets: { [key: string]: unknown[][] } = {};
      const headers: { [key: string]: string[] } = {};

      sheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          console.warn(`Sheet "${sheetName}" is empty or corrupted`);
          sheets[sheetName] = [];
          headers[sheetName] = [];
          return;
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        // Convert to 2D array
        const dataArray = jsonData as unknown[][];
        
        // Validate that we have data
        if (!dataArray || dataArray.length === 0) {
          console.warn(`Sheet "${sheetName}" contains no data`);
          sheets[sheetName] = [];
          headers[sheetName] = [];
          return;
        }
        
        sheets[sheetName] = dataArray;
        
        // Extract headers (first row)
        headers[sheetName] = dataArray.length > 0 ? dataArray[0].map(String) : [];
      });

      // Validate that we have at least one sheet with data
      const validSheets = sheetNames.filter(name => sheets[name] && sheets[name].length > 0);
      if (validSheets.length === 0) {
        throw new Error('No valid sheets with data found in the Excel file.');
      }

      setExcelData({
        sheetNames,
        sheets,
        headers
      });

      // Set first valid sheet as active
      if (validSheets.length > 0) {
        setActiveSheet(validSheets[0]);
      }

    } catch (err) {
      console.error('Error loading Excel file:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Excel file');
    } finally {
      setLoading(false);
    }
  }, [file, preloadedData]);

  useEffect(() => {
    loadExcelData();
  }, [loadExcelData]);


  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'xlsx':
      case 'xls':
        return <RiFileExcelLine className="w-6 h-6 text-green-600" />;
      default:
        return <RiTableLine className="w-6 h-6 text-blue-600" />;
    }
  };

  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return '';
    
    // Handle numbers with proper formatting
    if (typeof value === 'number') {
      // Check if it's a decimal number
      if (value % 1 !== 0) {
        return value.toFixed(2);
      }
      return value.toLocaleString();
    }
    
    // Handle dates
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    
    // Handle strings
    const stringValue = String(value).trim();
    
    // Check if it looks like a date (basic check)
    if (stringValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/) || 
        stringValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return stringValue;
    }
    
    // Check if it looks like a number but is stored as string
    if (stringValue.match(/^-?\d+\.?\d*$/) && stringValue !== '') {
      const numValue = parseFloat(stringValue);
      if (!isNaN(numValue)) {
        return numValue.toLocaleString();
      }
    }
    
    return stringValue;
  };

  const getCellAlignment = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return 'text-left';
    
    if (typeof value === 'number') return 'text-right';
    
    const stringValue = String(value).trim();
    if (stringValue.match(/^-?\d+\.?\d*$/) && stringValue !== '') {
      return 'text-right';
    }
    
    return 'text-left';
  };

  // Calculate current sheet data and headers
  const currentSheetData = excelData?.sheets[activeSheet] || [];
  const currentHeaders = useMemo(() => excelData?.headers[activeSheet] || [], [excelData?.headers, activeSheet]);
  const dataRows = currentSheetData.slice(1, previewRows + 1); // Skip header row

  // Auto-fit columns when headers change (use pixel widths for readability)
  useEffect(() => {
    if (currentHeaders.length > 0 && Object.keys(columnWidths).length === 0) {
      // Auto-fit columns on first load
      setTimeout(() => {
        // Use fixed pixel sizing so many columns stay readable with horizontal scroll
        const baseWidth = currentHeaders.length > 15 ? 100 : 140;
        
        const newWidths: { [key: string]: number } = {};
        currentHeaders.forEach((_, index) => {
          const key = `${activeSheet}-${index}`;
          newWidths[key] = baseWidth;
        });
        
        setColumnWidths(newWidths);
      }, 100);
    }
  }, [currentHeaders, columnWidths, activeSheet]);

  const getColumnWidth = useCallback((columnIndex: number): number => {
    const key = `${activeSheet}-${columnIndex}`;
    if (columnWidths[key]) {
      return columnWidths[key];
    }
    // Default pixel widths
    return currentHeaders.length > 15 ? 100 : 140;
  }, [columnWidths, activeSheet, currentHeaders.length]);

  const getTotalTableWidth = useCallback((): number => {
    if (!currentHeaders.length) return 100;
    const rowNumberWidth = 48; // px
    const totalColumnWidth = currentHeaders.reduce((sum, _, index) => sum + getColumnWidth(index), 0);
    return Math.round(rowNumberWidth + totalColumnWidth);
  }, [currentHeaders, getColumnWidth]);

  const handleMouseDown = (e: React.MouseEvent, columnIndex: number) => {
    e.preventDefault();
    setIsResizing(columnIndex);
    
    const startX = e.clientX;
    const startWidth = getColumnWidth(columnIndex);
    
    // Add global cursor style
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      
      // Pixel-based resizing for predictable behavior
      const minPx = currentHeaders.length > 15 ? 60 : 80;
      const maxPx = currentHeaders.length > 15 ? 220 : 320;
      const newWidth = Math.max(minPx, Math.min(maxPx, startWidth + deltaX));
      
      const key = `${activeSheet}-${columnIndex}`;
      setColumnWidths(prev => ({
        ...prev,
        [key]: newWidth
      }));
    };
    
    const handleMouseUp = () => {
      setIsResizing(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const downloadExcel = async () => {
    try {
      let url: string = file.downloadUrl ?? '';
      if (!url) return;
      // Resolve API indirection to actual pre-signed URL
      if (url.startsWith('/api/files/download')) {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          url = (data.downloadUrl as string) || (data.url as string) || url;
        }
      }
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Failed to download file:', e);
    }
  };

  const resetColumnWidths = () => {
    setColumnWidths({});
  };

  const fitAllColumns = () => {
    if (!currentHeaders.length) return;
    
    // Set uniform pixel widths; enable horizontal scroll when many columns
    const baseWidth = currentHeaders.length > 15 ? 100 : 140;
    
    const newWidths: { [key: string]: number } = {};
    currentHeaders.forEach((_, index) => {
      const key = `${activeSheet}-${index}`;
      newWidths[key] = baseWidth;
    });
    
    setColumnWidths(newWidths);
  };

  // Slicing functions
  const isCsvFile = file.name.toLowerCase().endsWith('.csv');
  const shouldShowSlicing = enableSlicing && isCsvFile;

  const handleSlice = () => {
    if (headerRow !== null && startRow !== null && endRow !== null) {
      const sliced = [currentSheetData[headerRow], ...currentSheetData.slice(startRow, endRow + 1)].map(row => 
        row.map(cell => String(cell))
      );
      
      // Open new tab with slice preview
      const tabId = `slice-preview-${Date.now()}`;
      const tabTitle = `Slice Preview: ${file.name} (${sliced.length - 1} transactions)`;
      
      console.log('Creating slice preview tab:', { tabId, tabTitle, sliceDataLength: sliced.length });
      
      try {
        // Open the new tab with slice preview
        addTab({
          id: tabId,
          title: tabTitle,
          type: 'custom',
          component: <SlicePreviewComponent 
            data={sliced} 
            fileName={file.name} 
            onSave={handleSaveSliceFromPreview}
          />,
          data: { 
            sliceData: sliced, 
            fileName: file.name, 
            transactionCount: sliced.length - 1,
            source: 'entities',
            isPreview: true
          }
        });
        
        console.log('Slice preview tab added successfully, switching to:', tabId);
        
        // Switch to the new tab
        setActiveTab(tabId);
        
        console.log('Active tab set to slice preview:', tabId);
        
        // Reset slicing state in current tab
        setHeaderRow(null);
        setStartRow(null);
        setEndRow(null);
        setSelectionStep('header');
      } catch (tabError) {
        console.error('Error creating slice preview tab:', tabError);
        alert('Failed to open slice preview. Please try again.');
      }
    }
  };

  // Create a component for displaying sliced transactions preview (before saving)
  const SlicePreviewComponent = React.memo(({ data, fileName, onSave }: { 
    data: string[][], 
    fileName: string, 
    onSave: (data: string[][]) => Promise<void> 
  }) => {
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<string[][]>(data);
    
    // Delimit state and logic
    const [delimitDialogOpen, setDelimitDialogOpen] = useState(false);
    const [delimitColIdx, setDelimitColIdx] = useState<number | null>(null);
    const [delimiter, setDelimiter] = useState<string>(' ');
    const [newColNames, setNewColNames] = useState<string[]>(['Date', 'Time']);
    const [delimitPreview, setDelimitPreview] = useState<string[][] | null>(null);
    const [delimitError, setDelimitError] = useState<string | null>(null);

    // Update previewData when data changes
    useEffect(() => {
      setPreviewData(data);
    }, [data]);

    const handleSave = async () => {
      setSaving(true);
      setSaveError(null);
      try {
        await onSave(previewData);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'Failed to save');
      } finally {
        setSaving(false);
      }
    };

    // Delimit handlers
    const handleDelimitPreview = () => {
      setDelimitError(null);

      if (delimitColIdx === null || !delimiter) {
        setDelimitError('Select a column and delimiter.');
        return;
      }

      const header = previewData[0];
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

    return (
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Slice Preview
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {data.length - 1} transactions from {fileName}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setDelimitDialogOpen(true)}
                disabled={previewData.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                title="Split a column into multiple columns (e.g., date/time)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Delimit
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <RiSaveLine className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Transactions'}
              </button>
            </div>
          </div>
          
          {saveError && (
            <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {saveError}
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                  <tr>
                    {previewData[0]?.map((header, idx) => (
                      <th key={idx} className="border border-gray-200 dark:border-gray-600 px-3 py-2 font-bold bg-blue-50 dark:bg-gray-800 text-blue-900 dark:text-gray-200 whitespace-nowrap text-left">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(1).map((row, i) => (
                    <tr key={i} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                      {row.map((cell, j) => (
                        <td key={j} className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-gray-100">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
                {previewData[0]?.map((header, idx) => (
                  <option key={idx} value={idx}>{header}</option>
                ))}
              </select>
              
              <label className="block mb-1 font-medium text-sm">Delimiter:</label>
              <input
                className="w-full border rounded px-2 py-1 mb-2"
                value={delimiter}
                onChange={e => setDelimiter(e.target.value)}
                placeholder="e.g. space, /, -"
              />
              
              <label className="block mb-1 font-medium text-sm">New column names (comma-separated):</label>
              <input
                className="w-full border rounded px-2 py-1 mb-2"
                value={newColNames.join(', ')}
                onChange={e => setNewColNames(e.target.value.split(',').map(s => s.trim()))}
                placeholder="e.g. Date, Time"
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
              </div>
            )}
            
            <div className="flex gap-2">
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
  });
  SlicePreviewComponent.displayName = 'SlicePreviewComponent';

  // Create a component for displaying saved sliced transactions
  const SlicedTransactionsComponent = React.memo(({ data, fileName }: { data: string[][], fileName: string }) => (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Sliced Transactions
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {data.length - 1} transactions from {fileName}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
              ✅ Saved Successfully
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                <tr>
                  {data[0]?.map((header, idx) => (
                    <th key={idx} className="border border-gray-200 dark:border-gray-600 px-3 py-2 font-bold bg-blue-50 dark:bg-gray-800 text-blue-900 dark:text-gray-200 whitespace-nowrap text-left">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(1).map((row, i) => (
                  <tr key={i} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                    {row.map((cell, j) => (
                      <td key={j} className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-gray-100">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  ));
  SlicedTransactionsComponent.displayName = 'SlicedTransactionsComponent';

  // Function to save slice from the preview tab
  const handleSaveSliceFromPreview = async (data: string[][]) => {
    try {
      // Prepare CSV string from sliceData
      const csv = Papa.unparse(data);

      // Prepare payload for /api/transaction/slice
      const payload = {
        csvData: csv,
        fileName: file.name,
        userId: localStorage.getItem('userId'),
        skipDuplicateCheck: true // Default to true for faster processing
      };

      const res = await fetch('/api/transaction/slice/fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save slice');
      }

      const result = await res.json();
      console.log('Slice saved successfully:', result);
      
      // Create a new tab with the saved sliced transactions
      const tabId = `slice-saved-${Date.now()}`;
      const tabTitle = `Sliced: ${file.name} (${data.length - 1} transactions)`;
      
      console.log('Creating saved slice tab:', { tabId, tabTitle, sliceDataLength: data.length });
      
      // Open the new tab with saved transactions
      addTab({
        id: tabId,
        title: tabTitle,
        type: 'custom',
        component: <SlicedTransactionsComponent data={data} fileName={file.name} />,
        data: { 
          sliceData: data, 
          fileName: file.name, 
          transactionCount: data.length - 1,
          source: 'entities',
          isSaved: true
        }
      });
      
      console.log('Saved slice tab added successfully, switching to:', tabId);
      
      // Switch to the new tab
      setActiveTab(tabId);
      
      console.log('Active tab set to saved slice:', tabId);
      
      // Reset slicing state in original tab
      setShowSlicing(false);
      setHeaderRow(null);
      setStartRow(null);
      setEndRow(null);
      setSelectionStep('header');
      
    } catch (err) {
      console.error('Error saving slice from preview:', err);
      throw err; // Re-throw to be handled by the preview component
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Excel file...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <RiCloseLine className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-red-600 mb-2 font-medium">Error loading Excel file</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <div className="text-xs text-gray-400">
            <p>• Make sure the file is properly uploaded</p>
            <p>• Check if the file is accessible</p>
            <p>• Try refreshing the page</p>
          </div>
        </div>
      </div>
    );
  }

  if (!excelData || !activeSheet) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }


  return (
    <div className="h-full max-h-[85vh] w-full max-w-[86vw] flex flex-col">
      <style jsx>{`
        .scrollbar-thin {
          scrollbar-width: thin;
        }
        .scrollbar-thumb-gray-400::-webkit-scrollbar-thumb {
          background-color: #9ca3af;
        }
        .scrollbar-track-gray-200::-webkit-scrollbar-track {
          background-color: #e5e7eb;
        }
        .dark .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb {
          background-color: #4b5563;
        }
        .dark .scrollbar-track-gray-700::-webkit-scrollbar-track {
          background-color: #374151;
        }
        .scrollbar-thin::-webkit-scrollbar {
          height: 12px;
          width: 12px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          border-radius: 6px;
          background-color: #6b7280;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background-color: #4b5563;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background-color: #f3f4f6;
          border-radius: 6px;
        }
        .dark .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: #6b7280;
        }
        .dark .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background-color: #9ca3af;
        }
        .dark .scrollbar-thin::-webkit-scrollbar-track {
          background-color: #374151;
        }
      `}</style>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 gap-4">
        <div className="flex items-center gap-3">
          {getFileIcon(file.name)}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {file.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {excelData.sheetNames.length} sheet{excelData.sheetNames.length !== 1 ? 's' : ''} • {currentSheetData.length - 1} rows
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {shouldShowSlicing && (
            <button
              onClick={() => setShowSlicing(!showSlicing)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                showSlicing 
                  ? 'bg-orange-600 text-white hover:bg-orange-700' 
                  : 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-800'
              }`}
              title="Slice data for transaction processing"
            >
              <RiScissorsLine className="w-4 h-4" />
              {showSlicing ? 'Hide Slicing' : 'Slice Data'}
            </button>
          )}
          <button
            onClick={fitAllColumns}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
            title="Fit all columns to screen width"
          >
            <RiTableLine className="w-4 h-4" />
            Fit All Columns
          </button>
          <button
            onClick={resetColumnWidths}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Reset column widths to default"
          >
            <RiTableLine className="w-4 h-4" />
            Reset Columns
          </button>
          <button
            onClick={downloadExcel}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <RiDownloadLine className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <RiCloseLine className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sheet Tabs */}
      {excelData.sheetNames.length > 1 && (
        <div className="border-b-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800">
          <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-700">
            {excelData.sheetNames.map((sheetName) => (
              <button
                key={sheetName}
                onClick={() => setActiveSheet(sheetName)}
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap border-r border-gray-300 dark:border-gray-600 flex-shrink-0 ${
                  activeSheet === sheetName
                    ? 'text-gray-900 dark:text-white bg-white dark:bg-gray-900 border-b-2 border-b-white dark:border-b-gray-900 relative z-10 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                style={{
                  backgroundColor: activeSheet === sheetName ? '#ffffff' : '#f3f4f6',
                  borderBottom: activeSheet === sheetName ? '2px solid #ffffff' : '2px solid transparent',
                  fontSize: '12px',
                  fontWeight: '500',
                  minWidth: '120px'
                }}
              >
                {sheetName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Slicing Controls */}
      {shouldShowSlicing && showSlicing && (
        <div className="border-b-2 border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20 p-4">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200">Slice Data for Processing</h3>
            
            {/* Range Selection Summary */}
            {headerRow !== null && startRow !== null && endRow !== null && (
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
            
            <button
              onClick={handleSlice}
              disabled={headerRow === null || startRow === null || endRow === null}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <RiScissorsLine className="w-4 h-4 inline mr-2" />
              Slice
            </button>
            
            {(headerRow !== null || startRow !== null || endRow !== null) && (
              <button
                onClick={() => {
                  setHeaderRow(null);
                  setStartRow(null);
                  setEndRow(null);
                  setSelectionStep('header');
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Reset Selection
              </button>
            )}
          </div>
          
        </div>
      )}

      {/* Data Table */}
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-900 max-h-[80vh]">
        {currentHeaders.length > 0 ? (
          <div className="max-h-full">
            <table className="border-collapse border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" style={{ 
              tableLayout: 'fixed', 
              width: `max(100%, ${getTotalTableWidth()}px)` 
            }}>
              <thead className="sticky top-0 z-10">
                <tr>
                  {/* Row number header */}
                  <th
                    className="border border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-600 px-2 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 w-12"
                    style={{ 
                      backgroundColor: '#e5e7eb',
                      borderColor: '#d1d5db',
                      fontSize: '10px',
                      fontWeight: '600'
                    }}
                  >
                    #
                  </th>
                  {currentHeaders.map((header, index) => (
                    <th
                      key={index}
                      className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-2 sm:px-3 py-1 sm:py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 relative group"
                      style={{ 
                        backgroundColor: '#f3f4f6',
                        borderColor: '#d1d5db',
                        fontSize: '10px',
                        fontWeight: '600',
                        width: `${getColumnWidth(index)}px`,
                        minWidth: '60px',
                        maxWidth: '400px'
                      }}
                    >
                      <div className="truncate" title={header || `Column ${index + 1}`}>
                        {header || `Column ${index + 1}`}
                      </div>
                      {/* Resize handle */}
                      <div
                        className="absolute top-0 right-0 w-3 h-full cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        onMouseDown={(e) => handleMouseDown(e, index)}
                        style={{
                          backgroundColor: isResizing === index ? '#3b82f6' : 'transparent',
                          right: '-1px'
                        }}
                        title="Drag to resize column"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rowIndex) => {
                  const actualRowIndex = rowIndex + 1; // +1 because we skip header row
                  const isHeader = headerRow === actualRowIndex;
                  const isInSlice = startRow !== null && endRow !== null && actualRowIndex >= startRow && actualRowIndex <= endRow;
                  const isStart = startRow !== null && actualRowIndex === startRow;
                  const isEnd = endRow !== null && actualRowIndex === endRow;
                  
                  return (
                    <tr 
                      key={rowIndex} 
                      className={`transition-colors ${
                        isHeader ? 'bg-purple-100 dark:bg-purple-900/30' :
                        isInSlice ? 'bg-green-100 dark:bg-green-900/30' :
                        'hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                      style={{ 
                        backgroundColor: isHeader ? '#f3e8ff' : isInSlice ? '#dcfce7' : (rowIndex % 2 === 0 ? '#ffffff' : '#fafafa')
                      }}
                      onMouseEnter={() => setHoveredRow(actualRowIndex)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      {/* Row number */}
                      <td
                        className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 w-12 relative"
                        style={{ 
                          backgroundColor: '#f9fafb',
                          borderColor: '#d1d5db',
                          fontSize: '10px',
                          fontWeight: '500'
                        }}
                      >
                        {actualRowIndex + 1}
                        
                        {/* Header selection button */}
                        {shouldShowSlicing && showSlicing && selectionStep === 'header' && hoveredRow === actualRowIndex && (
                          <button
                            className="absolute left-full ml-2 px-2 py-1 bg-purple-500 text-white rounded text-xs whitespace-nowrap z-10"
                            onClick={() => {
                              setHeaderRow(actualRowIndex);
                              setSelectionStep('transactions');
                            }}
                          >
                            Select Header
                          </button>
                        )}
                        
                        {/* Start selection button */}
                        {shouldShowSlicing && showSlicing && selectionStep === 'transactions' && startRow === null && actualRowIndex > (headerRow || 0) && hoveredRow === actualRowIndex && (
                          <button
                            className="absolute left-full ml-2 px-2 py-1 bg-green-500 text-white rounded text-xs whitespace-nowrap z-10"
                            onClick={() => setStartRow(actualRowIndex)}
                          >
                            Start
                          </button>
                        )}
                        
                        {/* End selection button */}
                        {shouldShowSlicing && showSlicing && selectionStep === 'transactions' && startRow !== null && endRow === null && actualRowIndex > startRow && hoveredRow === actualRowIndex && (
                          <button
                            className="absolute left-full ml-2 px-2 py-1 bg-yellow-500 text-white rounded text-xs whitespace-nowrap z-10"
                            onClick={() => setEndRow(actualRowIndex)}
                          >
                            End
                          </button>
                        )}
                        
                        {/* Selection badges */}
                        {shouldShowSlicing && showSlicing && isHeader && (
                          <span className="absolute left-full ml-2 px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-bold shadow-lg animate-pulse whitespace-nowrap z-10">
                            📋 Header
                          </span>
                        )}
                        
                        {shouldShowSlicing && showSlicing && isStart && (
                          <span className="absolute left-full ml-2 px-3 py-1 bg-green-600 text-white rounded-full text-xs font-bold shadow-lg animate-pulse whitespace-nowrap z-10">
                            ▶️ Start
                          </span>
                        )}
                        
                        {shouldShowSlicing && showSlicing && isEnd && (
                          <span className="absolute left-full ml-2 px-3 py-1 bg-yellow-600 text-white rounded-full text-xs font-bold shadow-lg animate-pulse whitespace-nowrap z-10">
                            ⏹️ End
                          </span>
                        )}
                      </td>
                      {currentHeaders.map((_, colIndex) => (
                        <td
                          key={colIndex}
                          className={`border border-gray-300 dark:border-gray-600 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-gray-900 dark:text-gray-100 ${getCellAlignment(row[colIndex])}`}
                          style={{ 
                            borderColor: '#d1d5db',
                            fontSize: '11px',
                            lineHeight: '1.3',
                            width: `${getColumnWidth(colIndex)}px`,
                            minWidth: '60px',
                            maxWidth: '400px'
                          }}
                        >
                          <div className="truncate" title={formatCellValue(row[colIndex])}>
                            {formatCellValue(row[colIndex])}
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500">No data in this sheet</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm text-gray-600 dark:text-gray-400 gap-2">
          <div className="flex items-center gap-4">
            <span>
              Showing {Math.min(previewRows, dataRows.length)} of {currentSheetData.length - 1} rows
            </span>
            {currentSheetData.length - 1 > previewRows && (
              <div className="flex items-center gap-2">
                <span className="text-orange-600 dark:text-orange-400 font-medium">
                  (Large file - showing first {previewRows} rows for performance)
                </span>
                <button
                  onClick={() => setPreviewRows(currentSheetData.length - 1)}
                  className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors"
                >
                  Load All
                </button>
              </div>
            )}
            {currentSheetData.length - 1 <= previewRows && currentSheetData.length - 1 > 1000 && (
              <span className="text-green-600 dark:text-green-400 font-medium">
                (All rows loaded)
              </span>
            )}
          </div>
           <div className="flex flex-wrap items-center gap-2 sm:gap-4">
             <span>
               Sheet: <span className="font-semibold text-gray-900 dark:text-white">{activeSheet}</span>
             </span>
             <span>
               Columns: <span className="font-semibold text-gray-900 dark:text-white">{currentHeaders.length}</span>
             </span>
             {currentHeaders.length > 15 && (
               <span className="text-blue-600 dark:text-blue-400 text-xs">
                 ← Scroll horizontally to see all columns →
               </span>
             )}
             <span className="text-gray-500 text-xs">
               Table width: {getTotalTableWidth()}px
             </span>
           </div>
        </div>
      </div>
    </div>
  );
}
