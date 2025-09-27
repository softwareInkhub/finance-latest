import { NextResponse } from 'next/server';
import { brmhCrud } from '../brmh-client';

const TABLE_NAME = 'bank-header';

// GET /api/bank-header?bankName=xxx&userId=yyy
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bankName = searchParams.get('bankName');
  const userId = searchParams.get('userId');
  
  if (!bankName) {
    return NextResponse.json({ error: 'bankName is required' }, { status: 400 });
  }
  
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  
  try {
    const result = await brmhCrud.scan(TABLE_NAME, {
      FilterExpression: 'id = :id AND userId = :userId',
      ExpressionAttributeValues: { 
        ':id': bankName,
        ':userId': userId 
      },
      itemPerPage: 1  // Only fetch 1 item since we expect only one match
    });
    return NextResponse.json(result.items?.[0] || null);
  } catch (error) {
    console.error('Error fetching bank header:', error);
    return NextResponse.json({ error: 'Failed to fetch bank header' }, { status: 500 });
  }
}

// POST /api/bank-header
export async function POST(request: Request) {
  try {
    const { bankName, bankId, header, tag, mapping, conditions, userId } = await request.json();
    if (!bankName || !Array.isArray(header)) {
      return NextResponse.json({ error: 'bankName and header[] are required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    await brmhCrud.create(TABLE_NAME, { 
      id: bankName, 
      bankId: bankId || null, 
      header, 
      tag: tag || null, 
      mapping: mapping || null, 
      conditions: conditions || null,
      userId 
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving bank header:', error);
    return NextResponse.json({ error: 'Failed to save bank header' }, { status: 500 });
  }
} 