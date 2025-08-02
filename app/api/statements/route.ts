import { NextResponse } from 'next/server';
import { ScanCommand, ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../aws-client';

// GET /api/statements?accountId=xxx&userId=yyy
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const userId = searchParams.get('userId');
  if (!accountId) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
  }
  try {
    let filterExpression = 'accountId = :accountId';
    const expressionAttributeValues: Record<string, string> = { ':accountId': accountId };
    if (userId) {
      filterExpression += ' AND userId = :userId';
      expressionAttributeValues[':userId'] = userId;
    }
    
    // Fetch all statements with pagination
    const allStatements: Record<string, unknown>[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
    let hasMoreItems = true;
    
    while (hasMoreItems) {
      const params: ScanCommandInput = {
        TableName: TABLES.BANK_STATEMENTS,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      };
      
      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }
      
      const result = await docClient.send(new ScanCommand(params));
      const statements = result.Items || [];
      allStatements.push(...statements);
      
      // Check if there are more items to fetch
      lastEvaluatedKey = result.LastEvaluatedKey;
      hasMoreItems = !!lastEvaluatedKey;
      
      // Add a small delay to avoid overwhelming DynamoDB
      if (hasMoreItems) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return NextResponse.json(allStatements);
  } catch (error) {
    console.error('Error fetching statements:', error);
    return NextResponse.json({ error: 'Failed to fetch statements' }, { status: 500 });
  }
} 