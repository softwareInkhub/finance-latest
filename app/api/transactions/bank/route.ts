import { NextResponse } from 'next/server';
import { getBankTransactionTable } from '../../../config/database';
import { brmhExecute } from '@/app/lib/brmhExecute';

// GET /api/transactions/bank?bankName=xxx&userId=yyy
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
    // Get bank-specific table name
    const tableName = getBankTransactionTable(bankName);
    
    // Fetch all transactions for this bank and user
    const txRes = await brmhExecute<{ items?: Record<string, unknown>[] }>({ executeType: 'crud', crudOperation: 'get', tableName, pagination: 'true', itemPerPage: 1000 });
    const allTransactions = (txRes.items || []).filter(t => (t as Record<string, unknown>).userId === userId);

    // Fetch all tags to populate tag data
    const tagsTable = process.env.AWS_DYNAMODB_TAGS_TABLE || 'tags';
    type TagRow = { id?: string } & Record<string, unknown>;
    const tagsRes = await brmhExecute<{ items?: TagRow[] }>({ executeType: 'crud', crudOperation: 'get', tableName: tagsTable, pagination: 'true', itemPerPage: 1000 });
    const allTags = tagsRes.items || [];
    const tagsMap = new Map<string, TagRow>(allTags.filter(t => typeof t.id === 'string').map(tag => [tag.id as string, tag]));

    // Populate tag data for each transaction (handle both string IDs and full objects)
    const transactions = allTransactions.map((transaction: Record<string, unknown>) => {
      const maybeTags = transaction.tags as unknown;
      if (Array.isArray(maybeTags)) {
        const mapped = (maybeTags as unknown[])
          .map((tag: unknown) => (typeof tag === 'string' ? tagsMap.get(tag) : tag))
          .filter(Boolean);
        transaction.tags = mapped as unknown[];
      }
      return transaction;
    });

    console.log(`Fetched ${transactions.length} transactions for bank ${bankName} and user ${userId}`);
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
