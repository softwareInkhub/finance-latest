import { NextResponse } from 'next/server';
import { brmhCrud, TABLES } from '../../brmh-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const lastKey = searchParams.get('lastKey');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Build scan parameters
    const scanParams: {
      TableName: string;
      FilterExpression: string;
      ExpressionAttributeValues: Record<string, string>;
      Limit: number;
      ExclusiveStartKey?: Record<string, unknown>;
    } = {
      TableName: TABLES.BANK_STATEMENTS,
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      Limit: limit,
    };

    // Add exclusive start key if provided
    if (lastKey) {
      try {
        scanParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastKey));
      } catch (error) {
        console.error('Error parsing lastKey:', error);
      }
    }

    // Fetch transactions with pagination
    const result = await brmhCrud.scan(TABLES.BANK_STATEMENTS, {
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      itemPerPage: limit
    });
    
    const transactions = result.items || [];
    const hasMore = !!result.lastEvaluatedKey;

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
        lastKey: hasMore ? encodeURIComponent(JSON.stringify(result.lastEvaluatedKey)) : null,
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

