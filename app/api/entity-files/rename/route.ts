import { NextResponse } from 'next/server';
import { brmhExecute } from '@/app/lib/brmhExecute';

interface DriveFile {
  id: string;
  name: string;
  s3Key: string;
  userId?: string;
  [key: string]: unknown;
}

// POST /api/entity-files/rename
// Body: { userId: string, fileId: string, newName: string }
export async function POST(request: Request) {
  try {
    const { userId, fileId, newName } = await request.json();
    
    if (!userId || !fileId || !newName) {
      return NextResponse.json({ error: 'userId, fileId and newName are required' }, { status: 400 });
    }

    // Get file metadata directly from DynamoDB
    const fileData = await brmhExecute<DriveFile>({
      executeType: 'crud',
      crudOperation: 'get',
      tableName: 'brmh-drive-files',
      id: fileId
    });

    if (!fileData || !fileData.s3Key) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const s3Key = fileData.s3Key;

    // Rename the file using the existing PUT endpoint
    const renameResponse = await fetch(`${new URL(request.url).origin}/api/entity-files`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fileId, newName, s3Key })
    });

    if (!renameResponse.ok) {
      return NextResponse.json({ error: 'Failed to rename file' }, { status: 500 });
    }

    const result = await renameResponse.json();
    return NextResponse.json({ success: true, s3Key: result.s3Key });
  } catch (error) {
    console.error('Error renaming entity file:', error);
    return NextResponse.json({ error: 'Failed to rename file' }, { status: 500 });
  }
}
