import { NextResponse } from 'next/server';
import { brmhExecute } from '@/app/lib/brmhExecute';



// GET /api/account?bankId=xxx&userId=yyy
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const bankId = searchParams.get('bankId');
  const userId = searchParams.get('userId');

  try {
    const r = await brmhExecute<{ items?: Record<string, unknown>[]; item?: Record<string, unknown> }>({
      executeType: 'crud',
      crudOperation: 'get',
      tableName: 'accounts',
      ...(accountId ? { id: accountId } : { pagination: 'true', itemPerPage: 1000 })
    });

    if (accountId) {
      return NextResponse.json(r.item || {});
    }

    let items = r.items || [];
    if (bankId && bankId !== 'all') items = items.filter(a => a.bankId === bankId);
    if (userId) items = items.filter(a => a.userId === userId);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

// POST /api/account
export async function POST(request: Request) {
  try {
    const item = await request.json();
    if (!item?.bankId || !item?.accountHolderName || !item?.accountNumber || !item?.ifscCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const r = await brmhExecute({
      executeType: 'crud',
      crudOperation: 'post',
      tableName: 'accounts',
      item
    });
    return NextResponse.json(r);
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}