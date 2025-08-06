import { NextResponse } from 'next/server';
import { PutCommand, ScanCommand, ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../aws-client';
import { v4 as uuidv4 } from 'uuid';

// GET /api/account?bankId=xxx&userId=yyy
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const bankId = searchParams.get('bankId');
  const userId = searchParams.get('userId');
  if (accountId) {
    // Fetch a single account by id
    try {
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLES.ACCOUNTS,
          FilterExpression: 'id = :id',
          ExpressionAttributeValues: { ':id': accountId },
        })
      );
      return NextResponse.json(result.Items?.[0] || {});
    } catch (error) {
      console.error('Error fetching account by id:', error);
      return NextResponse.json({ error: 'Failed to fetch account' }, { status: 500 });
    }
  }
  if (!bankId && bankId !== 'all') {
    return NextResponse.json({ error: 'bankId is required' }, { status: 400 });
  }
  try {
    let filterExpression = '';
    const expressionAttributeValues: Record<string, string | number> = {};
    
    if (bankId === 'all') {
      // Fetch all accounts for the user
      if (userId) {
        filterExpression = 'userId = :userId';
        expressionAttributeValues[':userId'] = userId;
      }
    } else {
      // Fetch accounts for specific bank
      filterExpression = 'bankId = :bankId';
      expressionAttributeValues[':bankId'] = bankId;
      if (userId) {
        filterExpression += ' AND userId = :userId';
        expressionAttributeValues[':userId'] = userId;
      }
    }
    
    // Fetch all accounts with pagination
    const allAccounts: Record<string, unknown>[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
    let hasMoreItems = true;
    
    while (hasMoreItems) {
      const params: ScanCommandInput = {
        TableName: TABLES.ACCOUNTS,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      };
      
      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }
      
      const result = await docClient.send(new ScanCommand(params));
      const accounts = result.Items || [];
      allAccounts.push(...accounts);
      
      // Check if there are more items to fetch
      lastEvaluatedKey = result.LastEvaluatedKey;
      hasMoreItems = !!lastEvaluatedKey;
      
      // Add a small delay to avoid overwhelming DynamoDB
      if (hasMoreItems) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return NextResponse.json(allAccounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

// POST /api/account
export async function POST(request: Request) {
  try {
    const { bankId, accountHolderName, accountNumber, ifscCode, tags, userId } = await request.json();
    if (!bankId || !accountHolderName || !accountNumber || !ifscCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const id = uuidv4();
    const account = {
      id,
      bankId,
      accountHolderName,
      accountNumber,
      ifscCode,
      tags: Array.isArray(tags) ? tags : [],
      userId: userId || '',
    };
    await docClient.send(
      new PutCommand({
        TableName: TABLES.ACCOUNTS,
        Item: account,
      })
    );
    return NextResponse.json(account);
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
} 