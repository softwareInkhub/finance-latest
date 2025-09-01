// Database configuration for optimized performance
export const DATABASE_CONFIG = {
  // Connection timeouts
  connectionTimeout: 5000, // 5 seconds
  requestTimeout: 30000, // 30 seconds
  
  // Retry settings
  maxRetries: 3,
  retryMode: 'adaptive' as const,
  
  // Batch processing
  batchSize: 50, // Reduced from 100 for faster processing
  streamDelay: 5, // Reduced delay between batches
  
  // Connection pooling
  keepAlive: true,
  maxConnections: 10,
  
  // Performance optimizations
  removeUndefinedValues: true,
  wrapNumbers: false,
};

// Table names
export const TABLES = {
  BANKS: 'banks',
  ACCOUNTS: 'accounts',
  BANK_STATEMENTS: process.env.AWS_DYNAMODB_STATEMENTS_TABLE || 'bank-statements',
  TAGS: process.env.AWS_DYNAMODB_TAGS_TABLE || 'tags',
  REPORTS: process.env.AWS_DYNAMODB_REPORTS_TABLE || 'brmh-fintech-user-reports',
} as const;

// Helper function to get bank-specific transaction table name
export function getBankTransactionTable(bankName: string): string {
  const normalizedName = bankName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `brmh-${normalizedName}`;
}

