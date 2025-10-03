'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

export interface GlobalTab {
  id: string;
  title: string;
  type: 'dashboard' | 'entities' | 'transactions' | 'reports' | 'files' | 'banks' | 'tags' | 'accounts' | 'statements' | 'file-matching' | 'custom';
  component: ReactNode;
  closable?: boolean;
  data?: Record<string, unknown>; // Additional data for the tab
  icon?: ReactNode;
}

interface GlobalTabContextType {
  tabs: GlobalTab[];
  activeTabId: string | null;
  addTab: (tab: GlobalTab) => void;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (tabId: string) => void;
  closeTabsToRight: (tabId: string) => void;
  duplicateTab: (tabId: string) => void;
}

const GlobalTabContext = createContext<GlobalTabContextType | undefined>(undefined);

export const useGlobalTabs = () => {
  const context = useContext(GlobalTabContext);
  if (!context) {
    throw new Error('useGlobalTabs must be used within a GlobalTabProvider');
  }
  return context;
};

interface GlobalTabProviderProps {
  children: ReactNode;
}

export const GlobalTabProvider: React.FC<GlobalTabProviderProps> = ({ children }) => {
  const [tabs, setTabs] = useState<GlobalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const addTab = useCallback((tab: GlobalTab) => {
    setTabs(prevTabs => {
      // Check if tab already exists
      const existingTabIndex = prevTabs.findIndex(t => t.id === tab.id);
      if (existingTabIndex !== -1) {
        // Preserve existing component instance to avoid remounting and API re-fetches
        const existing = prevTabs[existingTabIndex];
        const merged: GlobalTab = {
          ...existing,
          ...tab,
          component: existing.component ?? tab.component,
        };
        const newTabs = [...prevTabs];
        newTabs[existingTabIndex] = merged;
        setActiveTabId(tab.id);
        return newTabs;
      }
      // Add new tab
      const newTabs = [...prevTabs, tab];
      setActiveTabId(tab.id);
      return newTabs;
    });
  }, []);

  const removeTab = useCallback((tabId: string) => {
    setTabs(prevTabs => {
      const newTabs = prevTabs.filter(tab => tab.id !== tabId);
      
      // If we're closing the active tab, switch to another tab
      if (activeTabId === tabId) {
        const currentIndex = prevTabs.findIndex(tab => tab.id === tabId);
        if (newTabs.length > 0) {
          // Switch to the next tab, or the previous one if we're at the end
          const nextIndex = currentIndex < newTabs.length ? currentIndex : currentIndex - 1;
          setActiveTabId(newTabs[nextIndex]?.id || null);
        } else {
          setActiveTabId(null);
        }
      }
      
      return newTabs;
    });
  }, [activeTabId]);

  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const closeTab = useCallback((tabId: string) => {
    removeTab(tabId);
  }, [removeTab]);

  const closeAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
  }, []);

  const closeOtherTabs = useCallback((tabId: string) => {
    setTabs(prevTabs => prevTabs.filter(tab => tab.id === tabId));
    setActiveTabId(tabId);
  }, []);

  const closeTabsToRight = useCallback((tabId: string) => {
    setTabs(prevTabs => {
      const currentIndex = prevTabs.findIndex(tab => tab.id === tabId);
      return prevTabs.slice(0, currentIndex + 1);
    });
  }, []);

  const duplicateTab = useCallback((tabId: string) => {
    setTabs(prevTabs => {
      const originalTab = prevTabs.find(tab => tab.id === tabId);
      if (!originalTab) return prevTabs;
      
      const newTab: GlobalTab = {
        ...originalTab,
        id: `${originalTab.id}-copy-${Date.now()}`,
        title: `${originalTab.title} (Copy)`,
      };
      
      setActiveTabId(newTab.id);
      return [...prevTabs, newTab];
    });
  }, []);

  // Initialize with Dashboard tab only when landing on "/" or "/dashboard"
  useEffect(() => {
    if (isInitialized || tabs.length > 0) return;
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    const top = (path || '/').split('?')[0].split('#')[0].split('/').filter(Boolean)[0] || '';
    const shouldOpenDashboard = top === '' || top === 'dashboard' || top === 'login-signup';
    setIsInitialized(true);
    if (!shouldOpenDashboard) return;
    import('../dashboard/page').then(({ default: DashboardPage }) => {
      const dashboardTab: GlobalTab = {
        id: 'dashboard',
        title: 'Dashboard',
        type: 'dashboard',
        component: <DashboardPage />,
        closable: false
      };
      addTab(dashboardTab);
    });
  }, [isInitialized, tabs.length, addTab]);

  const value: GlobalTabContextType = {
    tabs,
    activeTabId,
    addTab,
    removeTab,
    setActiveTab,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    closeTabsToRight,
    duplicateTab,
  };

  return (
    <GlobalTabContext.Provider value={value}>
      {children}
    </GlobalTabContext.Provider>
  );
};
