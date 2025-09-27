'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { RiFileExcelLine, RiTableLine, RiDownloadLine, RiCloseLine } from 'react-icons/ri';

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
}

export default function ExcelPreview({ file, onClose }: ExcelPreviewProps) {
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<number>(10000); // High limit to show most files completely
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const [isResizing, setIsResizing] = useState<number | null>(null);

  const loadExcelData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!file || !file.id || !file.name) {
        throw new Error('Invalid file data');
      }

      if (!file.downloadUrl) {
        throw new Error('No download URL available. Please ensure the file is properly uploaded and accessible.');
      }

      // Fetch the Excel file
      const response = await fetch(file.downloadUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }

      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Extract sheet names
      const sheetNames = workbook.SheetNames;
      
      // Extract data from each sheet
      const sheets: { [key: string]: unknown[][] } = {};
      const headers: { [key: string]: string[] } = {};

      sheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        // Convert to 2D array
        const dataArray = jsonData as unknown[][];
        sheets[sheetName] = dataArray;
        
        // Extract headers (first row)
        headers[sheetName] = dataArray.length > 0 ? dataArray[0].map(String) : [];
      });

      setExcelData({
        sheetNames,
        sheets,
        headers
      });

      // Set first sheet as active
      if (sheetNames.length > 0) {
        setActiveSheet(sheetNames[0]);
      }

    } catch (err) {
      console.error('Error loading Excel file:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Excel file');
    } finally {
      setLoading(false);
    }
  }, [file]);

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

  const getColumnWidth = useCallback((columnIndex: number): number => {
    const key = `${activeSheet}-${columnIndex}`;
    return columnWidths[key] || 100; // Even smaller default width for more columns
  }, [columnWidths, activeSheet]);

  const getTotalTableWidth = useCallback((): number => {
    if (!currentHeaders.length) return 100;
    const rowNumberWidth = 48; // Width of row number column
    const totalColumnWidth = currentHeaders.reduce((sum, _, index) => {
      return sum + getColumnWidth(index);
    }, 0);
    return rowNumberWidth + totalColumnWidth;
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
      const newWidth = Math.max(30, startWidth + (e.clientX - startX));
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

  const downloadExcel = () => {
    if (file.downloadUrl) {
      const link = document.createElement('a');
      link.href = file.downloadUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const resetColumnWidths = () => {
    setColumnWidths({});
  };

  const fitAllColumns = () => {
    if (!currentHeaders.length) return;
    
    // Calculate optimal width for each column
    const containerWidth = 1400; // Approximate container width
    const rowNumberWidth = 48; // Width of row number column
    const availableWidth = containerWidth - rowNumberWidth;
    const columnWidth = Math.max(80, Math.floor(availableWidth / currentHeaders.length));
    
    const newWidths: { [key: string]: number } = {};
    currentHeaders.forEach((_, index) => {
      const key = `${activeSheet}-${index}`;
      newWidths[key] = columnWidth;
    });
    
    setColumnWidths(newWidths);
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
    <div className="h-full flex flex-col">
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
      <div className="flex items-center justify-between p-4 border-b-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
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
        <div className="flex items-center gap-2">
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

      {/* Data Table */}
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-900">
        {currentHeaders.length > 0 ? (
          <div className="overflow-auto h-full" style={{ overflowX: 'auto', overflowY: 'auto' }}>
            <table className="border-collapse border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" style={{ tableLayout: 'fixed', width: `${getTotalTableWidth()}px` }}>
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
                      className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 relative group"
                      style={{ 
                        backgroundColor: '#f3f4f6',
                        borderColor: '#d1d5db',
                        fontSize: '11px',
                        fontWeight: '600',
                        width: getColumnWidth(index)
                      }}
                    >
                      <div className="truncate" title={header || `Column ${index + 1}`}>
                        {header || `Column ${index + 1}`}
                      </div>
                      {/* Resize handle */}
                      <div
                        className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        onMouseDown={(e) => handleMouseDown(e, index)}
                        style={{
                          backgroundColor: isResizing === index ? '#3b82f6' : 'transparent',
                          right: '-1px'
                        }}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rowIndex) => (
                  <tr 
                    key={rowIndex} 
                    className="hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    style={{ 
                      backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#fafafa'
                    }}
                  >
                    {/* Row number */}
                    <td
                      className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 w-12"
                      style={{ 
                        backgroundColor: '#f9fafb',
                        borderColor: '#d1d5db',
                        fontSize: '10px',
                        fontWeight: '500'
                      }}
                    >
                      {rowIndex + 2}
                    </td>
                    {currentHeaders.map((_, colIndex) => (
                      <td
                        key={colIndex}
                        className={`border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 ${getCellAlignment(row[colIndex])}`}
                        style={{ 
                          borderColor: '#d1d5db',
                          fontSize: '12px',
                          lineHeight: '1.4',
                          width: getColumnWidth(colIndex)
                        }}
                      >
                        <div className="truncate" title={formatCellValue(row[colIndex])}>
                          {formatCellValue(row[colIndex])}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
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
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
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
           <div className="flex items-center gap-4">
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
