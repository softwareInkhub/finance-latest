import { NextResponse } from 'next/server';
import { docClient } from '../aws-client';
import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = 'bank-header';

// GET /api/bank-header?bankName=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bankName = searchParams.get('bankName');
  if (!bankName) {
    return NextResponse.json({ error: 'bankName is required' }, { status: 400 });
  }
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'id = :id',
        ExpressionAttributeValues: { ':id': bankName },
      })
    );
    return NextResponse.json(result.Items?.[0] || null);
  } catch (error) {
    console.error('Error fetching bank header:', error);
    return NextResponse.json({ error: 'Failed to fetch bank header' }, { status: 500 });
  }
}

// POST /api/bank-header
export async function POST(request: Request) {
  try {
    const { bankName, bankId, header, tag, mapping, conditions } = await request.json();
    if (!bankName || !Array.isArray(header)) {
      return NextResponse.json({ error: 'bankName and header[] are required' }, { status: 400 });
    }
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: { id: bankName, bankId: bankId || null, header, tag: tag || null, mapping: mapping || null, conditions: conditions || null },
      })
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving bank header:', error);
    return NextResponse.json({ error: 'Failed to save bank header' }, { status: 500 });
  }
} 