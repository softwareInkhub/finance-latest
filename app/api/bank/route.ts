import { NextResponse } from 'next/server';
import { PutCommand, ScanCommand, ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../aws-client';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    // Fetch all banks with pagination
    const allBanks: Record<string, unknown>[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
    let hasMoreItems = true;
    
    while (hasMoreItems) {
      const params: ScanCommandInput = {
        TableName: TABLES.BANKS,
      };
      
      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }
      
      const result = await docClient.send(new ScanCommand(params));
      const banks = result.Items || [];
      allBanks.push(...banks);
      
      // Check if there are more items to fetch
      lastEvaluatedKey = result.LastEvaluatedKey;
      hasMoreItems = !!lastEvaluatedKey;
      
      // Add a small delay to avoid overwhelming DynamoDB
      if (hasMoreItems) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return NextResponse.json(allBanks);
  } catch (error) {
    console.error('Error fetching banks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch banks' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { bankName, tags } = await request.json();

    if (!bankName) {
      return NextResponse.json(
        { error: 'Bank name is required' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    const bank = {
      id,
      bankName,
      tags: Array.isArray(tags) ? tags : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLES.BANKS,
        Item: bank,
      })
    );

    return NextResponse.json(bank);
  } catch (error) {
    console.error('Error creating bank:', error);
    return NextResponse.json(
      { error: 'Failed to create bank' },
      { status: 500 }
    );
  }
} 