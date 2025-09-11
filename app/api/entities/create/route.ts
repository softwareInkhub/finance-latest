import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { brmhExecute } from '@/app/lib/brmhExecute';

export async function POST(request: Request) {
  try {
    const { userId, entityName } = await request.json();
    if (!userId || !entityName || typeof entityName !== 'string') {
      return NextResponse.json({ error: 'userId and entityName are required' }, { status: 400 });
    }

    const cleaned = entityName.trim();
    if (!cleaned) {
      return NextResponse.json({ error: 'Invalid entityName' }, { status: 400 });
    }

    const folderId = `FOLDER_${cleaned.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
    const s3KeyBase = `brmh-drive/users/${userId}/entities/${cleaned}`;
    const now = new Date().toISOString();

    // Write folder metadata to BRMH drive files table
    await brmhExecute({
      executeType: 'crud',
      crudOperation: 'post',
      tableName: 'brmh-drive-files',
      item: {
        id: folderId,
        name: cleaned,
        type: 'folder',
        parentId: 'ROOT',
        path: `entities/${cleaned}`,
        s3Key: s3KeyBase,
        description: '',
        createdAt: now,
        updatedAt: now,
        ownerId: userId
      }
    });

    // Create placeholder object in S3
    const region = process.env.AWS_REGION || 'us-east-1';
    const bucket = process.env.BRMH_S3_BUCKET || process.env.AWS_S3_BUCKET || 'brmh';
    const s3 = new S3Client({ region });
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: `${s3KeyBase}/.folder`,
      Body: JSON.stringify({ type: 'folder', created: now }),
      ContentType: 'application/json'
    }));

    return NextResponse.json({ success: true, id: folderId, path: `entities/${cleaned}` });
  } catch (error) {
    console.error('Error creating entity:', error);
    return NextResponse.json({ error: 'Failed to create entity' }, { status: 500 });
  }
}




