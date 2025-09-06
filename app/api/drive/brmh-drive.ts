import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const BRMH_CRUD_API_BASE_URL = process.env.BRMH_CRUD_API_BASE_URL || process.env.CRUD_API_BASE_URL || 'http://localhost:5001';
const BRMH_S3_BUCKET = process.env.BRMH_S3_BUCKET || process.env.AWS_S3_BUCKET || 'brmh';
const DRIVE_FOLDER = 'brmh-drive';
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const ALLOWED_MIME_TYPES = [
  'text/plain', 'text/html', 'text/css', 'text/javascript',
  'application/json', 'application/xml', 'application/pdf',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/ogg',
  'audio/mpeg', 'audio/ogg', 'audio/wav',
  'application/zip', 'application/x-rar-compressed',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv'
];

// Initialize S3 client
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } : undefined,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 5000,
    socketTimeout: 30000,
  }),
  maxAttempts: 3,
  retryMode: 'adaptive',
});

function generateFileId(): string {
  return `FILE_${uuidv4().replace(/-/g, '')}`;
}

function getS3Key(userId: string, filePath: string, fileName: string): string {
  return `${DRIVE_FOLDER}/users/${userId}/${filePath}/${fileName}`.replace(/\/+/g, '/');
}

function validateMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

function validateFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

export type UploadToBrmhDriveInput = {
  name: string;
  mimeType: string;
  size: number;
  content: Buffer;
  tags?: string[];
  filePath?: string; // optional logical folder path under user's drive
};

export type UploadToBrmhDriveResult = {
  success: true;
  fileId: string;
  name: string;
  s3Key: string;
  size: number;
  mimeType: string;
  createdAt: string;
  bucket: string;
};

// Minimal folder support: only ROOT for our current use-case
export async function uploadToBrmhDrive(userId: string, fileData: UploadToBrmhDriveInput, parentId: string = 'ROOT'): Promise<UploadToBrmhDriveResult> {
  const { name, mimeType, size, content, tags = [], filePath = '' } = fileData;

  if (!name || !mimeType || !size || !content) {
    throw new Error('Missing required file data');
  }
  if (!validateMimeType(mimeType)) {
    throw new Error('Unsupported file type');
  }
  if (!validateFileSize(size)) {
    throw new Error('File size exceeds limit');
  }

  const fileId = generateFileId();
  const timestamp = new Date().toISOString();

  const parentPath = filePath || '';
  const s3Key = getS3Key(userId, parentPath, name);

  await s3Client.send(new PutObjectCommand({
    Bucket: BRMH_S3_BUCKET,
    Key: s3Key,
    Body: content,
    ContentType: mimeType,
    Metadata: {
      userId,
      fileId,
      parentId,
      tags: tags.join(',')
    }
  }));

  const fileMetadata = {
    tableName: 'brmh-drive-files',
    item: {
      id: fileId,
      name,
      type: 'file',
      parentId,
      path: parentPath,
      s3Key,
      mimeType,
      size,
      tags,
      createdAt: timestamp,
      updatedAt: timestamp,
      ownerId: userId
    }
  };

  const response = await fetch(`${BRMH_CRUD_API_BASE_URL}/crud?tableName=brmh-drive-files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fileMetadata)
  });

  if (!response.ok) {
    throw new Error('Failed to save file metadata to BRMH drive');
  }

  return {
    success: true,
    fileId,
    name,
    s3Key,
    size,
    mimeType,
    createdAt: timestamp,
    bucket: BRMH_S3_BUCKET,
  };
}

export function buildPublicS3Url(bucket: string, key: string): string {
  return `https://${bucket}.s3.amazonaws.com/${key}`;
}

export const BrmhDriveConfig = {
  bucket: BRMH_S3_BUCKET,
  crudApiBaseUrl: BRMH_CRUD_API_BASE_URL,
  region: AWS_REGION,
  driveFolder: DRIVE_FOLDER,
};


