'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTabManager } from '../hooks/useTabManager';
import { useGlobalTabs } from '../contexts/GlobalTabContext';
import { useEntitySync } from '../contexts/EntitySyncContext';
import { useSidebarPreferences } from '../contexts/SidebarPreferencesContext';
import { 
  RiDashboardLine, 
  RiBankLine, 
  RiPriceTag3Line,
  RiMenuFoldLine,
  RiMenuUnfoldLine,
  RiFileLine,
  RiBarChartLine,
  RiCloseLine,
  RiFolderLine,
  RiGitMergeLine
} from 'react-icons/ri';


interface SidebarProps {
  onItemClick?: () => void;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onMobileToggle?: () => void;
}

export default function Sidebar({ onItemClick, onToggleCollapse, isMobileOpen = false, onMobileToggle }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const router = useRouter();
  const { openDashboard, openEntities, openBanks, openTags, openFiles, openReports, openFileMatching, openEntityTab } = useTabManager();
  const { activeTabId, tabs } = useGlobalTabs();
  const { entities, refreshEntities } = useEntitySync();
  const { isEntityInSidebar } = useSidebarPreferences();

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize entities on component mount
  useEffect(() => {
    refreshEntities();
    
    // Set up interval to refresh entities every 30 seconds
    const interval = setInterval(refreshEntities, 30000);
    return () => clearInterval(interval);
  }, [refreshEntities]);

  const staticMenuItems = [
    { 
      name: 'Dashboard', 
      path: '/dashboard', 
      icon: RiDashboardLine,
      description: 'Overview and analytics',
      isEntity: false,
      entityId: undefined
    },
    { 
      name: 'Entities', 
      path: '/entities', 
      icon: RiFolderLine,
      description: 'Manage entities, files and folders',
      isEntity: false,
      entityId: undefined
    },
    { 
      name: 'Banks', 
      path: '/banks', 
      icon: RiBankLine,
      description: 'Bank overview and management',
      isEntity: false,
      entityId: undefined
    },
    { 
      name: 'Tags', 
      path: '/tags', 
      icon: RiPriceTag3Line,
      description: 'Organize with tags',
      isEntity: false,
      entityId: undefined
    },
    { 
      name: 'Files', 
      path: '/files', 
      icon: RiFileLine,
      description: 'Upload and manage files',
      isEntity: false,
      entityId: undefined
    },
    { 
      name: 'Reports', 
      path: '/reports', 
      icon: RiBarChartLine,
      description: 'Financial reports and statements',
      isEntity: false,
      entityId: undefined
    },
    { 
      name: 'File Matching', 
      path: '/file-matching', 
      icon: RiGitMergeLine,
      description: 'Compare and match CSV files',
      isEntity: false,
      entityId: undefined
    },
  ];

  // Create dynamic entity menu items - only show entities that are selected for sidebar
  const entityMenuItems = entities
    .filter(entity => isEntityInSidebar(entity.id))
    .map(entity => ({
      name: entity.name,
      path: `/entity/${entity.id}`,
      icon: RiFileLine, // You can use a different icon for entities
      description: entity.description || 'Entity files',
      isEntity: true,
      entityId: entity.id
    }));

  // Combine static and dynamic menu items
  const menuItems = [...staticMenuItems, ...entityMenuItems];

  const handleItemClick = (action: () => void) => {
    action();
    if (onItemClick) {
      onItemClick();
    }
    // Close mobile sidebar when item is clicked
    if (isMobile && onMobileToggle) {
      onMobileToggle();
    }
  };

  const handleToggleCollapse = () => {
    setIsTransitioning(true);
    setIsCollapsed(!isCollapsed);
    
    // Call parent callback if provided
    if (onToggleCollapse) {
      onToggleCollapse();
    }
    
    // Reset transition state after animation completes
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onMobileToggle}
        />
      )}
      
      <div 
        className={`
          bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 shadow-xl border-r border-gray-200/50 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 h-screen 
          transition-all duration-300 ease-out backdrop-blur-sm m-0 p-0
          ${isMobile 
            ? `fixed top-0 left-0 z-50 transform transition-transform duration-300 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} w-72 sm:w-80`
            : `absolute top-0 left-0 ${isCollapsed ? 'w-16' : 'w-64'}`
          }
          ${isTransitioning ? 'pointer-events-none' : ''}
        `}
      >
        {/* Header with Logo */}
        <div className="px-4 py-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Enhanced Logo */}
              <div className="relative">
                <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-all duration-200 hover:shadow-xl">
                  <span className="text-white font-bold text-xs">BF</span>
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-white animate-pulse"></div>
              </div>
              {(!isCollapsed || isMobile) && (
                <div className="transform transition-all duration-200 ease-out overflow-hidden">
                  <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    Brmh Fintech
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Financial Platform</p>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {/* Mobile close button */}
              {isMobile && (
                <button
                  onClick={onMobileToggle}
                  className="p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-all duration-200 hover:shadow-md transform hover:scale-105 lg:hidden"
                  aria-label="Close sidebar"
                >
                  <RiCloseLine size={20} className="text-gray-600 dark:text-gray-300" />
                </button>
              )}
              {/* Desktop collapse button */}
              {!isMobile && (
                <button
                  onClick={handleToggleCollapse}
                  className="p-1.5 rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-all duration-200 hover:shadow-md transform hover:scale-105 group"
                  aria-label="Toggle sidebar"
                >
                  <div className="transform transition-transform duration-200 group-hover:rotate-180">
                    {isCollapsed ? <RiMenuUnfoldLine size={16} className="text-gray-600 dark:text-gray-300" /> : <RiMenuFoldLine size={16} className="text-gray-600 dark:text-gray-300" />}
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="mt-6 px-4">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              // Get the active tab type
              const activeTab = tabs.find(tab => tab.id === activeTabId);
              const activeTabType = activeTab?.type;
              
              // Map path to tab type for comparison
              const pathToTypeMap: { [key: string]: string } = {
                '/dashboard': 'dashboard',
                '/entities': 'entities',
                '/banks': 'banks',
                '/tags': 'tags',
                '/files': 'files',
                '/reports': 'reports',
                '/file-matching': 'file-matching'
              };
              
              // Check if this item matches the active tab type
              const itemType = pathToTypeMap[item.path];
              let isActive = false;
              
              if (item.isEntity) {
                // For entity items, check if the active tab is for this entity
                isActive = activeTab?.data?.entityId === item.entityId;
              } else {
                // For static items, check if the active tab type matches
                // BUT if we're in an entity tab, don't highlight the Files item
                if (itemType === 'files' && activeTab?.data?.entityId) {
                  isActive = false; // Don't highlight Files when in an entity tab
                } else {
                  isActive = activeTabType === itemType;
                }
              }
              const isHovered = hoveredItem === item.path;
              
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    if (item.isEntity && item.entityId) {
                      // Handle entity click
                      handleItemClick(() => openEntityTab(item.entityId!, item.name));
                    } else {
                      // Handle static menu items
                      const actions: { [key: string]: () => void } = {
                        '/dashboard': () => { openDashboard(); router.replace('/dashboard', { scroll: false }); },
                        '/entities': () => { openEntities(); router.replace('/entities', { scroll: false }); },
                        '/banks': () => { openBanks(); router.replace('/banks', { scroll: false }); },
                        '/tags': () => { openTags(); router.replace('/tags', { scroll: false }); },
                        '/files': () => { openFiles(); router.replace('/files', { scroll: false }); },
                        '/reports': () => { openReports(); router.replace('/reports', { scroll: false }); },
                        '/file-matching': () => { openFileMatching(); router.replace('/file-matching', { scroll: false }); },
                      };
                      handleItemClick(actions[item.path] || (() => {}));
                    }
                  }}
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`
                    relative flex items-center p-4 rounded-2xl transition-all duration-200 ease-out group w-full
                    transform hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]
                    ${isActive 
                      ? 'bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-purple-900/50 dark:to-purple-800/50 text-gray-900 dark:text-gray-100 shadow-md border border-purple-200/50 dark:border-purple-600/50' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80 hover:shadow-md border border-transparent hover:border-purple-200/50 dark:hover:border-purple-600/50'
                    }
                    ${isCollapsed && !isMobile ? 'justify-center' : ''}
                  `}
                >
                  {/* Active indicator with rounded corners */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-purple-500 to-purple-600 rounded-r-full"></div>
                  )}
                  
                  {/* Icon container with enhanced styling */}
                  <div className={`
                    relative flex items-center justify-center w-8 h-8 rounded-xl mr-3 transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg transform scale-110 shadow-purple-500/25' 
                      : 'text-gray-500 dark:text-gray-400 group-hover:text-purple-600 bg-gray-100/50 dark:bg-gray-700/50 group-hover:bg-purple-50 dark:group-hover:bg-purple-900/50'
                    }
                    ${isCollapsed && !isMobile ? 'mr-0' : ''}
                  `}>
                    <Icon size={16} className="transition-all duration-200 group-hover:scale-110 group-hover:rotate-3 drop-shadow-sm" />
                    
                    {/* Hover effect ring - only on desktop */}
                    {isHovered && !isActive && !isMobile && (
                      <div className="absolute inset-0 rounded-xl border-2 border-purple-200/50 animate-ping"></div>
                    )}
                  </div>
                  
                  {(!isCollapsed || isMobile) && (
                    <div className="flex-1 min-w-0 transform transition-all duration-200 overflow-hidden text-left w-full">
                      <div className="font-semibold text-sm transition-colors duration-200 whitespace-nowrap w-full">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate transition-colors duration-200 group-hover:text-gray-600 dark:group-hover:text-gray-300 whitespace-nowrap w-full">
                        {item.description}
                      </div>
                    </div>
                  )}
                  
                  {/* Subtle hover indicator - only on desktop */}
                  {isHovered && !isActive && !isMobile && (
                    <div className="absolute right-2 w-1.5 h-1.5 bg-purple-400 rounded-full opacity-60 animate-pulse"></div>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Bottom section with user info or additional features */}
        <div className="absolute bottom-6 left-4 right-4">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-2xl p-4 border border-gray-200/50 dark:border-gray-600/50 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">U</span>
              </div>
              {(!isCollapsed || isMobile) && (
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">User Account</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Premium Member</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 