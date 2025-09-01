'use client';
import React from 'react';
import { useTabManager } from '../hooks/useTabManager';
import { useGlobalTabs } from '../contexts/GlobalTabContext';

export default function DemoTabsPage() {
  const { 
    openDashboard, 
    openTransactions, 
    openReports, 
    openFiles, 
    openBanks, 
    openTags,
    openTab 
  } = useTabManager();
  
  const { tabs, activeTabId, closeAllTabs } = useGlobalTabs();

  const openCustomTab = () => {
    openTab({
      id: `custom-${Date.now()}`,
      title: `Custom Tab ${tabs.length + 1}`,
      type: 'custom',
      component: (
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Custom Tab Content</h2>
          <p className="text-gray-600 dark:text-gray-400">
            This is a custom tab that was opened programmatically. You can create tabs for any content!
          </p>
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200">Features:</h3>
            <ul className="mt-2 text-blue-700 dark:text-blue-300 text-sm">
              <li>• Close tabs with the X button</li>
              <li>• Right-click for context menu</li>
              <li>• Drag and drop to reorder</li>
              <li>• Duplicate tabs</li>
              <li>• Close other tabs</li>
            </ul>
          </div>
        </div>
      )
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Global Tab System Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This demonstrates the global tab system similar to browser tabs or Excel sheets. 
          Each section opens in a separate tab that can be managed independently.
          <br />
          <span className="text-green-600 font-semibold">✅ Now using your real pages!</span>
        </p>
      </div>

      {/* Tab Statistics */}
      <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-3">Current Tab Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{tabs.length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Tabs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {activeTabId ? 'Active' : 'None'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Active Tab</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {tabs.filter(t => t.type === 'banks').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Bank Tabs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {tabs.filter(t => t.type === 'transactions').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Transaction Tabs</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <button
            onClick={openDashboard}
            className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <div className="font-semibold">Dashboard</div>
            <div className="text-sm opacity-90">Overview & Analytics</div>
          </button>
          
          <button
            onClick={openTransactions}
            className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <div className="font-semibold">Transactions</div>
            <div className="text-sm opacity-90">View & Manage</div>
          </button>
          
          <button
            onClick={openReports}
            className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <div className="font-semibold">Reports</div>
            <div className="text-sm opacity-90">Financial Reports</div>
          </button>
          
          <button
            onClick={openFiles}
            className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <div className="font-semibold">Files</div>
            <div className="text-sm opacity-90">Upload & Manage</div>
          </button>
          
          <button
            onClick={openBanks}
            className="p-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <div className="font-semibold">Banks</div>
            <div className="text-sm opacity-90">Bank Management</div>
          </button>
          
          <button
            onClick={openTags}
            className="p-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <div className="font-semibold">Tags</div>
            <div className="text-sm opacity-90">Organize Data</div>
          </button>
          
          <button
            onClick={openCustomTab}
            className="p-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <div className="font-semibold">Custom Tab</div>
            <div className="text-sm opacity-90">Dynamic Content</div>
          </button>
          
          <button
            onClick={closeAllTabs}
            className="p-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <div className="font-semibold">Close All</div>
            <div className="text-sm opacity-90">Clear All Tabs</div>
          </button>
        </div>
      </div>

      {/* Tab Management Tips */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-3">
          💡 Tab Management Tips
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-700 dark:text-yellow-300">
          <div>
            <h4 className="font-semibold mb-2">Mouse Actions:</h4>
            <ul className="space-y-1">
              <li>• Click tab to switch</li>
              <li>• Click X to close</li>
              <li>• Right-click for menu</li>
              <li>• Drag to reorder</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Context Menu Options:</h4>
            <ul className="space-y-1">
              <li>• Close Tab</li>
              <li>• Duplicate Tab</li>
              <li>• Close Other Tabs</li>
              <li>• Close Tabs to Right</li>
              <li>• Close All Tabs</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Current Tabs List */}
      {tabs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Currently Open Tabs</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {tabs.map((tab, index) => (
                <div
                  key={tab.id}
                  className={`p-4 flex items-center justify-between ${
                    activeTabId === tab.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="font-medium">{tab.title}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {tab.type}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Tab {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
