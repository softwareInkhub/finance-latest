import { NextResponse } from 'next/server';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, getBankTransactionTable } from '../aws-client';

// GET /api/transactions?accountId=xxx&userId=yyy&bankName=zzz
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const userId = searchParams.get('userId');
  const bankName = searchParams.get('bankName');
  
  if (!accountId || !bankName) {
    return NextResponse.json({ error: 'accountId and bankName are required' }, { status: 400 });
  }
  
  try {
    // Get bank-specific table name
    const tableName = getBankTransactionTable(bankName);
    
    let filterExpression = 'accountId = :accountId';
    const expressionAttributeValues: Record<string, string> = { ':accountId': accountId };
    if (userId) {
      filterExpression += ' AND userId = :userId';
      expressionAttributeValues[':userId'] = userId;
    }
    const result = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );

    // Fetch all tags to populate tag data
    const tagsResult = await docClient.send(
      new ScanCommand({
        TableName: 'tags',
      })
    );
    const allTags = tagsResult.Items || [];
    const tagsMap = new Map(allTags.map(tag => [tag.id, tag]));

    // Populate tag data for each transaction (handle both string IDs and full objects)
    const transactions = (result.Items || []).map(transaction => {
      if (Array.isArray(transaction.tags)) {
        transaction.tags = transaction.tags
          .map(tag => typeof tag === 'string' ? tagsMap.get(tag) : tag)
          .filter(Boolean);
      }
      return transaction;
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
} 