import { NextResponse } from 'next/server';
import { brmhCrud } from '../brmh-client';

const TABLE_NAME = 'bank-header';

// GET /api/bank-header?bankName=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bankName = searchParams.get('bankName');
  
  if (!bankName) {
    return NextResponse.json({ error: 'bankName is required' }, { status: 400 });
  }
  
  try {
    const result = await brmhCrud.scan(TABLE_NAME, {
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: { 
        ':id': bankName
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
    const { bankName, bankId, header, tag, mapping, conditions, userId, userEmail } = await request.json();
    if (!bankName || !Array.isArray(header)) {
      return NextResponse.json({ error: 'bankName and header[] are required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    // Check if user is admin
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      return NextResponse.json(
        { error: 'Admin email not configured' },
        { status: 500 }
      );
    }
    if (userEmail !== adminEmail) {
      return NextResponse.json(
        { error: 'Only admin can manage bank headers' },
        { status: 403 }
      );
    }
    
    // Check if bank header already exists
    const existingData = await brmhCrud.scan(TABLE_NAME, {
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: { 
        ':id': bankName
      },
      itemPerPage: 1
    });
    
    const existingItem = existingData.items?.[0];
    
    // Preserve existing mapping and conditions if not provided in request
    const finalMapping = mapping !== undefined ? mapping : (existingItem?.mapping || null);
    const finalConditions = conditions !== undefined ? conditions : (existingItem?.conditions || null);
    const finalTag = tag !== undefined ? tag : (existingItem?.tag || null);
    
    await brmhCrud.create(TABLE_NAME, { 
      id: bankName, 
      bankId: bankId || null, 
      header, 
      tag: finalTag, 
      mapping: finalMapping, 
      conditions: finalConditions,
      createdBy: userId 
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving bank header:', error);
    return NextResponse.json({ error: 'Failed to save bank header' }, { status: 500 });
  }
} 