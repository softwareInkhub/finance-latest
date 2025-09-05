import { NextResponse } from 'next/server';
import { brmhExecute } from '@/app/lib/brmhExecute';

export async function GET() {
  try {
    const r = await brmhExecute<{ items?: unknown[] }>({
      executeType: 'crud',
      crudOperation: 'get',
      tableName: 'banks',
      pagination: 'true',
      itemPerPage: 1000
    });
    return NextResponse.json(r.items || []);
  } catch (error) {
    console.error('Error fetching banks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch banks' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const item = await request.json();
    if (!item?.bankName) {
      return NextResponse.json(
        { error: 'Bank name is required' },
        { status: 400 }
      );
    }
    const r = await brmhExecute({
      executeType: 'crud',
      crudOperation: 'post',
      tableName: 'banks',
      item
    });
    return NextResponse.json(r);
  } catch (error) {
    console.error('Error creating bank:', error);
    return NextResponse.json(
      { error: 'Failed to create bank' },
      { status: 500 }
    );
  }
}