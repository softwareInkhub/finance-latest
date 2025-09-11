import { NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../aws-client';
import { brmhExecute } from '@/app/lib/brmhExecute';

// Lists files saved via BRMH drive under entities/<entityName>/
// GET /api/entity-files?userId=...&entityName=...
type DriveItem = {
  id?: unknown;
  name?: unknown;
  createdAt?: unknown;
  s3Key?: unknown;
  ownerId?: unknown;
  type?: unknown;
  path?: unknown;
};

function isDriveItem(obj: unknown): obj is DriveItem {
  return typeof obj === 'object' && obj !== null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const entityName = searchParams.get('entityName');
    if (!userId || !entityName) {
      return NextResponse.json({ error: 'userId and entityName are required' }, { status: 400 });
    }

    const data = await brmhExecute<{ items?: unknown[] }>({
      executeType: 'crud',
      crudOperation: 'get',
      tableName: 'brmh-drive-files',
      pagination: 'true',
      itemPerPage: 1000
    });
    const items = data.items || [];
    const basePath = `entities/${entityName}/`;
    const files = items
      .filter(isDriveItem)
      .filter((it) => it.type === 'file' && it.ownerId === userId)
      .filter((it) => typeof it.path === 'string' && (it.path as string).startsWith(basePath))
      .map((it) => ({
        id: String(it.id ?? ''),
        name: String(it.name ?? ''),
        createdAt: String(it.createdAt ?? ''),
        s3Key: String(it.s3Key ?? ''),
      }));

    return NextResponse.json(files);
  } catch (error) {
    console.error('Error listing entity files:', error);
    return NextResponse.json({ error: 'Failed to list entity files' }, { status: 500 });
  }
}

// DELETE /api/entity-files?id=...&s3Key=...
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const s3Key = searchParams.get('s3Key');
    if (!id || !s3Key) {
      return NextResponse.json({ error: 'id and s3Key are required' }, { status: 400 });
    }

    const bucket = process.env.BRMH_S3_BUCKET || process.env.AWS_S3_BUCKET || 'brmh';
    const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: s3Key }));
    } catch (e) {
      console.warn('Failed to delete S3 object, continuing to delete metadata:', e);
    }

    // Kick off metadata delete asynchronously to avoid blocking the client if backend is slow
    setImmediate(async () => {
      try {
        await brmhExecute({
          executeType: 'crud',
          crudOperation: 'delete',
          tableName: 'brmh-drive-files',
          id
        });
      } catch (e) {
        console.warn('Background drive metadata delete failed:', e);
      }
    });

    // Also delete any rows in brmh-entity-transactions that were created from this file
    // Run in background so the client isn't blocked by slow backend/cache issues
    try {
      const s3FileUrl = `https://${bucket}.s3.amazonaws.com/${s3Key}`;
      // Fire-and-forget cleanup
      setImmediate(async () => {
        try {
          // Prefer direct DynamoDB scan+delete to avoid backend dependencies
          let lastKey: Record<string, unknown> | undefined = undefined;
          const targets: Array<Record<string, unknown>> = [];
          do {
            const scanRes = await docClient.send(new ScanCommand({
              TableName: 'brmh-entity-transactions',
              FilterExpression: '#fid = :fid OR #u = :u',
              ExpressionAttributeNames: { '#u': 's3FileUrl', '#fid': 'fileId' },
              ExpressionAttributeValues: { ':u': s3FileUrl, ':fid': id },
              ExclusiveStartKey: lastKey as Record<string, unknown>,
            }));
            const items = (scanRes.Items as Array<Record<string, unknown>> | undefined) || [];
            targets.push(...items);
            lastKey = scanRes.LastEvaluatedKey as Record<string, unknown> | undefined;
          } while (lastKey);

          console.log(`Found ${targets.length} related entity transactions to delete`);

          // Delete all related transactions in parallel (EXACTLY like banks)
          if (targets.length > 0) {
            const deletePromises = targets.map(async (it) => {
              // Try composite key first (entityName + transactionId)
              const entityName = it['entityName'];
              const transactionId = (it['transactionId'] || it['transactionid']);
              
              if (typeof entityName === 'string' && typeof transactionId === 'string') {
                return docClient.send(new DeleteCommand({
                  TableName: 'brmh-entity-transactions',
                  Key: { entityName, transactionId }
                }));
              }
              
              // Fallback to id if composite key not available
              const id = it['id'];
              if (typeof id === 'string') {
                return docClient.send(new DeleteCommand({
                  TableName: 'brmh-entity-transactions', 
                  Key: { id }
                }));
              }
              
              return Promise.resolve();
            });
            
            await Promise.all(deletePromises);
            console.log(`Successfully deleted ${targets.length} entity transactions`);
          }
        } catch (err) {
          console.warn('Background entity transactions cleanup failed:', err);
        }
      });
    } catch (e) {
      console.warn('Failed to schedule entity transactions cleanup:', e);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting entity file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}

// PUT rename: body { id, newName, s3Key }
export async function PUT(request: Request) {
  try {
    const { id, newName, s3Key } = await request.json();
    if (!id || !newName || !s3Key) {
      return NextResponse.json({ error: 'id, newName and s3Key are required' }, { status: 400 });
    }
    const bucket = process.env.BRMH_S3_BUCKET || process.env.AWS_S3_BUCKET || 'brmh';
    const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    const newKey = s3Key.replace(/[^/]+$/, newName);
    // Copy to new key then delete old
    await s3.send(new CopyObjectCommand({ Bucket: bucket, CopySource: `${bucket}/${s3Key}`, Key: newKey }));
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: s3Key }));

    await brmhExecute({
      executeType: 'crud',
      crudOperation: 'put',
      tableName: 'brmh-drive-files',
      key: { id },
      updates: { 
        name: newName, 
        s3Key: newKey, 
        updatedAt: new Date().toISOString() 
      }
    });
    return NextResponse.json({ success: true, s3Key: newKey });
  } catch (error) {
    console.error('Error renaming entity file:', error);
    return NextResponse.json({ error: 'Failed to rename file' }, { status: 500 });
  }
}


