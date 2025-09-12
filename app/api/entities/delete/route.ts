import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, DeleteObjectCommand, type ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
import { brmhExecute } from '@/app/lib/brmhExecute';

interface EntityTransaction {
  id: string;
  fileId: string;
  userId: string;
  entityName: string;
  fileName: string;
  createdAt: string;
  [key: string]: unknown;
}

interface DriveItem {
  id?: unknown;
  ownerId?: unknown;
  type?: unknown;
  path?: unknown;
  s3Key?: unknown;
}

function isOwnedItemWithPrefix(it: DriveItem, userId: string, prefix: string): it is { id: string; ownerId: string; s3Key?: string; path?: string } {
  return (
    typeof it === 'object' && it !== null &&
    typeof it.id === 'string' &&
    typeof it.ownerId === 'string' && it.ownerId === userId &&
    (typeof it.s3Key === 'string' ? it.s3Key.startsWith(prefix) : true)
  );
}

export async function DELETE(request: Request) {
  try {
    const { userId, entityName } = await request.json();
    if (!userId || !entityName) {
      return NextResponse.json({ error: 'userId and entityName are required' }, { status: 400 });
    }

    console.log(`Deleting entity: ${entityName} for user: ${userId}`);

    const region = process.env.AWS_REGION || 'us-east-1';
    const bucket = process.env.BRMH_S3_BUCKET || process.env.AWS_S3_BUCKET || 'brmh';

    const prefix = `brmh-drive/users/${userId}/entities/${String(entityName).trim()}/`;

    // 1) Delete S3 objects under the entity prefix
    const s3 = new S3Client({ region });
    let token: string | undefined = undefined;
    do {
      const out: ListObjectsV2CommandOutput = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
      const contents = out.Contents || [];
      for (const obj of contents) {
        if (!obj.Key) continue;
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }));
      }
      token = out.IsTruncated ? out.NextContinuationToken : undefined;
    } while (token);

    // 2) Delete drive metadata records
    const data = await brmhExecute<{ items?: DriveItem[] }>({
      executeType: 'crud',
      crudOperation: 'get',
      tableName: 'brmh-drive-files',
      pagination: 'true',
      itemPerPage: 1000
    });
    const items = data.items || [];
    const targets = items.filter((it) => isOwnedItemWithPrefix(it, userId, prefix) || (typeof it.path === 'string' && it.path === `entities/${entityName}`));
    
    // Delete all targets in parallel
    await Promise.all(targets.map(async (it) => {
      try {
        await brmhExecute({
          executeType: 'crud',
          crudOperation: 'delete',
          tableName: 'brmh-drive-files',
          id: it.id
        });
      } catch (error) {
        console.warn(`Failed to delete drive item ${it.id}:`, error);
      }
    }));

    // 3) Delete entity transactions from brmh-entity-transactions
    try {
      console.log(`Starting transaction cleanup for entity: ${entityName}, userId: ${userId}`);
      
      // Check if backend is accessible first
      const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
      console.log(`Attempting to connect to backend at: ${backendUrl}`);
      
      const transactionsData = await brmhExecute<{ items?: EntityTransaction[] }>({
        executeType: 'crud',
        crudOperation: 'get',
        tableName: 'brmh-entity-transactions',
        pagination: 'true',
        itemPerPage: 1000
      });
      
      const transactions = transactionsData.items || [];
      console.log(`Found ${transactions.length} total transactions in brmh-entity-transactions table`);
      
      const entityTransactions = transactions.filter((transaction: EntityTransaction) => 
        transaction.entityName === entityName && transaction.userId === userId
      );
      
      console.log(`Found ${entityTransactions.length} transactions for entity ${entityName} (userId: ${userId})`);
      
      if (entityTransactions.length > 0) {
        console.log('Transaction IDs to delete:', entityTransactions.map((t: EntityTransaction) => t.id));
        
        // Delete all entity transactions in parallel
        const deleteResults = await Promise.all(entityTransactions.map(async (transaction: EntityTransaction) => {
          try {
            const result = await brmhExecute({
              executeType: 'crud',
              crudOperation: 'delete',
              tableName: 'brmh-entity-transactions',
              id: transaction.id
            });
            console.log(`Successfully deleted transaction ${transaction.id}:`, result);
            return { success: true, id: transaction.id };
          } catch (error) {
            console.warn(`Failed to delete transaction ${transaction.id}:`, error);
            return { success: false, id: transaction.id, error };
          }
        }));
        
        const successCount = deleteResults.filter(r => r.success).length;
        const failureCount = deleteResults.filter(r => !r.success).length;
        
        console.log(`Transaction cleanup completed: ${successCount} successful, ${failureCount} failed`);
      } else {
        console.log(`No transactions found for entity ${entityName} - this might be expected if no CSV files were uploaded`);
      }
      
      console.log(`Completed transaction cleanup for entity: ${entityName}`);
    } catch (error) {
      console.error('Failed to cleanup entity transactions:', error);
      
      // Check if it's a backend connection error
      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED') || error.message.includes('5001')) {
          console.error('BACKEND SERVER NOT ACCESSIBLE - Transaction cleanup skipped');
          console.error('This means transactions in brmh-entity-transactions will NOT be deleted');
          console.error('Please start the backend server on port 5001 to enable transaction cleanup');
        }
      }
    }

    console.log(`Successfully deleted entity: ${entityName} (${targets.length} items removed)`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting entity:', error);
    return NextResponse.json({ error: 'Failed to delete entity' }, { status: 500 });
  }
}




