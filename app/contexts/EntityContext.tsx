'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

interface Entity {
  name: string;
  id: string;
  createdAt: string;
}

interface EntityContextType {
  entities: Entity[];
  addEntity: (entity: Entity) => void;
  removeEntity: (entityId: string) => void;
  loadEntities: () => Promise<void>;
  refreshEntities: () => Promise<void>;
}

const EntityContext = createContext<EntityContextType | undefined>(undefined);

export const useEntities = () => {
  const context = useContext(EntityContext);
  if (!context) {
    throw new Error('useEntities must be used within an EntityProvider');
  }
  return context;
};

interface EntityProviderProps {
  children: ReactNode;
}

export const EntityProvider: React.FC<EntityProviderProps> = ({ children }) => {
  const [entities, setEntities] = useState<Entity[]>([]);

  const loadEntities = useCallback(async () => {
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';
      if (!userId) return;
      
      const res = await fetch(`/api/entities/list?userId=${encodeURIComponent(userId)}`, { 
        cache: 'no-store' 
      });
      if (!res.ok) return;
      
      const data = await res.json();
      if (Array.isArray(data.entities)) {
        const entityObjects = data.entities.map((name: string) => ({
          name,
          id: `entity-${name}`,
          createdAt: new Date().toISOString()
        }));
        setEntities(entityObjects);
      }
    } catch (error) {
      console.error('Error loading entities:', error);
    }
  }, []);

  const addEntity = useCallback((entity: Entity) => {
    setEntities(prev => {
      // Check if entity already exists
      if (prev.some(e => e.name === entity.name)) {
        return prev;
      }
      return [...prev, entity];
    });
  }, []);

  const refreshEntities = useCallback(async () => {
    await loadEntities();
  }, [loadEntities]);

  const removeEntity = useCallback((entityId: string) => {
    setEntities(prev => prev.filter(e => e.id !== entityId));
  }, []);

  // Load entities on mount
  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  // Listen for entity changes from other components
  useEffect(() => {
    const handleEntityChange = () => {
      loadEntities();
    };

    window.addEventListener('entityChanged', handleEntityChange);
    return () => window.removeEventListener('entityChanged', handleEntityChange);
  }, [loadEntities]);

  const value: EntityContextType = {
    entities,
    addEntity,
    removeEntity,
    loadEntities,
    refreshEntities
  };

  return (
    <EntityContext.Provider value={value}>
      {children}
    </EntityContext.Provider>
  );
};


