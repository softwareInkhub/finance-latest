import { NextResponse } from 'next/server';
import { brmhDrive } from '../../brmh-drive-client';

export async function POST(request: Request) {
  try {
    const { fileId, key } = await request.json();
    
    // Support both fileId (new) and key (legacy) parameters
    const targetFileId = fileId || key;
    if (!targetFileId) {
      return NextResponse.json({ error: 'Missing fileId or key' }, { status: 400 });
    }
    
    // Generate download URL using BRMH Drive
    const result = await brmhDrive.downloadFile('default-user', targetFileId);
    const url = result.url;
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
  }
} 