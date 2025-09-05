import { NextResponse } from 'next/server';
import { brmhExecute } from '@/app/lib/brmhExecute';

const TABLE_NAME = 'bank-header';

// GET /api/bank-header?bankName=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bankName = searchParams.get('bankName');
  if (!bankName) {
    return NextResponse.json({ error: 'bankName is required' }, { status: 400 });
  }
  try {
    const r = await brmhExecute<{ items?: Record<string, unknown>[] }>({ executeType: 'crud', crudOperation: 'get', tableName: TABLE_NAME, pagination: 'true', itemPerPage: 100 });
    const item = (r.items || []).find(i => i.id === bankName) || null;
    return NextResponse.json(item);
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
    await brmhExecute({ executeType: 'crud', crudOperation: 'post', tableName: TABLE_NAME, item: { id: bankName, bankId: bankId || null, header, tag: tag || null, mapping: mapping || null, conditions: conditions || null } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving bank header:', error);
    return NextResponse.json({ error: 'Failed to save bank header' }, { status: 500 });
  }
} 