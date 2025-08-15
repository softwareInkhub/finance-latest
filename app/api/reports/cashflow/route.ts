import { NextResponse } from 'next/server';
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../../aws-client';

export async function POST(request: Request) {
  try {
    const { userId, cashFlowData } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!cashFlowData) {
      return NextResponse.json(
        { error: 'Cashflow data is required' },
        { status: 400 }
      );
    }

    // Save cashflow data to DynamoDB using the TAGS table for now
    // You can create a dedicated reports table later
    const cashflowRecord = {
      id: `cashflow_${userId}`,
      userId,
      cashFlowData,
      type: 'cashflow_report',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLES.TAGS, // Using existing TAGS table
        Item: cashflowRecord,
      })
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Cashflow data saved successfully' 
    });

  } catch (error) {
    console.error('Error saving cashflow data:', error);
    return NextResponse.json(
      { error: 'Failed to save cashflow data' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Retrieve cashflow data from DynamoDB
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.TAGS, // Using existing TAGS table
        Key: { id: `cashflow_${userId}` },
      })
    );

    if (!result.Item) {
      return NextResponse.json(null);
    }

    return NextResponse.json(result.Item.cashFlowData);

  } catch (error) {
    console.error('Error fetching cashflow data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cashflow data' },
      { status: 500 }
    );
  }
}
