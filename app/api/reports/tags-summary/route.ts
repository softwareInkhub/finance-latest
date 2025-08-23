import { NextRequest, NextResponse } from 'next/server';
import { docClient, TABLES } from '../../aws-client';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { recomputeAndSaveTagsSummary } from './aggregate';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const result = await docClient.send(new GetCommand({
      TableName: TABLES.REPORTS,
      Key: { id: `tags_summary_${userId}` }
    }));

    if (!result.Item) {
      return NextResponse.json(null);
    }

    return NextResponse.json(result.Item);
  } catch (error) {
    console.error('Error fetching tags summary:', error);
    return NextResponse.json({ error: 'Failed to fetch tags summary' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    await recomputeAndSaveTagsSummary(userId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recomputing tags summary:', error);
    return NextResponse.json({ error: 'Failed to recompute tags summary' }, { status: 500 });
  }
}
