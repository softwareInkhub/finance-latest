import { NextResponse } from 'next/server';
import { recomputeAndSaveTagsSummary } from '../aggregate';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Start the recomputation asynchronously
    recomputeAndSaveTagsSummary(userId).catch(error => {
      console.error('Error recomputing tags summary:', error);
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Tag summary recomputation started in background'
    });
  } catch (error) {
    console.error('Error starting tag summary update:', error);
    return NextResponse.json({ error: 'Failed to start tag summary update' }, { status: 500 });
  }
}






