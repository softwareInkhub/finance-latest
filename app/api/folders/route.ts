import { NextResponse } from 'next/server';
import { brmhDrive } from '../brmh-drive-client';

// GET /api/folders?userId=xxx&parentId=ROOT&limit=50
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const parentId = searchParams.get('parentId') || 'ROOT';
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    // Get folders from BRMH Drive
    const foldersResult = await brmhDrive.listFolders(userId, parentId, limit);
    
    return NextResponse.json(foldersResult);
  } catch (error) {
    console.error('Error listing folders:', error);
    return NextResponse.json({ error: 'Failed to list folders' }, { status: 500 });
  }
}

// POST /api/folders - Create folder
export async function POST(request: Request) {
  try {
    const { userId, folderData, parentId = 'ROOT' } = await request.json();
    
    if (!userId || !folderData?.name) {
      return NextResponse.json({ error: 'userId and folder name are required' }, { status: 400 });
    }
    
    // Create folder using BRMH Drive
    const folderResult = await brmhDrive.createFolder(userId, folderData, parentId);
    
    return NextResponse.json(folderResult);
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}











