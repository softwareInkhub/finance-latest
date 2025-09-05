import { NextResponse } from 'next/server';
import { brmhExecute } from '@/app/lib/brmhExecute';
import { TABLES } from '../../../config/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const tableName = TABLES.BANK_STATEMENTS;
    const pageRes = await brmhExecute<{ items?: Record<string, unknown>[] }>({
      executeType: 'crud', crudOperation: 'get', tableName, pagination: 'true', itemPerPage: limit
    });
    const transactions = (pageRes.items || []).filter(t => (t as Record<string, unknown>).userId === userId);
    const hasMore = false;

    // Sort transactions by date (most recent first)
    const sortedTransactions = transactions.sort((a: Record<string, unknown>, b: Record<string, unknown>) => 
      new Date((b.createdAt as string) || '0').getTime() - new Date((a.createdAt as string) || '0').getTime()
    );

    return NextResponse.json({
      transactions: sortedTransactions,
      pagination: {
        page,
        limit,
        hasMore,
        lastKey: null,
        totalLoaded: transactions.length,
      }
    });

  } catch (error) {
    console.error('Error fetching paginated transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

