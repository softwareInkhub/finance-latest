import { NextResponse } from 'next/server';
import { brmhCrud, getBankTransactionTable } from '../brmh-client';

// GET /api/transactions?accountId=xxx&userId=yyy&bankName=zzz
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const userId = searchParams.get('userId');
  const bankName = searchParams.get('bankName');
  
  if (!bankName) {
    return NextResponse.json({ error: 'bankName is required' }, { status: 400 });
  }
  
  // For BRMH Drive files, accountId might be undefined
  if (!accountId && bankName !== 'BRMH Drive') {
    return NextResponse.json({ error: 'accountId is required for bank statements' }, { status: 400 });
  }
  
  try {
    // Get bank-specific table name
    const tableName = getBankTransactionTable(bankName);
    
    let filterExpression = '';
    const expressionAttributeValues: Record<string, string> = {};
    
    if (bankName === 'BRMH Drive') {
      // For BRMH Drive files, we don't filter by accountId
      if (userId) {
        filterExpression = 'userId = :userId';
        expressionAttributeValues[':userId'] = userId;
      }
    } else {
      // For bank statements, filter by accountId
      filterExpression = 'accountId = :accountId';
      expressionAttributeValues[':accountId'] = accountId!;
      if (userId) {
        filterExpression += ' AND userId = :userId';
        expressionAttributeValues[':userId'] = userId;
      }
    }

    // Fetch all transactions with pagination
    const allTransactions: Record<string, unknown>[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
    let hasMoreItems = true;
    
    while (hasMoreItems) {
      const params: {
        TableName: string;
        FilterExpression: string;
        ExpressionAttributeValues: Record<string, string>;
        ExclusiveStartKey?: Record<string, unknown>;
      } = {
        TableName: tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      };
      
      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }
      
      const result = await brmhCrud.scan(tableName, {
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        itemPerPage: 100
      });
      const transactions = result.items || [];
      allTransactions.push(...transactions);
      
      // Check if there are more items to fetch
      lastEvaluatedKey = result.lastEvaluatedKey;
      hasMoreItems = !!lastEvaluatedKey;
      
      // Add a small delay to avoid overwhelming DynamoDB
      if (hasMoreItems) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Fetch user's tags only to populate tag data
    const tagsResult = await brmhCrud.scan('tags', {
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId! }
    });
    const allTags = tagsResult.items || [];
    const tagsMap = new Map(allTags.map((tag: Record<string, unknown>) => [tag.id, tag]));

    // Populate tag data for each transaction (handle both string IDs and full objects)
    const transactions = allTransactions.map(transaction => {
      if (Array.isArray(transaction.tags)) {
        transaction.tags = transaction.tags
          .map(tag => typeof tag === 'string' ? tagsMap.get(tag) : tag)
          .filter(Boolean);
      }
      return transaction;
    });

    console.log(`Fetched ${transactions.length} transactions for account ${accountId}`);
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
} 