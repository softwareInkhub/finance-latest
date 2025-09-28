'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
// import { useEntitySync } from '../contexts/EntitySyncContext';
// import { useFileSync } from '../contexts/FileSyncContext';
import { useSidebarPreferences } from '../contexts/SidebarPreferencesContext';
import { usePreviewTabManager } from '../hooks/usePreviewTabManager';
import { 
  RiAddLine, 
  RiFolderLine, 
  RiFileLine, 
  RiDeleteBin6Line,
  RiUploadLine,
  RiDownloadLine,
  RiSearchLine,
  RiErrorWarningLine,
  RiCloseLine,
  RiSideBarLine,
  RiSideBarFill,
  RiEdit2Line
} from 'react-icons/ri';

interface Entity {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  fileCount?: number;
  folderCount?: number;
}

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  createdAt: string;
  entityId: string;
  parentId?: string;
  downloadUrl?: string;
  mimeType?: string;
  entityName?: string; // For "All Files" view
}

interface DriveFolder {
  id: string;
  name: string;
  type: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  fileCount?: number;
  folderCount?: number;
}

interface DriveFile {
  id: string;
  name: string;
  type: string;
  size?: number;
  createdAt?: string;
  parentId?: string;
  downloadUrl?: string;
  mimeType?: string;
}

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(() => {
    // Try to restore selected entity from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedEntity');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          console.warn('Failed to parse saved selected entity');
        }
      }
    }
    // Default to "All Files" view
    return { id: 'all-files', name: 'All Files', description: 'View all files from all entities' } as Entity;
  });
  const [entityFiles, setEntityFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<{ isOpen: boolean; entity?: Entity }>({ isOpen: false });
  const [deletingEntity, setDeletingEntity] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityDescription, setNewEntityDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<{ isOpen: boolean; file?: FileItem }>({ isOpen: false });
  const [editingFileName, setEditingFileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Refs to prevent duplicate API calls and debounce
  const loadingRef = useRef(false);
  const filesLoadingRef = useRef(false);
  const lastLoadTimeRef = useRef(0);

  // Note: Context hooks are kept for potential future use
  // const { entities: contextEntities, refreshEntities } = useEntitySync();
  // const { entityFiles: contextEntityFiles, refreshEntityFiles } = useFileSync();
  const { openFilePreview } = usePreviewTabManager();
  const { toggleEntityInSidebar, isEntityInSidebar } = useSidebarPreferences();

  // Note: We're using direct BRMH API calls instead of context
  // The context is kept for potential future use

  const loadEntities = useCallback(async () => {
    if (loadingRef.current) return; // Prevent duplicate calls
    
    try {
      loadingRef.current = true;
      setLoading(true);
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError('User not authenticated');
        return;
      }

      // Call BRMH Drive API to fetch folders (entities) from ROOT
      const response = await fetch(`https://brmh.in/drive/folders/${userId}?parentId=ROOT&limit=100`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch entities from BRMH Drive');
      }

      const driveResponse = await response.json();
      console.log('BRMH Drive Folders Response:', driveResponse);
      
      // Handle different response formats from BRMH Drive API
      let driveFolders = [];
      
      if (Array.isArray(driveResponse)) {
        // If response is directly an array
        driveFolders = driveResponse;
      } else if (driveResponse && Array.isArray(driveResponse.items)) {
        // If response has an items property
        driveFolders = driveResponse.items;
      } else if (driveResponse && Array.isArray(driveResponse.folders)) {
        // If response has a folders property
        driveFolders = driveResponse.folders;
      } else if (driveResponse && Array.isArray(driveResponse.files)) {
        // If response has a files property
        driveFolders = driveResponse.files;
      } else {
        console.warn('Unexpected BRMH Drive response format:', driveResponse);
        driveFolders = [];
      }
      
      // Debug: Log the raw folder data
      console.log('Raw driveFolders data:', driveFolders);
      driveFolders.forEach((folder: DriveFolder, index: number) => {
        console.log(`Folder ${index}:`, {
          id: folder?.id,
          name: folder?.name,
          type: folder?.type,
          hasId: !!folder?.id,
          hasName: !!folder?.name
        });
      });

      // Transform BRMH Drive response to our entity format (only folders)
      const entities = driveFolders
        .filter((item: DriveFolder) => {
          const isValid = item && item.type === 'folder' && item.id && item.name;
          if (!isValid) {
            console.warn('Filtering out invalid folder:', item);
          }
          return isValid;
        })
        .map((folder: DriveFolder) => {
          console.log('Mapping folder to entity:', folder);
          return {
            id: folder.id,
            name: folder.name,
            description: folder.description || '',
            createdAt: folder.createdAt || new Date().toISOString(),
            updatedAt: folder.updatedAt || new Date().toISOString(),
            fileCount: folder.fileCount || 0,
            folderCount: folder.folderCount || 0
          };
        });

      console.log('Final entities:', entities);

      setEntities(entities);
      
      // Load file counts for all entities
      await loadFileCountsForAllEntities(entities);
      
      setError(null);
    } catch (err) {
      setError('Failed to load entities');
      console.error('Error loading entities:', err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const loadAllEntityFiles = useCallback(async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError('User not authenticated');
        return;
      }

      console.log('Loading all files from all entities...');
      
      // Get all files from all entities in parallel
      const allFilesPromises = entities.map(async (entity) => {
        try {
          // Try the files endpoint first
          let response = await fetch(`https://brmh.in/drive/files/${userId}?parentId=${entity.id}&limit=100`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          let driveResponse;
          
          if (response.ok) {
            driveResponse = await response.json();
          } else {
            // Fallback to contents endpoint
            response = await fetch(`https://brmh.in/drive/contents/${userId}/${entity.id}?limit=100`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (!response.ok) {
              console.warn(`Failed to fetch files for entity ${entity.name}`);
              return [];
            }
            
            driveResponse = await response.json();
          }
          
          // Handle different response formats
          let driveFiles = [];
          
          if (Array.isArray(driveResponse)) {
            driveFiles = driveResponse;
          } else if (driveResponse && Array.isArray(driveResponse.items)) {
            driveFiles = driveResponse.items;
          } else if (driveResponse && Array.isArray(driveResponse.files)) {
            driveFiles = driveResponse.files;
          } else if (driveResponse && Array.isArray(driveResponse.folders)) {
            driveFiles = driveResponse.folders;
          }
          
          // Transform files and add entity name
          return driveFiles.map((file: DriveFile) => ({
            id: file.id,
            name: file.name,
            type: file.type === 'folder' ? 'folder' : 'file',
            size: file.size,
            createdAt: file.createdAt,
            entityId: entity.id,
            entityName: entity.name, // Add entity name
            parentId: file.parentId,
            downloadUrl: file.downloadUrl || `/api/files/download?userId=${userId}&fileId=${file.id}`,
            mimeType: file.mimeType || (file.type === 'folder' ? 'folder' : 'application/octet-stream')
          }));
        } catch (error) {
          console.error(`Error loading files for entity ${entity.name}:`, error);
          return [];
        }
      });

      const allFilesResults = await Promise.all(allFilesPromises);
      const allFiles = allFilesResults.flat();
      
      console.log(`Loaded ${allFiles.length} files from ${entities.length} entities`);
      setEntityFiles(allFiles);
    } catch (error) {
      setError('Failed to load all entity files');
      console.error('Error loading all entity files:', error);
      setEntityFiles([]);
    }
  }, [entities]);

  const loadEntityFiles = useCallback(async (entityId: string) => {
    if (filesLoadingRef.current) return; // Prevent duplicate calls
    
    // Debounce: prevent calls within 500ms of each other
    const now = Date.now();
    if (now - lastLoadTimeRef.current < 500) {
      console.log('Debouncing loadEntityFiles call');
      return;
    }
    lastLoadTimeRef.current = now;
    
    try {
      filesLoadingRef.current = true;
      setFilesLoading(true);
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError('User not authenticated');
        return;
      }

      // Handle "All Files" case
      if (entityId === 'all-files') {
        await loadAllEntityFiles();
        return;
      }

      // Call BRMH Drive API to fetch files for this entity
      // Try the files endpoint first
      let response = await fetch(`https://brmh.in/drive/files/${userId}?parentId=${entityId}&limit=100`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      let driveResponse;
      
      if (response.ok) {
        driveResponse = await response.json();
        console.log('BRMH Drive Files Response (files endpoint):', driveResponse);
        console.log('API URL called:', `https://brmh.in/drive/files/${userId}?parentId=${entityId}&limit=100`);
      } else {
        console.log('Files endpoint failed, trying contents endpoint...');
        // Fallback to contents endpoint
        response = await fetch(`https://brmh.in/drive/contents/${userId}/${entityId}?limit=100`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch entity files from BRMH Drive');
        }
        
        driveResponse = await response.json();
        console.log('BRMH Drive Files Response (contents endpoint):', driveResponse);
        console.log('API URL called:', `https://brmh.in/drive/contents/${userId}/${entityId}?limit=100`);
      }
      
      console.log('Entity ID:', entityId);
      console.log('User ID:', userId);
      
      // Handle different response formats from BRMH Drive API
      let driveFiles = [];
      
      if (Array.isArray(driveResponse)) {
        // If response is directly an array
        driveFiles = driveResponse;
      } else if (driveResponse && Array.isArray(driveResponse.items)) {
        // If response has an items property
        driveFiles = driveResponse.items;
      } else if (driveResponse && Array.isArray(driveResponse.files)) {
        // If response has a files property
        driveFiles = driveResponse.files;
      } else if (driveResponse && Array.isArray(driveResponse.folders)) {
        // If response has a folders property
        driveFiles = driveResponse.folders;
      } else {
        console.warn('Unexpected BRMH Drive files response format:', driveResponse);
        driveFiles = [];
      }
      
      // Transform BRMH Drive response to our file format
      const files = driveFiles
        .filter((file: DriveFile) => file && file.id && file.name)
        .map((file: DriveFile) => ({
          id: file.id,
          name: file.name,
          type: file.type === 'folder' ? 'folder' as const : 'file' as const,
          size: file.size || 0,
          createdAt: file.createdAt || new Date().toISOString(),
          entityId: entityId,
          parentId: file.parentId || null,
          downloadUrl: file.downloadUrl || `/api/files/download?userId=${userId}&fileId=${file.id}`,
          mimeType: file.mimeType || (file.type === 'folder' ? 'folder' : 'application/octet-stream')
        }));
      
      setEntityFiles(files);
      
      // Update the file count for this entity (without causing re-render loop)
      if (entityId !== 'all-files') {
        console.log(`Updating file count for entity ${entityId}: ${files.length} files`);
        setEntities(prevEntities => {
          const updatedEntities = prevEntities.map(entity => {
            if (entity.id === entityId) {
              console.log(`Entity ${entity.name} file count updated from ${entity.fileCount} to ${files.length}`);
              return { ...entity, fileCount: files.length };
            }
            return entity;
          });
          console.log('Updated entities:', updatedEntities);
          return updatedEntities;
        });
      }
    } catch (err) {
      setError('Failed to load entity files');
      console.error('Error loading entity files:', err);
    } finally {
      filesLoadingRef.current = false;
      setFilesLoading(false);
    }
  }, [loadAllEntityFiles]); // Include loadAllEntityFiles dependency

  // Load entities on component mount
  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  // Load entity files if there's a selected entity from localStorage
  useEffect(() => {
    if (selectedEntity && entities.length > 0 && !filesLoadingRef.current) {
      // Handle "All Files" case
      if (selectedEntity.id === 'all-files') {
        loadEntityFiles(selectedEntity.id);
        return;
      }
      
      // Verify the selected entity still exists in the current entities list
      const entityExists = entities.find(e => e.id === selectedEntity.id);
      if (entityExists) {
        loadEntityFiles(selectedEntity.id);
      } else {
        // Clear selected entity if it no longer exists
        setSelectedEntity(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedEntity');
        }
      }
    }
  }, [entities, selectedEntity, loadEntityFiles]);

  // Cleanup function to clear selected entity when component unmounts
  useEffect(() => {
    return () => {
      // Don't clear on unmount, keep it for when user returns to entities
      // The state will be restored from localStorage
    };
  }, []);


  const loadFileCountsForAllEntities = async (entitiesList: Entity[]) => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        console.error('User ID not found');
        return;
      }

      console.log('Loading file counts for all entities...');
      
      // Get file counts for all entities in parallel
      const fileCountPromises = entitiesList.map(async (entity) => {
        try {
          // Try the files endpoint first
          let response = await fetch(`https://brmh.in/drive/files/${userId}?parentId=${entity.id}&limit=100`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          let driveResponse;
          
          if (response.ok) {
            driveResponse = await response.json();
          } else {
            // Fallback to contents endpoint
            response = await fetch(`https://brmh.in/drive/contents/${userId}/${entity.id}?limit=100`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (!response.ok) {
              console.warn(`Failed to fetch file count for entity ${entity.name}`);
              return { entityId: entity.id, fileCount: 0 };
            }
            
            driveResponse = await response.json();
          }
          
          // Handle different response formats
          let driveFiles = [];
          
          if (Array.isArray(driveResponse)) {
            driveFiles = driveResponse;
          } else if (driveResponse && Array.isArray(driveResponse.items)) {
            driveFiles = driveResponse.items;
          } else if (driveResponse && Array.isArray(driveResponse.files)) {
            driveFiles = driveResponse.files;
          } else if (driveResponse && Array.isArray(driveResponse.folders)) {
            driveFiles = driveResponse.folders;
          }
          
          const fileCount = driveFiles.filter((file: DriveFile) => file.type !== 'folder').length;
          console.log(`Entity ${entity.name} has ${fileCount} files`);
          
          return { entityId: entity.id, fileCount };
        } catch (error) {
          console.error(`Error loading file count for entity ${entity.name}:`, error);
          return { entityId: entity.id, fileCount: 0 };
        }
      });

      const fileCountResults = await Promise.all(fileCountPromises);
      
      // Update entities with correct file counts
      setEntities(prevEntities => 
        prevEntities.map(entity => {
          const countResult = fileCountResults.find(result => result.entityId === entity.id);
          if (countResult) {
            console.log(`Updating ${entity.name} file count to ${countResult.fileCount}`);
            return { ...entity, fileCount: countResult.fileCount };
          }
          return entity;
        })
      );
      
      console.log('File counts updated for all entities');
    } catch (error) {
      console.error('Error loading file counts for all entities:', error);
    }
  };

  const handleEntitySelect = (entity: Entity) => {
    setSelectedEntity(entity);
    // Save selected entity to localStorage to persist across tab changes
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedEntity', JSON.stringify(entity));
    }
    loadEntityFiles(entity.id);
  };

  const clearSelectedEntity = () => {
    setSelectedEntity(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedEntity');
    }
  };

  const handleFileClick = async (file: FileItem) => {
    console.log('File clicked:', file);
    console.log('File downloadUrl:', file.downloadUrl);
    console.log('File mimeType:', file.mimeType);
    
    // Validate file data before preview
    if (!file.id || !file.name) {
      setError('Invalid file data: missing ID or name');
      return;
    }

    try {
      let fileWithUrl = file;
      
      // If no download URL, fetch it
      if (!file.downloadUrl) {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          setError('User not authenticated');
          return;
        }
        
        const response = await fetch(`/api/files/download?userId=${userId}&fileId=${file.id}`);
        if (!response.ok) {
          throw new Error('Failed to get download URL');
        }
        
        const result = await response.json();
        if (result.error) {
          throw new Error(result.error);
        }
        
        fileWithUrl = {
          ...file,
          downloadUrl: result.downloadUrl
        };
      }
      
      // Convert FileItem to the format expected by openFilePreview
      const fileForPreview = {
        id: fileWithUrl.id,
        name: fileWithUrl.name,
        downloadUrl: fileWithUrl.downloadUrl,
        mimeType: fileWithUrl.mimeType
      };
      
      // Open file preview using the same system as file section
      openFilePreview(fileForPreview);
    } catch (error) {
      console.error('Failed to open file preview:', error);
      setError('Failed to open file preview: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleCreateEntity = async () => {
    if (!newEntityName.trim()) {
      setError('Entity name is required');
      return;
    }

    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError('User not authenticated');
        return;
      }

      // Call BRMH Drive API to create a folder (entity)
      const response = await fetch('https://brmh.in/drive/folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          folderData: {
            name: newEntityName.trim(),
            description: newEntityDescription.trim()
          },
          parentId: 'ROOT'
        }),
      });

      // Check if response is HTML (error page) instead of JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const htmlText = await response.text();
        console.error('BRMH Drive API returned HTML instead of JSON:', htmlText.substring(0, 200));
        throw new Error('BRMH Drive API returned an error page. Please check the API endpoint.');
      }

      if (!response.ok) {
        let errorMessage = 'Failed to create folder in BRMH Drive';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If we can't parse error as JSON, use status text
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const createdFolder = await response.json();
      console.log('BRMH Drive Folder Created:', createdFolder);

      // Add to local state
      setEntities(prev => [...prev, {
        id: createdFolder.folderId || createdFolder.id,
        name: newEntityName.trim(),
        description: newEntityDescription.trim(),
        createdAt: createdFolder.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fileCount: 0,
        folderCount: 0
      }]);
      
      setNewEntityName('');
      setNewEntityDescription('');
      setShowCreateModal(false);
      setError(null);
      
      // Refresh entities list to ensure consistency with server
      await loadEntities();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create entity');
      console.error('Error creating entity:', err);
    }
  };

  const handleDeleteEntity = async (entity: Entity) => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      setError('User not authenticated');
      return;
    }

    if (!entity || !entity.id || entity.id === 'undefined' || entity.id === undefined) {
      setError('Invalid entity: missing or invalid ID');
      console.error('Entity missing ID:', entity);
      console.error('Entity ID type:', typeof entity.id);
      console.error('Entity ID value:', entity.id);
      return;
    }

    setDeletingEntity(true);
    setError(null);

    try {
      console.log('Deleting entity:', entity);
      
      // Use direct BRMH Drive API call instead of local API
      const response = await fetch(`https://brmh.in/drive/folder/${userId}/${entity.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Check if response is HTML (error page) instead of JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const htmlText = await response.text();
        console.error('BRMH Drive API returned HTML instead of JSON:', htmlText.substring(0, 200));
        throw new Error('BRMH Drive API returned an error page. Please check the API endpoint.');
      }

      if (!response.ok) {
        let errorMessage = 'Failed to delete folder from BRMH Drive';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If we can't parse error as JSON, use status text
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      console.log('Entity deleted successfully:', entity.name);
      
      // Remove from local state
      setEntities(prev => prev.filter(e => e.id !== entity.id));
      if (selectedEntity?.id === entity.id) {
        clearSelectedEntity();
        setEntityFiles([]);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entity');
      console.error('Error deleting entity:', err);
    } finally {
      setDeletingEntity(false);
    }
  };

  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0 || !selectedEntity) return;

    const userId = localStorage.getItem('userId');
    if (!userId) {
      setError('User not authenticated');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Upload files to BRMH Drive
      for (const file of selectedFiles) {
        // Convert file to base64 for BRMH Drive API
        const base64Content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix to get just the base64 content
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const response = await fetch('https://brmh.in/drive/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId,
            fileData: {
              name: file.name,
              mimeType: file.type,
              size: file.size,
              content: base64Content,
              tags: []
            },
            parentId: selectedEntity.id
          }),
        });

        // Check if response is HTML (error page) instead of JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const htmlText = await response.text();
          console.error('BRMH Drive API returned HTML instead of JSON:', htmlText.substring(0, 200));
          throw new Error(`BRMH Drive API returned an error page for ${file.name}. Please check the API endpoint.`);
        }

        if (!response.ok) {
          let errorMessage = `Failed to upload ${file.name} to BRMH Drive`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            // If we can't parse error as JSON, use status text
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const uploadResult = await response.json();
        console.log('BRMH Drive Upload Result:', uploadResult);
      }

      // Refresh files after upload
      await loadEntityFiles(selectedEntity.id);
      setShowUploadModal(false);
      setSelectedFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload files');
      console.error('Error uploading files:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleEditSave = async () => {
    if (!showEditModal.file || !editingFileName.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User ID not found');
      }

      // Call BRMH Drive API to rename the file
      const response = await fetch(`https://brmh.in/drive/rename/${userId}/${showEditModal.file.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newName: editingFileName.trim()
        }),
      });

      // Check if response is HTML (error page) instead of JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const htmlText = await response.text();
        console.error('BRMH Drive API returned HTML instead of JSON:', htmlText.substring(0, 200));
        throw new Error('BRMH Drive API returned an error page. Please check the API endpoint.');
      }

      if (!response.ok) {
        let errorMessage = 'Failed to rename file in BRMH Drive';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If we can't parse error as JSON, use status text
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const renameResult = await response.json();
      console.log('BRMH Drive Rename Result:', renameResult);

      // Refresh files after rename
      await loadEntityFiles(selectedEntity?.id || 'all-files');
      setShowEditModal({ isOpen: false });
      setEditingFileName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename file');
      console.error('Error renaming file:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEntities = (entities || []).filter(entity =>
    entity && entity.id && entity.name && entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (entity && entity.id && entity.description && entity.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredFiles = (entityFiles || []).filter(file =>
    file && file.name && file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-900">
      {/* Left Sidebar - Entities List */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Entities
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              title="Create New Entity"
            >
              <RiAddLine size={16} />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <RiSearchLine className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search entities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Entities List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredEntities.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              {searchTerm ? 'No entities found matching your search.' : 'No entities created yet.'}
            </div>
          ) : (
            <div className="space-y-2">
              {/* All Files Option */}
              <div
                onClick={() => handleEntitySelect({ id: 'all-files', name: 'All Files', description: 'View all files from all entities' } as Entity)}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  selectedEntity?.id === 'all-files'
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <RiFileLine 
                      size={20} 
                      className={selectedEntity?.id === 'all-files' ? 'text-blue-600' : 'text-gray-500'} 
                    />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        All Files
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        View all files from all entities
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-400">
                      {entityFiles.length} files
                    </span>
                  </div>
                </div>
              </div>
              
              {filteredEntities.map((entity) => 
                entity ? (
                <div
                  key={entity.id}
                  onClick={() => handleEntitySelect(entity)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    selectedEntity?.id === entity.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <RiFolderLine 
                        size={20} 
                        className={selectedEntity?.id === entity.id ? 'text-blue-600' : 'text-gray-500'} 
                      />
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {entity.name}
                        </h3>
                        {entity.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {entity.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-400">
                        {entity.fileCount || 0} files
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEntityInSidebar(entity.id);
                        }}
                        className={`p-1 rounded transition-colors ${
                          isEntityInSidebar(entity.id)
                            ? 'text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                        title={isEntityInSidebar(entity.id) ? 'Remove from sidebar' : 'Add to sidebar'}
                      >
                        {isEntityInSidebar(entity.id) ? (
                          <RiSideBarFill size={14} />
                        ) : (
                          <RiSideBarLine size={14} />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteModal({ isOpen: true, entity });
                        }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-500 hover:text-red-700"
                        title="Delete Entity"
                      >
                        <RiDeleteBin6Line size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                ) : null
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Content - Entity Files */}
      <div className="flex-1 flex flex-col">
        {selectedEntity ? (
          <>
            {/* Entity Header */}
            <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {selectedEntity.name}
                  </h1>
                  {selectedEntity.description && (
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {selectedEntity.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <RiUploadLine size={16} />
                    <span>Upload</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Files List */}
            <div className="flex-1 overflow-y-auto p-4">
              {filesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {searchTerm ? 'No files found matching your search.' : 'No files in this entity yet.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredFiles.map((file) => 
                    file ? (
                     <div
                       key={file.id}
                       className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow cursor-pointer"
                       onClick={() => handleFileClick(file)}
                     >
                      <div className="flex items-center space-x-3 mb-2">
                        {file.type === 'folder' ? (
                          <RiFolderLine size={24} className="text-blue-500" />
                        ) : (
                          <RiFileLine size={24} className="text-gray-500" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {file.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {file.type === 'file' && file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Folder'}
                            {selectedEntity?.id === 'all-files' && 'entityName' in file && (
                              <span className="ml-2 text-blue-600 dark:text-blue-400">
                                • {file.entityName}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </span>
                        <div className="flex items-center space-x-1">
                           <button
                             className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-gray-500 hover:text-gray-700"
                             title="Download"
                             onClick={(e) => {
                               e.stopPropagation(); // Prevent file click when downloading
                              if (file.downloadUrl && file.downloadUrl !== '#') {
                                window.open(file.downloadUrl, '_blank');
                              }
                            }}
                          >
                            <RiDownloadLine size={14} />
                          </button>
                           <button
                             className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded text-blue-500 hover:text-blue-700"
                             title="Edit file name"
                             onClick={(e) => {
                               e.stopPropagation(); // Prevent file click when editing
                               setShowEditModal({ isOpen: true, file });
                               setEditingFileName(file.name);
                             }}
                          >
                            <RiEdit2Line size={14} />
                          </button>
                           <button
                             className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-500 hover:text-red-700"
                             title="Delete file"
                             onClick={async (e) => {
                               e.stopPropagation(); // Prevent file click when deleting
                              if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
                                     try {
                                       const userId = localStorage.getItem('userId');
                                       if (!userId) return;

                                       const response = await fetch(`https://brmh.in/drive/file/${userId}/${file.id}`, {
                                         method: 'DELETE',
                                         headers: {
                                           'Content-Type': 'application/json',
                                         },
                                       });

                                       // Check if response is HTML (error page) instead of JSON
                                       const contentType = response.headers.get('content-type');
                                       if (!contentType || !contentType.includes('application/json')) {
                                         const htmlText = await response.text();
                                         console.error('BRMH Drive API returned HTML instead of JSON:', htmlText.substring(0, 200));
                                         throw new Error('BRMH Drive API returned an error page. Please check the API endpoint.');
                                       }

                                       if (!response.ok) {
                                         let errorMessage = 'Failed to delete file from BRMH Drive';
                                         try {
                                           const errorData = await response.json();
                                           errorMessage = errorData.error || errorData.message || errorMessage;
                                         } catch {
                                           // If we can't parse error as JSON, use status text
                                           errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                                         }
                                         throw new Error(errorMessage);
                                       }

                                       console.log('BRMH Drive File Deleted:', file.id);
                                       
                                       // Refresh files after deletion
                                       await loadEntityFiles(selectedEntity.id);
                                       setError(null);
                                     } catch (err) {
                                       setError(err instanceof Error ? err.message : 'Failed to delete file');
                                       console.error('Error deleting file:', err);
                                     }
                              }
                            }}
                          >
                            <RiDeleteBin6Line size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    ) : null
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <RiFolderLine size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Select an Entity</h3>
              <p>Choose an entity from the sidebar to view its files and folders.</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Entity Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Create New Entity
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Entity Name *
                </label>
                <input
                  type="text"
                  value={newEntityName}
                  onChange={(e) => setNewEntityName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter entity name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newEntityDescription}
                  onChange={(e) => setNewEntityDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter entity description (optional)"
                  rows={3}
                />
              </div>
            </div>
            {error && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewEntityName('');
                  setNewEntityDescription('');
                  setError(null);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEntity}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create Entity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && selectedEntity && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <RiUploadLine size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Upload Files</h3>
                    <p className="text-blue-100 text-sm">to {selectedEntity.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <RiCloseLine size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Side - Upload Area */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select Files</h4>
                  
                  {/* Upload Area */}
                  <div className="relative">
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center transition-all duration-300 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 group">
                      <div className="space-y-4">
                        {/* Upload Icon */}
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <RiUploadLine size={28} className="text-blue-500 dark:text-blue-400" />
                        </div>
                        
                        {/* Text Content */}
                        <div className="space-y-2">
                          <h5 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            Drop files here
                          </h5>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            or click to browse
                          </p>
                        </div>

                        {/* File Types Info */}
                        <div className="flex flex-wrap justify-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">PDF</span>
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">Excel</span>
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">Word</span>
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">Images</span>
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">CSV</span>
                        </div>

                        {/* Upload Button */}
                        <div className="pt-2">
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            id="file-upload"
                            onChange={(e) => {
                              const files = e.target.files;
                              if (files && files.length > 0) {
                                setSelectedFiles(Array.from(files));
                                setError(null);
                              }
                            }}
                          />
                          <label
                            htmlFor="file-upload"
                            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          >
                            <RiUploadLine size={16} className="mr-2" />
                            Choose Files
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side - File Preview */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Selected Files</h4>
                  
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 max-h-64 overflow-y-auto">
                    {selectedFiles.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <RiFileLine size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No files selected</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <RiFileLine size={16} className="text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {file.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <RiCloseLine size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Upload Summary */}
                  {selectedFiles.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Ready to Upload
                        </span>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} • 
                        {(selectedFiles.reduce((total, file) => total + file.size, 0) / 1024 / 1024).toFixed(2)} MB total
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <RiErrorWarningLine size={20} className="text-red-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Upload Failed</h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedFiles.length > 0 && (
                    <span>{selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected</span>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setSelectedFiles([]);
                      setError(null);
                    }}
                    className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadFiles}
                    disabled={selectedFiles.length === 0 || uploading}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:shadow-none"
                  >
                    {uploading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Uploading...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <RiUploadLine size={16} />
                        <span>Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Entity Modal */}
      {showDeleteModal.isOpen && showDeleteModal.entity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-[90vw]">
            <h2 className="text-xl font-bold mb-4 text-red-600 dark:text-red-400">Delete Entity</h2>
            
            <div className="mb-4">
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                Are you sure you want to delete the entity <strong>&quot;{showDeleteModal.entity.name}&quot;</strong>?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                This action cannot be undone. All files in this entity will also be deleted.
              </p>
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal({ isOpen: false });
                  setError(null);
                }}
                disabled={deletingEntity}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (showDeleteModal.entity && !deletingEntity) {
                    await handleDeleteEntity(showDeleteModal.entity);
                    setShowDeleteModal({ isOpen: false });
                  }
                }}
                disabled={deletingEntity}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  deletingEntity 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {deletingEntity && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {deletingEntity ? 'Deleting...' : 'Delete Entity'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit File Modal */}
      {showEditModal.isOpen && showEditModal.file && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-[90vw]">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Edit File Name</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                File Name
              </label>
              <input
                type="text"
                value={editingFileName}
                onChange={(e) => setEditingFileName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new file name"
                autoFocus
              />
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal({ isOpen: false });
                  setEditingFileName('');
                  setError(null);
                }}
                disabled={isSaving}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={isSaving || !editingFileName.trim()}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  isSaving || !editingFileName.trim()
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSaving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
