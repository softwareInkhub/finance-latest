import { NextResponse } from 'next/server';
import { TABLES } from '../../../config/database';
import { brmhExecute } from '@/app/lib/brmhExecute';

export async function POST(request: Request) {
  try {
    const { userId, cashFlowData } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!cashFlowData) {
      return NextResponse.json(
        { error: 'Cashflow data is required' },
        { status: 400 }
      );
    }

    // Upsert via BRMH execute (put updates)
    const now = new Date().toISOString();
    await brmhExecute({
      executeType: 'crud',
      crudOperation: 'put',
      tableName: TABLES.REPORTS,
      key: { id: `cashflow_${userId}` },
      updates: {
        cashFlowData,
        updatedAt: now,
        userId,
        type: 'cashflow_report',
        createdAt: now
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Cashflow data saved successfully' 
    });

  } catch (error) {
    console.error('Error saving cashflow data:', error);
    return NextResponse.json(
      { error: 'Failed to save cashflow data' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const result = await brmhExecute<{ item?: Record<string, unknown> }>({
      executeType: 'crud', crudOperation: 'get', tableName: TABLES.REPORTS, id: `cashflow_${userId}`
    });

    if (!result.item) {
      return NextResponse.json(null);
    }

    return NextResponse.json(result.item.cashFlowData);

  } catch (error: unknown) {
    // If the table doesn't exist in this region/account, DynamoDB returns ResourceNotFoundException
    const err = error as { name?: string } | undefined;
    if (err?.name === 'ResourceNotFoundException') {
      console.error('Cashflow table not found. Check TABLES.REPORTS and AWS_REGION.', {
        table: TABLES.REPORTS,
        region: process.env.AWS_REGION,
      });
      // Return null so frontend treats it as no data yet instead of a hard error
      return NextResponse.json(null);
    }
    console.error('Error fetching cashflow data:', error, {
      table: TABLES.REPORTS,
      region: process.env.AWS_REGION,
    });
    return NextResponse.json(
      { error: 'Failed to fetch cashflow data' },
      { status: 500 }
    );
  }
}
