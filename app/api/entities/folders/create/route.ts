import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST(request: Request) {
  try {
    const { userId, entityName, folderName } = await request.json();
    if (!userId || !entityName || !folderName) {
      return NextResponse.json({ error: 'userId, entityName, folderName are required' }, { status: 400 });
    }
    const region = process.env.AWS_REGION || 'us-east-1';
    const bucket = process.env.BRMH_S3_BUCKET || process.env.AWS_S3_BUCKET || 'brmh';
    const crudBase = process.env.BRMH_CRUD_API_BASE_URL || process.env.CRID_API_BASE_URL || process.env.CRUD_API_BASE_URL || 'http://localhost:5001';

    const s3 = new S3Client({ region });
    const path = `entities/${entityName}/${folderName}`;
    const s3KeyBase = `brmh-drive/users/${userId}/${path}`;
    const now = new Date().toISOString();

    // S3 placeholder
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: `${s3KeyBase}/.folder`,
      Body: JSON.stringify({ type: 'folder', created: now }),
      ContentType: 'application/json'
    }));

    // Metadata
    await fetch(`${crudBase}/crud?tableName=brmh-drive-files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableName: 'brmh-drive-files',
        item: {
          id: `FOLDER_${entityName}_${folderName}_${Date.now()}`,
          name: folderName,
          type: 'folder',
          parentId: `entities/${entityName}`,
          path,
          s3Key: s3KeyBase,
          createdAt: now,
          updatedAt: now,
          ownerId: userId
        }
      })
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating entity folder:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}



