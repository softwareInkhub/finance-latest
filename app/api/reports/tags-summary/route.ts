import { NextRequest, NextResponse } from 'next/server';
import { brmhCrud, TABLES } from '../../brmh-client';
import { recomputeAndSaveTagsSummary } from './aggregate';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const result = await brmhCrud.getItem(TABLES.REPORTS, { id: `tags_summary_${userId}` });

    if (!result.item) {
      return NextResponse.json(null);
    }

    return NextResponse.json(result.item);
  } catch (error) {
    console.error('Error fetching tags summary:', error);
    return NextResponse.json({ error: 'Failed to fetch tags summary' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📝 POST /api/reports/tags-summary called');
    const body = await request.json();
    const { userId } = body;
    
    console.log('👤 UserId from request:', userId);
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    console.log('🔄 Calling recomputeAndSaveTagsSummary...');
    await recomputeAndSaveTagsSummary(userId);
    console.log('✅ recomputeAndSaveTagsSummary completed successfully');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error recomputing tags summary:', error);
    return NextResponse.json({ error: 'Failed to recompute tags summary' }, { status: 500 });
  }
}
