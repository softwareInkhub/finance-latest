import { NextResponse } from 'next/server';
import { brmhDrive } from '../../../brmh-drive-client';

// GET /api/folders/[id]/contents?userId=xxx&limit=50
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    // Get folder contents from BRMH Drive
    const contentsResult = await brmhDrive.listFolderContents(userId, id, limit);
    
    return NextResponse.json(contentsResult);
  } catch (error) {
    console.error('Error getting folder contents:', error);
    return NextResponse.json({ error: 'Failed to get folder contents' }, { status: 500 });
  }
}


