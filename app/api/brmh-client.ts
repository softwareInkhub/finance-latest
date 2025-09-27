// BRMH Backend Client - No AWS credentials needed
// All operations go through https://brmh.in

const BRMH_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://brmh.in';

// Table names (same as before)
export const TABLES = {
  BANKS: 'banks',
  ACCOUNTS: 'accounts',
  BANK_STATEMENTS: 'bank-statements',
  TAGS: 'tags',
  REPORTS: 'brmh-fintech-user-reports',
  USERS: 'users',
  BRMH_DRIVE_FILES: 'brmh-drive-files',
} as const;

// Helper function to get bank-specific transaction table name
export function getBankTransactionTable(bankName: string): string {
  const normalizedName = bankName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `brmh-${normalizedName}`;
}

// BRMH CRUD Client
class BRMHClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = BRMH_BACKEND_URL;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`BRMH API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Create item
  async create(tableName: string, item: Record<string, unknown>) {
    const endpoint = `/crud?tableName=${encodeURIComponent(tableName)}`;
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({ item }),
    });
  }

  // Get single item or scan with pagination
  async get(tableName: string, query: {
    FilterExpression?: string;
    ExpressionAttributeValues?: Record<string, string | number>;
    itemPerPage?: number;
    pagination?: string;
  } = {}) {
    const params = new URLSearchParams();
    params.append('tableName', tableName);
    
    // Convert DynamoDB-style parameters to BRMH backend format
    if (query.FilterExpression) {
      params.append('FilterExpression', query.FilterExpression);
    }
    if (query.ExpressionAttributeValues) {
      // Convert ExpressionAttributeValues to individual parameters
      Object.entries(query.ExpressionAttributeValues).forEach(([key, value]) => {
        params.append(key, String(value));
      });
    }
    if (query.itemPerPage) {
      params.append('itemPerPage', String(query.itemPerPage));
    }
    if (query.pagination) {
      params.append('pagination', query.pagination);
    }

    const endpoint = `/crud?${params.toString()}`;
    return this.makeRequest(endpoint, {
      method: 'GET',
    });
  }

  // Update item
  async update(tableName: string, key: Record<string, unknown>, updates: Record<string, unknown>, metadata?: Record<string, unknown>) {
    const endpoint = `/crud?tableName=${encodeURIComponent(tableName)}`;
    return this.makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify({ 
        key, 
        updates,
        ...metadata 
      }),
    });
  }

  // Delete item
  async delete(tableName: string, key: Record<string, unknown>) {
    const endpoint = `/crud?tableName=${encodeURIComponent(tableName)}`;
    return this.makeRequest(endpoint, {
      method: 'DELETE',
      body: JSON.stringify(key),
    });
  }

  // Scan table (alias for get with pagination)
  async scan(tableName: string, params: {
    FilterExpression?: string;
    ExpressionAttributeValues?: Record<string, string | number>;
    itemPerPage?: number;
    pagination?: string;
  } = {}) {
    // Always enable pagination for scan operations
    const scanParams = { ...params };
    if (!scanParams.itemPerPage) {
      scanParams.itemPerPage = 100; // Default page size
    }
    
    // Get data from BRMH backend
    const result = await this.get(tableName, scanParams);
    
    // Apply client-side filtering if FilterExpression is provided
    if (params.FilterExpression && params.ExpressionAttributeValues) {
      const filteredItems = this.applyClientSideFilter(
        result.items || [], 
        params.FilterExpression, 
        params.ExpressionAttributeValues
      );
      
      return {
        ...result,
        items: filteredItems,
        count: filteredItems.length
      };
    }
    
    return result;
  }

  // Client-side filtering for DynamoDB-style expressions
  private applyClientSideFilter(items: Record<string, unknown>[], filterExpression: string, expressionAttributeValues: Record<string, string | number>) {
    if (!filterExpression || !expressionAttributeValues) {
      return items;
    }


    const filteredItems = items.filter(item => {
      // Handle AND conditions first
      if (filterExpression.includes(' AND ')) {
        const conditions = filterExpression.split(' AND ').map(c => c.trim());
        return conditions.every(condition => {
          if (condition.includes('userId = :userId')) {
            return item.userId === expressionAttributeValues[':userId'];
          }
          if (condition.includes('id = :id')) {
            return item.id === expressionAttributeValues[':id'];
          }
          if (condition.includes('bankId = :bankId')) {
            return item.bankId === expressionAttributeValues[':bankId'];
          }
          if (condition.includes('accountId = :accountId')) {
            return item.accountId === expressionAttributeValues[':accountId'];
          }
          if (condition.includes('email = :email')) {
            return item.email === expressionAttributeValues[':email'];
          }
          return false; // Changed from true to false - unknown conditions should fail
        });
      }
      
      // Handle single conditions
      if (filterExpression.includes('userId = :userId')) {
        const userId = expressionAttributeValues[':userId'];
        return item.userId === userId;
      }
      
      if (filterExpression.includes('id = :id')) {
        const id = expressionAttributeValues[':id'];
        return item.id === id;
      }
      
      if (filterExpression.includes('email = :email')) {
        const email = expressionAttributeValues[':email'];
        return item.email === email;
      }
      
      if (filterExpression.includes('accountId = :accountId')) {
        const accountId = expressionAttributeValues[':accountId'];
        return item.accountId === accountId;
      }
      
      if (filterExpression.includes('bankId = :bankId')) {
        const bankId = expressionAttributeValues[':bankId'];
        return item.bankId === bankId;
      }
      
      // If no conditions match, return false instead of true
      return false;
    });
    
    
    return filteredItems;
  }

  // Get single item by key
  async getItem(tableName: string, key: Record<string, unknown>) {
    const params = new URLSearchParams();
    params.append('tableName', tableName);
    
    // Add the key parameters (like id)
    Object.entries(key).forEach(([keyName, value]) => {
      params.append(keyName, String(value));
    });

    const endpoint = `/crud?${params.toString()}`;
    return this.makeRequest(endpoint, {
      method: 'GET',
    });
  }

  // Put item (alias for create)
  async put(tableName: string, item: Record<string, unknown>) {
    return this.create(tableName, item);
  }
}

// Create singleton instance
export const brmhCrud = new BRMHClient();

// S3 operations are now handled by BRMH Drive client
// Use brmhDrive from brmh-drive-client.ts for all file operations