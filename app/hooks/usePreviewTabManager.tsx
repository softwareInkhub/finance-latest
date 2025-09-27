'use client';
import { useCallback } from 'react';
import { useGlobalTabs } from '../contexts/GlobalTabContext';
import ExcelPreview from '../components/ExcelPreview';

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
      type: 'files',
      component: (
        <div className="h-full">
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
    
    // For other file types, open in new tab/window
    if (file.downloadUrl) {
      window.open(file.downloadUrl, '_blank');
    }
  }, [openExcelPreview]);

  return {
    openExcelPreview,
    openFilePreview
  };
};
