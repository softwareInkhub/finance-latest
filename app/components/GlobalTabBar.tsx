'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalTabs } from '../contexts/GlobalTabContext';
import { 
  RiCloseLine, 
  RiAddLine, 
  RiMoreLine, 
  RiFileCopyLine,
  RiCloseCircleLine,
  RiArrowRightSLine
} from 'react-icons/ri';

interface GlobalTabBarProps {
  className?: string;
}

export const GlobalTabBar: React.FC<GlobalTabBarProps> = ({ className = '' }) => {
  const router = useRouter();
  const { 
    tabs, 
    activeTabId, 
    setActiveTab, 
    closeTab, 
    closeAllTabs, 
    closeOtherTabs, 
    closeTabsToRight, 
    duplicateTab 
  } = useGlobalTabs();
  
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    tabId: string;
  }>({ visible: false, x: 0, y: 0, tabId: '' });
  
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [dragOverTab, setDragOverTab] = useState<string | null>(null);
  const tabRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(prev => ({ ...prev, visible: false }));
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    
    // Update URL to match the active tab
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      const pathMap: { [key: string]: string } = {
        'dashboard': '/dashboard',
        'entities': '/entities',
        'banks': '/banks',
        'tags': '/tags',
        'files': '/files',
        'reports': '/reports',
        'transactions': '/transactions'
      };
      
      const path = pathMap[tab.type] || '/dashboard';
      router.replace(path, { scroll: false });
    }
  };

  const handleCloseClick = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      tabId
    });
  };

  const handleContextMenuAction = (action: string) => {
    const { tabId } = contextMenu;
    switch (action) {
      case 'close':
        closeTab(tabId);
        break;
      case 'closeOthers':
        closeOtherTabs(tabId);
        break;
      case 'closeToRight':
        closeTabsToRight(tabId);
        break;
      case 'duplicate':
        duplicateTab(tabId);
        break;
      case 'closeAll':
        closeAllTabs();
        break;
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedTab(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    if (draggedTab && draggedTab !== tabId) {
      setDragOverTab(tabId);
    }
  };

  const handleDragEnd = () => {
    setDraggedTab(null);
    setDragOverTab(null);
  };

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    if (draggedTab && draggedTab !== targetTabId) {
      // Reorder tabs logic would go here
      // For now, we'll just reset the drag state
    }
    handleDragEnd();
  };

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`} style={{ lineHeight: 1 }}>
      {/* Tab Bar */}
      <div className="flex items-center bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 py-1">
        <div className="flex-1 flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              ref={(el) => { tabRefs.current[tab.id] = el; }}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragOver={(e) => handleDragOver(e, tab.id)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, tab.id)}
              className={`
                flex items-center min-w-0 max-w-xs px-3 py-0.5 border-r border-gray-200 dark:border-gray-700 cursor-pointer
                transition-all duration-200 ease-in-out group relative
                ${activeTabId === tab.id 
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
                ${draggedTab === tab.id ? 'opacity-50' : ''}
                ${dragOverTab === tab.id ? 'border-l-2 border-blue-500' : ''}
              `}
              onClick={() => handleTabClick(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
            >
              {/* Tab Icon */}
              {tab.icon && (
                <div className="mr-1 flex-shrink-0">
                  {tab.icon}
                </div>
              )}
              
              {/* Tab Title */}
              <span className="truncate text-xs font-medium flex-1">
                {tab.title}
              </span>
              
              {/* Close Button */}
              {tab.closable !== false && (
                <button
                  onClick={(e) => handleCloseClick(e, tab.id)}
                  className={`
                    ml-1 p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200
                    hover:bg-gray-200 dark:hover:bg-gray-600 flex-shrink-0
                    ${activeTabId === tab.id ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}
                  `}
                  title="Close tab"
                >
                  <RiCloseLine className="w-3 h-3" />
                </button>
              )}
              
              {/* More Options Button */}
              <button
                onClick={(e) => handleContextMenu(e, tab.id)}
                className="ml-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-200 dark:hover:bg-gray-600 flex-shrink-0"
                title="More options"
              >
                <RiMoreLine className="w-3 h-3 text-gray-400 dark:text-gray-500" />
              </button>
            </div>
          ))}
        </div>
        
        {/* Add Tab Button */}
        <button
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
          title="Add new tab"
          onClick={() => {
            // This would typically open a new tab or show a tab creation dialog
            console.log('Add new tab clicked');
          }}
        >
          <RiAddLine className="w-4 h-4" />
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-48"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            onClick={() => handleContextMenuAction('close')}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          >
            <RiCloseLine className="w-4 h-4 mr-2" />
            Close Tab
          </button>
          <button
            onClick={() => handleContextMenuAction('duplicate')}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          >
            <RiFileCopyLine className="w-4 h-4 mr-2" />
            Duplicate Tab
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
          <button
            onClick={() => handleContextMenuAction('closeOthers')}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          >
            <RiCloseCircleLine className="w-4 h-4 mr-2" />
            Close Other Tabs
          </button>
          <button
            onClick={() => handleContextMenuAction('closeToRight')}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          >
            <RiArrowRightSLine className="w-4 h-4 mr-2" />
            Close Tabs to the Right
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
          <button
            onClick={() => handleContextMenuAction('closeAll')}
            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
          >
            <RiCloseCircleLine className="w-4 h-4 mr-2" />
            Close All Tabs
          </button>
        </div>
      )}
    </div>
  );
};

