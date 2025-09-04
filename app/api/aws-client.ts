import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';

// Validate required environment variables
const requiredEnvVars = [
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_BUCKET'
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Initialize AWS clients with optimized configuration
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  // Add timeout configurations for better performance
  requestHandler: {
    // Connection timeout
    connectionTimeout: 5000, // 5 seconds
    // Request timeout
    requestTimeout: 30000, // 30 seconds
  },
  // Max connections in pool
  maxAttempts: 3,
  // Retry configuration
  retryMode: 'adaptive',
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  // Add timeout configurations for S3
  requestHandler: {
    connectionTimeout: 5000,
    requestTimeout: 30000,
  },
  maxAttempts: 3,
  retryMode: 'adaptive',
});

// Create document client for easier DynamoDB operations with optimized settings
export const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    // Remove undefined values to reduce payload size
    removeUndefinedValues: true,
  },
  unmarshallOptions: {
    // Wrap numbers to preserve precision
    wrapNumbers: false,
  },
});

// Export S3 client
export const s3 = s3Client;

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
  // Convert bank name to lowercase and replace spaces/special chars with hyphens
  const normalizedName = bankName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `brmh-${normalizedName}`;
}

// S3 bucket name
export const S3_BUCKET = process.env.AWS_S3_BUCKET!; 