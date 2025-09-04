'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useGlobalTabs } from '../contexts/GlobalTabContext';

export const GlobalTabContent: React.FC = () => {
  const { tabs, activeTabId } = useGlobalTabs();

  // Keep a cache of mounted tabs so they mount once and persist
  const [mountedTabIds, setMountedTabIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (activeTabId) {
      setMountedTabIds(prev => {
        if (prev.has(activeTabId)) return prev;
        const next = new Set(prev);
        next.add(activeTabId);
        return next;
      });
    }
  }, [activeTabId]);

  const tabsToRender = useMemo(() => tabs.filter(t => mountedTabIds.has(t.id)), [tabs, mountedTabIds]);

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {!activeTabId ? (
        <div className="flex items-center justify-center h-full p-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/20 dark:to-purple-800/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No tabs open</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Open a section from the sidebar to get started with your financial data</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">📊 Dashboard</div>
                <div className="text-gray-500 dark:text-gray-400">View analytics and summaries</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">🏦 Banks</div>
                <div className="text-gray-500 dark:text-gray-400">Manage bank accounts</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">🏷️ Tags</div>
                <div className="text-gray-500 dark:text-gray-400">Organize transactions</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">📁 Files</div>
                <div className="text-gray-500 dark:text-gray-400">Upload statements</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        tabsToRender.map(tab => (
          <div key={tab.id} className={`h-full ${tab.id === activeTabId ? 'block' : 'hidden'}`}>
            <div className="h-full overflow-y-auto">{tab.component}</div>
          </div>
        ))
      )}
    </div>
  );
};
