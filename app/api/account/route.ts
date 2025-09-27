import { NextResponse } from 'next/server';
import { brmhCrud, TABLES } from '../brmh-client';
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
      const result = await brmhCrud.scan(TABLES.ACCOUNTS, {
        FilterExpression: 'id = :id',
        ExpressionAttributeValues: { ':id': accountId },
      });
      return NextResponse.json(result.items?.[0] || {});
    } catch (error) {
      console.error('Error fetching account by id:', error);
      return NextResponse.json({ error: 'Failed to fetch account' }, { status: 500 });
    }
  }
  
  // If no bankId provided, fetch all accounts for the user
  if (!bankId && userId) {
    try {
      const result = await brmhCrud.scan(TABLES.ACCOUNTS, {
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
        itemPerPage: 100
      });
      return NextResponse.json(result.items || []);
    } catch (error) {
      console.error('Error fetching all accounts for user:', error);
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }
  }
  
  if (!bankId) {
    return NextResponse.json({ error: 'bankId is required' }, { status: 400 });
  }
  
  try {
    // Fetch accounts for specific bank only
    let filterExpression = 'bankId = :bankId';
    const expressionAttributeValues: Record<string, string | number> = {
      ':bankId': bankId
    };
    
    if (userId) {
      filterExpression += ' AND userId = :userId';
      expressionAttributeValues[':userId'] = userId;
    }
    
    
    // Fetch all accounts with pagination
    const allAccounts: Record<string, unknown>[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
    let hasMoreItems = true;
    
    while (hasMoreItems) {
      const params: {
        TableName: string;
        FilterExpression: string;
        ExpressionAttributeValues: Record<string, string | number>;
        ExclusiveStartKey?: Record<string, unknown>;
      } = {
        TableName: TABLES.ACCOUNTS,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      };
      
      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }
      
      const result = await brmhCrud.scan(TABLES.ACCOUNTS, {
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        itemPerPage: 100
      });
      const accounts = result.items || [];
      
      
      allAccounts.push(...accounts);
      
      // Check if there are more items to fetch
      lastEvaluatedKey = result.lastEvaluatedKey;
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
    await brmhCrud.create(TABLES.ACCOUNTS, account);
    return NextResponse.json(account);
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
} 