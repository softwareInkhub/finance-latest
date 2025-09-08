import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, DeleteObjectCommand, type ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';

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

    const region = process.env.AWS_REGION || 'us-east-1';
    const bucket = process.env.BRMH_S3_BUCKET || process.env.AWS_S3_BUCKET || 'brmh';
    const crudBase = process.env.BRMH_CRUD_API_BASE_URL || process.env.CRID_API_BASE_URL || process.env.CRUD_API_BASE_URL || 'http://localhost:5001';

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
    const listRes = await fetch(`${crudBase}/crud?tableName=brmh-drive-files&pagination=true&itemPerPage=1000`, { method: 'GET', cache: 'no-store' });
    if (listRes.ok) {
      const data = await listRes.json();
      const items = (data?.items as DriveItem[] | undefined) || [];
      const targets = items.filter((it) => isOwnedItemWithPrefix(it, userId, prefix) || (typeof it.path === 'string' && it.path === `entities/${entityName}`));
      for (const it of targets) {
        await fetch(`${crudBase}/crud?tableName=brmh-drive-files`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tableName: 'brmh-drive-files', id: it.id })
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting entity:', error);
    return NextResponse.json({ error: 'Failed to delete entity' }, { status: 500 });
  }
}



