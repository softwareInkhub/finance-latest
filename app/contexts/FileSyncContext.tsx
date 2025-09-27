'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface FileData {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  parentId: string;
  tags: string[];
  s3Key?: string;
  downloadUrl?: string;
}

interface FileSyncContextType {
  entityFiles: Record<string, FileData[]>; // entityId -> files[]
  addFileToEntity: (entityId: string, file: FileData) => void;
  removeFileFromEntity: (entityId: string, fileId: string) => void;
  updateEntityFiles: (entityId: string, files: FileData[]) => void;
  refreshEntityFiles: (entityId: string) => Promise<void>;
  getEntityFiles: (entityId: string) => FileData[];
}

const FileSyncContext = createContext<FileSyncContextType | undefined>(undefined);

interface FileSyncProviderProps {
  children: ReactNode;
}

export const FileSyncProvider: React.FC<FileSyncProviderProps> = ({ children }) => {
  const [entityFiles, setEntityFiles] = useState<Record<string, FileData[]>>({});

  const addFileToEntity = useCallback((entityId: string, file: FileData) => {
    setEntityFiles(prev => ({
      ...prev,
      [entityId]: [...(prev[entityId] || []), file]
    }));
  }, []);

  const removeFileFromEntity = useCallback((entityId: string, fileId: string) => {
    setEntityFiles(prev => ({
      ...prev,
      [entityId]: (prev[entityId] || []).filter(file => file.id !== fileId)
    }));
  }, []);

  const updateEntityFiles = useCallback((entityId: string, files: FileData[]) => {
    setEntityFiles(prev => ({
      ...prev,
      [entityId]: files
    }));
  }, []);

  const refreshEntityFiles = useCallback(async (entityId: string) => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const response = await fetch(`/api/files?userId=${userId}&parentId=${entityId}&limit=1000`);
      if (response.ok) {
        const data = await response.json();
        updateEntityFiles(entityId, data.files || []);
      }
    } catch (error) {
      console.error('Failed to refresh entity files:', error);
    }
  }, [updateEntityFiles]);

  const getEntityFiles = useCallback((entityId: string) => {
    return entityFiles[entityId] || [];
  }, [entityFiles]);

  const value: FileSyncContextType = {
    entityFiles,
    addFileToEntity,
    removeFileFromEntity,
    updateEntityFiles,
    refreshEntityFiles,
    getEntityFiles
  };

  return (
    <FileSyncContext.Provider value={value}>
      {children}
    </FileSyncContext.Provider>
  );
};

export const useFileSync = () => {
  const context = useContext(FileSyncContext);
  if (context === undefined) {
    throw new Error('useFileSync must be used within a FileSyncProvider');
  }
  return context;
};

