import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand, type ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';

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
    const crudBase = process.env.BRMH_CRUD_API_BASE_URL || process.env.CRID_API_BASE_URL || process.env.CRUD_API_BASE_URL || 'http://localhost:5001';

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
    const listRes = await fetch(`${crudBase}/crud?tableName=brmh-drive-files&pagination=true&itemPerPage=1000`, { method: 'GET', cache: 'no-store' });
    if (listRes.ok) {
      const data = await listRes.json();
      const items = (data?.items as DriveItem[] | undefined) || [];
      const updates = items.filter((it) => isOwnedS3ItemForPrefix(it, userId, oldPrefix));
      for (const it of updates) {
        const id = it.id as string;
        const s3Key = (it.s3Key as string).replace(oldPrefix, newPrefix);
        const path = typeof it.path === 'string' ? it.path.replace(`entities/${cleanedOld}`, `entities/${cleanedNew}`) : `entities/${cleanedNew}`;
        await fetch(`${crudBase}/crud?tableName=brmh-drive-files`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableName: 'brmh-drive-files',
            key: { id },
            updates: { s3Key, path, updatedAt: new Date().toISOString() }
          })
        });
      }
      // Update the folder record itself
      const folder = items.find((it) => isEntityFolder(it, userId, `entities/${cleanedOld}`));
      if (folder) {
        await fetch(`${crudBase}/crud?tableName=brmh-drive-files`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableName: 'brmh-drive-files',
            key: { id: folder.id },
            updates: {
              name: cleanedNew,
              path: `entities/${cleanedNew}`,
              s3Key: `brmh-drive/users/${userId}/entities/${cleanedNew}`,
              updatedAt: new Date().toISOString()
            }
          })
        });
      }
    }

    // 3) Update statement URLs that reference old prefix (best-effort)
    const statementsTable = process.env.AWS_DYNAMODB_STATEMENTS_TABLE || 'bank-statements';
    const stmRes = await fetch(`${crudBase}/crud?tableName=${encodeURIComponent(statementsTable)}&pagination=true&itemPerPage=1000`, { method: 'GET', cache: 'no-store' });
    if (stmRes.ok) {
      const data = await stmRes.json();
      const items = (data?.items as StatementItem[] | undefined) || [];
      for (const it of items) {
        if (!isStatement(it)) continue;
        const { id, s3FileUrl } = it;
        const updated = s3FileUrl.replace(oldPrefix, newPrefix);
        if (updated !== s3FileUrl) {
          await fetch(`${crudBase}/crud?tableName=${encodeURIComponent(statementsTable)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableName: statementsTable, key: { id }, updates: { s3FileUrl: updated, updatedAt: new Date().toISOString() } })
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error renaming entity:', error);
    return NextResponse.json({ error: 'Failed to rename entity' }, { status: 500 });
  }
}


