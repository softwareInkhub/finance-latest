// BRMH Drive Client - File operations through BRMH backend
// All file operations go through https://brmh.in/drive for S3 storage

const BRMH_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://brmh.in';

// BRMH Drive client now uses proper Drive API endpoints for S3 storage

// BRMH Drive Client
class BRMHDriveClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = BRMH_BACKEND_URL;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Only log in development or for uploads
    if (process.env.NODE_ENV === 'development' || options.method === 'POST') {
      console.log('BRMH Drive API Request:', {
        url,
        method: options.method || 'GET',
        bodySize: options.body ? (options.body as string).length : 0
      });
    }
    
    // For GET requests with body, convert to query parameters
    let finalUrl = url;
    const finalOptions = { ...options };
    
    if (options.method === 'GET' && options.body) {
      const bodyData = JSON.parse(options.body as string);
      const queryParams = new URLSearchParams();
      
      // Convert body to query parameters for GET requests
      Object.keys(bodyData).forEach(key => {
        if (typeof bodyData[key] === 'object') {
          queryParams.append(key, JSON.stringify(bodyData[key]));
        } else {
          queryParams.append(key, bodyData[key]);
        }
      });
      
      finalUrl = `${url}?${queryParams.toString()}`;
      finalOptions.body = undefined;
    }
    
    const startTime = Date.now();
    const response = await fetch(finalUrl, {
      ...finalOptions,
      headers: {
        'Content-Type': 'application/json',
        ...finalOptions.headers,
      },
    });

    const duration = Date.now() - startTime;
    
    // Only log in development or for slow requests
    if (process.env.NODE_ENV === 'development' || duration > 1000) {
      console.log('BRMH Drive API Response:', {
        status: response.status,
        duration: `${duration}ms`,
        url: response.url
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('BRMH Drive API Error Response:', errorText);
      throw new Error(`BRMH Drive API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  // Upload file
  async uploadFile(userId: string, fileData: {
    name: string;
    mimeType: string;
    size: number;
    content: string; // base64 encoded
    tags?: string[];
    bankId?: string;
    bankName?: string;
    accountId?: string;
    accountName?: string;
    accountNumber?: string;
    fileType?: string;
  }, parentId: string = 'ROOT') {
    // Use the actual BRMH Drive API for S3 storage
    const endpoint = '/drive/upload';
    const requestBody = {
      userId,
      fileData: {
        name: fileData.name,
        mimeType: fileData.mimeType,
        size: fileData.size,
        content: fileData.content,
        tags: fileData.tags || []
      },
      parentId
    };
    
    console.log('BRMH Drive upload request:', {
      endpoint,
      userId,
      fileName: fileData.name,
      size: fileData.size,
      fullUrl: `${this.baseUrl}${endpoint}`
    });
    
    const result = await this.makeRequest(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('BRMH Drive upload response:', result);
    return result;
  }

  // Create folder
  async createFolder(userId: string, folderData: {
    name: string;
    description?: string;
  }, parentId: string = 'ROOT') {
    const endpoint = '/drive/folder';
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        userId,
        folderData,
        parentId
      }),
    });
  }

  // Get file by ID
  async getFileById(userId: string, fileId: string) {
    // Use the actual BRMH Drive API
    const endpoint = `/drive/file/${userId}/${fileId}`;
    console.log('BRMH Drive getFileById request:', {
      endpoint,
      userId,
      fileId,
      fullUrl: `${this.baseUrl}${endpoint}`
    });
    
    const result = await this.makeRequest(endpoint, {
      method: 'GET',
    });
    
    console.log('BRMH Drive getFileById response:', result);
    return result;
  }

  // Get folder by ID
  async getFolderById(userId: string, folderId: string) {
    const endpoint = `/drive/folder/${userId}/${folderId}`;
    return this.makeRequest(endpoint, {
      method: 'GET',
    });
  }

  // List user files
  async listFiles(userId: string, parentId: string = 'ROOT', limit: number = 50) {
    // Use the actual BRMH Drive API
    const endpoint = `/drive/files/${userId}?parentId=${parentId}&limit=${limit}`;
    return this.makeRequest(endpoint, {
      method: 'GET',
    });
  }

  // List user folders
  async listFolders(userId: string, parentId: string = 'ROOT', limit: number = 50) {
    // Use the actual BRMH Drive API
    const endpoint = `/drive/folders/${userId}?parentId=${parentId}&limit=${limit}`;
    return this.makeRequest(endpoint, {
      method: 'GET',
    });
  }

  // List folder contents
  async listFolderContents(userId: string, folderId: string, limit: number = 50) {
    const endpoint = `/drive/contents/${userId}/${folderId}?limit=${limit}`;
    return this.makeRequest(endpoint, {
      method: 'GET',
    });
  }

  // Rename file
  async renameFile(userId: string, fileId: string, newName: string) {
    // Try multiple approaches for file renaming
    
    // Approach 1: Use the correct BRMH Drive rename endpoint
    let endpoint = `/drive/rename/${userId}/${fileId}`;
    console.log('BRMH Drive rename file request (approach 1):', {
      endpoint,
      userId,
      fileId,
      newName,
      fullUrl: `${this.baseUrl}${endpoint}`
    });
    
    try {
      const result = await this.makeRequest(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newName }),
      });
      
      console.log('BRMH Drive rename file response (approach 1):', result);
      return result;
    } catch (error) {
      console.warn('BRMH Drive rename endpoint failed, trying approach 2:', error instanceof Error ? error.message : String(error));
      
      // Approach 2: Try using the general file endpoint with PUT method
      endpoint = `/drive/file/${userId}/${fileId}`;
      console.log('BRMH Drive rename file request (approach 2):', {
        endpoint,
        userId,
        fileId,
        newName,
        fullUrl: `${this.baseUrl}${endpoint}`
      });
      
      try {
        const result = await this.makeRequest(endpoint, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newName }),
        });
        
        console.log('BRMH Drive rename file response (approach 2):', result);
        return result;
      } catch (error2) {
        console.error('BRMH Drive rename file failed with both approaches:', error2 instanceof Error ? error2.message : String(error2));
        throw error2;
      }
    }
  }

  // Rename folder
  async renameFolder(userId: string, folderId: string, newName: string) {
    const endpoint = `/drive/rename-folder/${userId}/${folderId}`;
    return this.makeRequest(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ newName }),
    });
  }

  // Delete file
  async deleteFile(userId: string, fileId: string) {
    // Use the actual BRMH Drive API
    const endpoint = `/drive/file/${userId}/${fileId}`;
    console.log('BRMH Drive delete request:', {
      endpoint,
      userId,
      fileId,
      fullUrl: `${this.baseUrl}${endpoint}`
    });
    
    const result = await this.makeRequest(endpoint, {
      method: 'DELETE',
    });
    
    console.log('BRMH Drive delete response:', result);
    return result;
  }

  // Delete folder
  async deleteFolder(userId: string, folderId: string) {
    const endpoint = `/drive/folder/${userId}/${folderId}`;
    return this.makeRequest(endpoint, {
      method: 'DELETE',
    });
  }

  // Download file (get download URL)
  async downloadFile(userId: string, fileId: string) {
    const endpoint = `/drive/download/${userId}/${fileId}`;
    return this.makeRequest(endpoint, {
      method: 'GET',
    });
  }

  // Move file
  async moveFile(userId: string, fileId: string, newParentId: string) {
    const endpoint = `/drive/move-file/${userId}/${fileId}`;
    return this.makeRequest(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ newParentId }),
    });
  }

  // Move folder
  async moveFolder(userId: string, folderId: string, newParentId: string) {
    const endpoint = `/drive/move-folder/${userId}/${folderId}`;
    return this.makeRequest(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ newParentId }),
    });
  }

  // Share file
  async shareFile(userId: string, fileId: string, shareData: {
    sharedWithUserId: string;
    permissions?: string[];
    expiresAt?: string;
    message?: string;
  }) {
    const endpoint = `/drive/share-file/${userId}/${fileId}`;
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(shareData),
    });
  }

  // Share folder
  async shareFolder(userId: string, folderId: string, shareData: {
    sharedWithUserId: string;
    permissions?: string[];
    expiresAt?: string;
    message?: string;
    includeSubfolders?: boolean;
  }) {
    const endpoint = `/drive/share-folder/${userId}/${folderId}`;
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(shareData),
    });
  }

  // Get shared with me
  async getSharedWithMe(userId: string, limit: number = 50) {
    const endpoint = `/drive/shared-with-me/${userId}?limit=${limit}`;
    return this.makeRequest(endpoint, {
      method: 'GET',
    });
  }

  // Get shared by me
  async getSharedByMe(userId: string, limit: number = 50) {
    const endpoint = `/drive/shared-by-me/${userId}?limit=${limit}`;
    return this.makeRequest(endpoint, {
      method: 'GET',
    });
  }

  // Update share permissions
  async updateSharePermissions(userId: string, shareId: string, permissions: string[]) {
    const endpoint = `/drive/share-permissions/${userId}/${shareId}`;
    return this.makeRequest(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ permissions }),
    });
  }

  // Revoke share
  async revokeShare(userId: string, shareId: string) {
    const endpoint = `/drive/revoke-share/${userId}/${shareId}`;
    return this.makeRequest(endpoint, {
      method: 'DELETE',
    });
  }

  // Get shared file content
  async getSharedFileContent(userId: string, shareId: string) {
    const endpoint = `/drive/shared-content/${userId}/${shareId}`;
    return this.makeRequest(endpoint, {
      method: 'GET',
    });
  }

  // Initialize drive system
  async initializeDriveSystem() {
    const endpoint = '/drive/initialize';
    return this.makeRequest(endpoint, {
      method: 'POST',
    });
  }
}

// Create singleton instance
export const brmhDrive = new BRMHDriveClient();

// Export the class for testing
export { BRMHDriveClient };

