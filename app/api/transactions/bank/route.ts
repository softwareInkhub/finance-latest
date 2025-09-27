import { NextResponse } from 'next/server';
import { brmhCrud, getBankTransactionTable } from '../../brmh-client';

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
    
    // First, get user's accounts to filter transactions
    const accountsResult = await brmhCrud.scan('accounts', {
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    });
    const userAccounts = accountsResult.items || [];
    const userAccountIds = new Set(userAccounts.map((account: Record<string, unknown>) => account.id));

    // Fetch all transactions with pagination
    const allTransactions: Record<string, unknown>[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
    let hasMoreItems = true;
    
    while (hasMoreItems) {
      const result = await brmhCrud.scan(tableName, {
        itemPerPage: 250
      });
      const allBankTransactions = result.items || [];
      
      // Filter transactions by user's account IDs
      const transactions = allBankTransactions.filter((transaction: Record<string, unknown>) => 
        userAccountIds.has(transaction.accountId)
      );
      
      allTransactions.push(...transactions);
      
      // Check if there are more items to fetch
      lastEvaluatedKey = result.lastEvaluatedKey;
      hasMoreItems = !!lastEvaluatedKey;
      
      // No artificial delay; let AWS SDK handle throttling/backoff
    }

    // Fetch user's tags only to populate tag data
    const tagsResult = await brmhCrud.scan('tags', {
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    });
    const allTags = tagsResult.items || [];
    const tagsMap = new Map(allTags.map((tag: Record<string, unknown>) => [tag.id, tag]));

    // Populate tag data for each transaction (handle both string IDs and full objects)
    const transactions = allTransactions.map((transaction: Record<string, unknown>) => {
      if (Array.isArray(transaction.tags)) {
        transaction.tags = transaction.tags
          .map(tag => typeof tag === 'string' ? tagsMap.get(tag) : tag)
          .filter(Boolean);
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
