'use client';
import React, { useState } from 'react';
import { RiUploadLine, RiSettingsLine } from 'react-icons/ri';
import EntityFilesGrid from './EntityFilesGrid';
import UnifiedUploadModal from './Modals/UnifiedUploadModal';
import DebugEntityTransactions from './DebugEntityTransactions';
import { useGlobalTabs } from '../contexts/GlobalTabContext';

interface EntityTabContentProps {
  entityName: string;
  tabId: string;
}

export default function EntityTabContent({ entityName, tabId }: EntityTabContentProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const { addTab } = useGlobalTabs();

  const handleUploadSuccess = () => {
    setRefreshKey(Date.now());
    setShowUploadModal(false);
  };

  const handleOpenPreview = (previewData: { 
    open: boolean; 
    headers: string[]; 
    rows: Array<Record<string, string>>; 
    fileId: string; 
    name: string 
  }) => {
    // Open a new tab for the file preview
    const previewTabId = `preview-${previewData.fileId}`;
    
    addTab({
      id: previewTabId,
      title: `Preview: ${previewData.name}`,
      type: 'custom',
      component: (
        <div className="p-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              File Preview: {previewData.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Showing preview of {previewData.rows.length} rows from {entityName}
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {previewData.headers.map((header, index) => (
                      <th
                        key={index}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {previewData.rows.slice(0, 100).map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      {previewData.headers.map((header, colIndex) => (
                        <td
                          key={colIndex}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                        >
                          {row[header] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewData.rows.length > 100 && (
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing first 100 rows of {previewData.rows.length} total rows
                </p>
              </div>
            )}
          </div>
        </div>
      ),
      closable: true
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{entityName} Files</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage files and data for the {entityName} entity
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
            onClick={() => setShowUploadModal(true)}
          >
            <RiUploadLine className="w-4 h-4" />
            Upload File
          </button>
          <button 
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium flex items-center gap-2"
            onClick={() => {
              // This would open entity settings
              console.log(`Settings for ${entityName}`);
            }}
          >
            <RiSettingsLine className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>
      
      {/* Debug Component - Remove this after debugging */}
      <div className="mb-6">
        <DebugEntityTransactions entityName={entityName} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <EntityFilesGrid 
          entityName={entityName} 
          refreshKey={`${tabId}-${refreshKey}`}
          onOpenPreview={handleOpenPreview}
        />
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UnifiedUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          entityName={entityName}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
