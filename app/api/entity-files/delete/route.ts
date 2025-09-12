import { NextResponse } from 'next/server';
import { brmhExecute } from '@/app/lib/brmhExecute';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

interface DriveFile {
  id: string;
  name: string;
  s3Key: string;
  userId?: string;
  [key: string]: unknown;
}

interface EntityTransaction {
  id: string;
  fileId: string;
  userId: string;
  entityName: string;
  fileName: string;
  createdAt: string;
  [key: string]: unknown;
}

// POST /api/entity-files/delete
// Body: { userId: string, fileId: string }
export async function POST(request: Request) {
  try {
    const { userId, fileId } = await request.json();
    
    if (!userId || !fileId) {
      return NextResponse.json({ error: 'userId and fileId are required' }, { status: 400 });
    }

    // Get file metadata using the same approach as the GET route
    const data = await brmhExecute<{ items?: DriveFile[] }>({
      executeType: 'crud',
      crudOperation: 'get',
      tableName: 'brmh-drive-files',
      pagination: 'true',
      itemPerPage: 1000
    });
    
    const items = data.items || [];
    const fileData = items.find((item: DriveFile) => item.id === fileId);

    if (!fileData || !fileData.s3Key) {
      console.error('File not found:', { fileId, availableIds: items.map((i: DriveFile) => i.id) });
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const s3Key = fileData.s3Key;
    console.log('Found file to delete:', { fileId, s3Key, fileName: fileData.name });

    // Delete from S3
    const bucket = process.env.BRMH_S3_BUCKET || process.env.AWS_S3_BUCKET || 'brmh';
    const s3 = new S3Client({ 
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      } : undefined
    });
    
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: s3Key }));
      console.log(`Successfully deleted S3 object: ${s3Key}`);
    } catch (e) {
      console.warn('Failed to delete S3 object, continuing to delete metadata:', e);
    }

    // Delete from brmh-drive-files table (in background to avoid blocking)
    setImmediate(async () => {
      try {
        await brmhExecute({
          executeType: 'crud',
          crudOperation: 'delete',
          tableName: 'brmh-drive-files',
          id: fileId
        });
        console.log(`Successfully deleted file metadata: ${fileId}`);
      } catch (e) {
        console.warn('Background drive metadata delete failed:', e);
      }
    });

    // Delete associated transactions from brmh-entity-transactions (in background)
    setImmediate(async () => {
      try {
        const transactionsData = await brmhExecute<{ items?: EntityTransaction[] }>({
          executeType: 'crud',
          crudOperation: 'get',
          tableName: 'brmh-entity-transactions',
          pagination: 'true',
          itemPerPage: 1000
        });
        
        const transactions = transactionsData.items || [];
        const fileTransactions = transactions.filter((transaction: EntityTransaction) => 
          transaction.fileId === fileId && transaction.userId === userId
        );
        
        // Delete all file transactions in parallel
        await Promise.all(fileTransactions.map(async (transaction: EntityTransaction) => {
          try {
            await brmhExecute({
              executeType: 'crud',
              crudOperation: 'delete',
              tableName: 'brmh-entity-transactions',
              id: transaction.id
            });
          } catch (error) {
            console.warn(`Failed to delete transaction ${transaction.id}:`, error);
          }
        }));
        
        console.log(`Deleted ${fileTransactions.length} transactions for file: ${fileId}`);
      } catch (error) {
        console.warn('Background transaction cleanup failed:', error);
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting entity file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
