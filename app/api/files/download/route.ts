import { NextResponse } from 'next/server';
import { brmhDrive } from '../../brmh-drive-client';

// GET /api/files/download?userId=xxx&fileId=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const fileId = searchParams.get('fileId');
    
    if (!userId || !fileId) {
      return NextResponse.json({ error: 'userId and fileId are required' }, { status: 400 });
    }
    
    // Get download URL from BRMH Drive
    const downloadResult = await brmhDrive.downloadFile(userId, fileId);
    
    return NextResponse.json(downloadResult);
  } catch (error) {
    console.error('Error getting download URL:', error);
    return NextResponse.json({ error: 'Failed to get download URL' }, { status: 500 });
  }
}
