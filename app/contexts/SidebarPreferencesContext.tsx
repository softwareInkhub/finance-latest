'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

interface SidebarPreferencesContextType {
  sidebarEntities: string[]; // Array of entity IDs that should appear in sidebar
  toggleEntityInSidebar: (entityId: string) => void;
  isEntityInSidebar: (entityId: string) => boolean;
  setSidebarEntities: (entityIds: string[]) => void;
}

const SidebarPreferencesContext = createContext<SidebarPreferencesContextType | undefined>(undefined);

interface SidebarPreferencesProviderProps {
  children: ReactNode;
}

export const SidebarPreferencesProvider: React.FC<SidebarPreferencesProviderProps> = ({ children }) => {
  const [sidebarEntities, setSidebarEntitiesState] = useState<string[]>([]);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      const saved = localStorage.getItem(`sidebarEntities_${userId}`);
      if (saved && saved !== 'undefined' && saved !== 'null') {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setSidebarEntitiesState(parsed);
          }
        } catch (error) {
          console.error('Failed to parse sidebar preferences:', error);
          // Clear invalid data
          localStorage.removeItem(`sidebarEntities_${userId}`);
        }
      }
    }
  }, []);

  // Save preferences to localStorage whenever they change (backup)
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId && sidebarEntities.length > 0) {
      localStorage.setItem(`sidebarEntities_${userId}`, JSON.stringify(sidebarEntities));
    }
  }, [sidebarEntities]);

  // Save preferences to localStorage whenever they change
  const setSidebarEntities = useCallback((entityIds: string[]) => {
    setSidebarEntitiesState(entityIds);
    const userId = localStorage.getItem('userId');
    if (userId) {
      localStorage.setItem(`sidebarEntities_${userId}`, JSON.stringify(entityIds));
    }
  }, []);

  const toggleEntityInSidebar = useCallback((entityId: string) => {
    setSidebarEntitiesState((prev: string[]) => {
      const newEntities = prev.includes(entityId) 
        ? prev.filter(id => id !== entityId)
        : [...prev, entityId];
      
      // Save to localStorage immediately
      const userId = localStorage.getItem('userId');
      if (userId) {
        localStorage.setItem(`sidebarEntities_${userId}`, JSON.stringify(newEntities));
      }
      
      return newEntities;
    });
  }, []);

  const isEntityInSidebar = useCallback((entityId: string) => {
    return sidebarEntities.includes(entityId);
  }, [sidebarEntities]);

  const value: SidebarPreferencesContextType = {
    sidebarEntities,
    toggleEntityInSidebar,
    isEntityInSidebar,
    setSidebarEntities
  };

  return (
    <SidebarPreferencesContext.Provider value={value}>
      {children}
    </SidebarPreferencesContext.Provider>
  );
};

export const useSidebarPreferences = () => {
  const context = useContext(SidebarPreferencesContext);
  if (context === undefined) {
    throw new Error('useSidebarPreferences must be used within a SidebarPreferencesProvider');
  }
  return context;
};
