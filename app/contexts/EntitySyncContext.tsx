'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface EntityItem {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

interface EntitySyncContextType {
  entities: EntityItem[];
  addEntity: (entity: EntityItem) => void;
  removeEntity: (entityId: string) => void;
  updateEntities: (entities: EntityItem[]) => void;
  refreshEntities: () => Promise<void>;
}

const EntitySyncContext = createContext<EntitySyncContextType | undefined>(undefined);

interface EntitySyncProviderProps {
  children: ReactNode;
}

export const EntitySyncProvider: React.FC<EntitySyncProviderProps> = ({ children }) => {
  const [entities, setEntities] = useState<EntityItem[]>([]);

  const addEntity = useCallback((entity: EntityItem) => {
    setEntities(prev => {
      // Check if entity already exists
      const exists = prev.some(e => e.id === entity.id);
      if (exists) return prev;
      return [...prev, entity];
    });
  }, []);

  const removeEntity = useCallback((entityId: string) => {
    setEntities(prev => prev.filter(entity => entity.id !== entityId));
  }, []);

  const updateEntities = useCallback((newEntities: EntityItem[]) => {
    setEntities(newEntities);
  }, []);

  const refreshEntities = useCallback(async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const response = await fetch(`/api/folders?userId=${userId}&parentId=ROOT`);
      if (response.ok) {
        const data = await response.json();
        setEntities(data.folders || []);
      }
    } catch (error) {
      console.error('Failed to refresh entities:', error);
    }
  }, []);

  const value: EntitySyncContextType = {
    entities,
    addEntity,
    removeEntity,
    updateEntities,
    refreshEntities
  };

  return (
    <EntitySyncContext.Provider value={value}>
      {children}
    </EntitySyncContext.Provider>
  );
};

export const useEntitySync = () => {
  const context = useContext(EntitySyncContext);
  if (context === undefined) {
    throw new Error('useEntitySync must be used within an EntitySyncProvider');
  }
  return context;
};

