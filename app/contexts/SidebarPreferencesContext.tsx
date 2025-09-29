'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { brmhCrud } from '../api/brmh-client';

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

  // Load preferences from backend (authoritative) on mount; fallback to localStorage
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const load = async () => {
      try {
        const result = await brmhCrud.get('fintech-entety', {
          FilterExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': userId }
        });
        type EntityMeta = { id: string; showInSidebar?: boolean };
        const items = (result.items || []) as EntityMeta[];
        const enabled = items
          .filter((it) => Boolean(it.showInSidebar))
          .map((it) => String(it.id));
        setSidebarEntitiesState(enabled);
        localStorage.setItem(`sidebarEntities_${userId}`, JSON.stringify(enabled));
      } catch {
        // Fallback to localStorage
        const saved = localStorage.getItem(`sidebarEntities_${userId}`);
        if (saved && saved !== 'undefined' && saved !== 'null') {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              setSidebarEntitiesState(parsed);
            }
          } catch (err) {
            console.error('Failed to parse sidebar preferences:', err);
            localStorage.removeItem(`sidebarEntities_${userId}`);
          }
        }
      }
    };

    load();
  }, []);

  // Save preferences to localStorage whenever they change (backup)
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
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
