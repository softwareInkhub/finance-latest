import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand, type ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
import { brmhExecute } from '@/app/lib/brmhExecute';

// Types for CRUD items
interface DriveItem {
  id?: unknown;
  ownerId?: unknown;
  type?: unknown;
  path?: unknown;
  s3Key?: unknown;
  name?: unknown;
}

interface StatementItem {
  id?: unknown;
  s3FileUrl?: unknown;
}

function isOwnedS3ItemForPrefix(it: DriveItem, userId: string, prefix: string): it is { id: string; ownerId: string; s3Key: string; path?: string } {
  return (
    typeof it === 'object' && it !== null &&
    typeof it.id === 'string' &&
    typeof it.ownerId === 'string' && it.ownerId === userId &&
    typeof it.s3Key === 'string' && it.s3Key.startsWith(prefix)
  );
}

function isEntityFolder(it: DriveItem, userId: string, exactPath: string): it is { id: string; ownerId: string; type: string; path: string } {
  return (
    typeof it === 'object' && it !== null &&
    typeof it.id === 'string' &&
    typeof it.ownerId === 'string' && it.ownerId === userId &&
    typeof it.type === 'string' && it.type === 'folder' &&
    typeof it.path === 'string' && it.path === exactPath
  );
}

function isStatement(it: StatementItem): it is { id: string; s3FileUrl: string } {
  return typeof it === 'object' && it !== null && typeof it.id === 'string' && typeof it.s3FileUrl === 'string';
}

export async function POST(request: Request) {
  try {
    const { userId, oldName, newName } = await request.json();
    if (!userId || !oldName || !newName) {
      return NextResponse.json({ error: 'userId, oldName and newName are required' }, { status: 400 });
    }
    const cleanedOld = String(oldName).trim();
    const cleanedNew = String(newName).trim();
    if (!cleanedOld || !cleanedNew) return NextResponse.json({ error: 'Invalid names' }, { status: 400 });

    const region = process.env.AWS_REGION || 'us-east-1';
    const bucket = process.env.BRMH_S3_BUCKET || process.env.AWS_S3_BUCKET || 'brmh';

    const oldPrefix = `brmh-drive/users/${userId}/entities/${cleanedOld}/`;
    const newPrefix = `brmh-drive/users/${userId}/entities/${cleanedNew}/`;

    // 1) Move objects in S3 by copy+delete
    const s3 = new S3Client({ region });
    let token: string | undefined = undefined;
    do {
      const out: ListObjectsV2CommandOutput = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: oldPrefix, ContinuationToken: token }));
      const contents = out.Contents || [];
      for (const obj of contents) {
        if (!obj.Key) continue;
        const newKey = obj.Key.replace(oldPrefix, newPrefix);
        await s3.send(new CopyObjectCommand({ Bucket: bucket, CopySource: encodeURIComponent(`${bucket}/${obj.Key}`), Key: newKey }));
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }));
      }
      token = out.IsTruncated ? out.NextContinuationToken : undefined;
    } while (token);

    // 2) Update drive metadata records
    const data = await brmhExecute<{ items?: DriveItem[] }>({
      executeType: 'crud',
      crudOperation: 'get',
      tableName: 'brmh-drive-files',
      pagination: 'true',
      itemPerPage: 1000
    });
    const items = data.items || [];
    const updates = items.filter((it) => isOwnedS3ItemForPrefix(it, userId, oldPrefix));
    
    // Update all files in parallel
    await Promise.all(updates.map(async (it) => {
      try {
        const id = it.id as string;
        const s3Key = (it.s3Key as string).replace(oldPrefix, newPrefix);
        const path = typeof it.path === 'string' ? it.path.replace(`entities/${cleanedOld}`, `entities/${cleanedNew}`) : `entities/${cleanedNew}`;
        await brmhExecute({
          executeType: 'crud',
          crudOperation: 'put',
          tableName: 'brmh-drive-files',
          key: { id },
          updates: { s3Key, path, updatedAt: new Date().toISOString() }
        });
      } catch (error) {
        console.warn(`Failed to update drive item ${it.id}:`, error);
      }
    }));
    
    // Update the folder record itself
    const folder = items.find((it) => isEntityFolder(it, userId, `entities/${cleanedOld}`));
    if (folder) {
      try {
        await brmhExecute({
          executeType: 'crud',
          crudOperation: 'put',
          tableName: 'brmh-drive-files',
          key: { id: folder.id },
          updates: {
            name: cleanedNew,
            path: `entities/${cleanedNew}`,
            s3Key: `brmh-drive/users/${userId}/entities/${cleanedNew}`,
            updatedAt: new Date().toISOString()
          }
        });
      } catch (error) {
        console.warn(`Failed to update folder ${folder.id}:`, error);
      }
    }

    // 3) Update statement URLs that reference old prefix (best-effort)
    const statementsTable = process.env.AWS_DYNAMODB_STATEMENTS_TABLE || 'bank-statements';
    try {
      const data = await brmhExecute<{ items?: StatementItem[] }>({
        executeType: 'crud',
        crudOperation: 'get',
        tableName: statementsTable,
        pagination: 'true',
        itemPerPage: 1000
      });
      const items = data.items || [];
      const updates = items.filter(isStatement).map(async (it) => {
        const { id, s3FileUrl } = it;
        const updated = s3FileUrl.replace(oldPrefix, newPrefix);
        if (updated !== s3FileUrl) {
          try {
            await brmhExecute({
              executeType: 'crud',
              crudOperation: 'put',
              tableName: statementsTable,
              key: { id },
              updates: { s3FileUrl: updated, updatedAt: new Date().toISOString() }
            });
          } catch (error) {
            console.warn(`Failed to update statement ${id}:`, error);
          }
        }
      });
      await Promise.all(updates);
    } catch (error) {
      console.warn('Failed to update statement URLs:', error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error renaming entity:', error);
    return NextResponse.json({ error: 'Failed to rename entity' }, { status: 500 });
  }
}


