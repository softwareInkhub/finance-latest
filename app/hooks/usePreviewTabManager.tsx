'use client';
import React, { useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useGlobalTabs } from '../contexts/GlobalTabContext';
import ExcelPreview from '../components/ExcelPreview';
// FilePreview is defined in files/page.tsx, we'll create a simple CSV preview component

export const usePreviewTabManager = () => {
  const { addTab, setActiveTab } = useGlobalTabs();

  const openExcelPreview = useCallback((file: { id: string; name: string; downloadUrl?: string }) => {
    // Add null checks
    if (!file || !file.id || !file.name) {
      console.error('Invalid file data for Excel preview:', file);
      return;
    }

    const tabId = `preview-${file.id}`;
    
    addTab({
      id: tabId,
      title: `Preview: ${file.name}`,
      type: 'custom', // Use 'custom' type to avoid switching to Files section
      component: (
        <div className="h-full max-h-[85vh]">
          <ExcelPreview 
            file={file} 
            onClose={() => {
              // Tab will be closed by the global tab system
            }} 
          />
        </div>
      ),
      data: { fileId: file.id, fileName: file.name, previewType: 'excel' }
    });

    setActiveTab(tabId);
  }, [addTab, setActiveTab]);

  const openCsvPreview = useCallback((file: { id: string; name: string; downloadUrl?: string }) => {
    // Add null checks
    if (!file || !file.id || !file.name) {
      console.error('Invalid file data for CSV preview:', file);
      return;
    }

    const tabId = `preview-${file.id}`;
    
    // Create a CSV preview component that uses ExcelPreview for full Excel-like functionality
    const CsvPreviewComponent = () => {
      const [excelData, setExcelData] = React.useState<{
        sheetNames: string[];
        sheets: { [key: string]: unknown[][] };
        headers: { [key: string]: string[] };
      } | null>(null);
      const [loading, setLoading] = React.useState(true);
      const [error, setError] = React.useState<string | null>(null);

      React.useEffect(() => {
        const loadCsvData = async () => {
          try {
            setLoading(true);
            setError(null);

            // Get download URL from BRMH Drive API
            const userId = localStorage.getItem('userId');
            if (!userId) {
              throw new Error('User not authenticated');
            }

            const response = await fetch(`/api/files/download?userId=${userId}&fileId=${file.id}`);
            if (!response.ok) {
              throw new Error('Failed to get download URL');
            }

            const result = await response.json();
            if (result.error) {
              throw new Error(result.error);
            }

            // Fetch CSV content
            const csvResponse = await fetch(result.downloadUrl);
            if (!csvResponse.ok) {
              throw new Error('Failed to fetch CSV file');
            }

            const csvText = await csvResponse.text();

            // Robust CSV parsing using XLSX (auto-detects delimiter, handles quotes)
            const workbook = XLSX.read(csvText, { type: 'string' });
            const sheetName = workbook.SheetNames[0] || 'Sheet1';
            const worksheet = workbook.Sheets[sheetName];
            const dataArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as unknown[][];

            const sheets = { [sheetName]: Array.isArray(dataArray) ? dataArray : [] };
            const headers = { [sheetName]: dataArray.length > 0 ? dataArray[0].map(String) : [] };

            setExcelData({
              sheetNames: [sheetName],
              sheets,
              headers
            });
          } catch (err) {
            console.error('Error loading CSV:', err);
            setError(err instanceof Error ? err.message : 'Failed to load CSV file');
          } finally {
            setLoading(false);
          }
        };

        loadCsvData();
      }, []); // Remove file.id from dependency array since it's from outer scope

      if (loading) {
        return (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        );
      }

      if (error) {
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-red-500 text-center">
              <p className="text-lg font-semibold mb-2">Error loading file</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        );
      }

      if (!excelData) {
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 text-center">
              <p className="text-lg font-semibold mb-2">No data found</p>
              <p className="text-sm">The CSV file appears to be empty</p>
            </div>
          </div>
        );
      }

      // Use ExcelPreview component for full Excel-like functionality
      return (
        <div className="h-full max-h-[85vh]">
          <ExcelPreview 
            file={{
              id: file.id,
              name: file.name,
              downloadUrl: file.downloadUrl
            }}
            onClose={() => {
              // Tab will be closed by the global tab system
            }}
            // Pass the parsed CSV data directly to ExcelPreview
            excelData={excelData}
            // Enable slicing for CSV files
            enableSlicing={true}
          />
        </div>
      );
    };
    
    addTab({
      id: tabId,
      title: `Preview: ${file.name}`,
      type: 'custom', // Use 'custom' type to avoid switching to Files section
      component: (
        <div className="h-full max-h-[85vh]">
          <CsvPreviewComponent />
        </div>
      ),
      data: { fileId: file.id, fileName: file.name, previewType: 'csv' }
    });

    setActiveTab(tabId);
  }, [addTab, setActiveTab]);

  const openFilePreview = useCallback((file: { id: string; name: string; downloadUrl?: string; mimeType?: string }) => {
    // Add null checks
    if (!file || !file.id || !file.name) {
      console.error('Invalid file data:', file);
      return;
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    // Check if it's an Excel file
    if (fileExtension === 'xlsx' || fileExtension === 'xls' || 
        file.mimeType?.includes('spreadsheet') || 
        file.mimeType?.includes('excel')) {
      openExcelPreview(file);
      return;
    }
    
    // Check if it's a CSV file
    if (fileExtension === 'csv' || 
        file.mimeType?.includes('csv') ||
        file.mimeType?.includes('text/csv')) {
      openCsvPreview(file);
      return;
    }
    
    // For other file types, open in new tab/window
    if (file.downloadUrl) {
      window.open(file.downloadUrl, '_blank');
    }
  }, [openExcelPreview, openCsvPreview]);

  return {
    openExcelPreview,
    openCsvPreview,
    openFilePreview
  };
};
