import { NextResponse } from 'next/server';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
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

    // Save cashflow data to DynamoDB in the REPORTS table
    const now = new Date().toISOString();
    // Upsert: update cashFlowData and updatedAt, set createdAt if item is new
    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.REPORTS,
        Key: { id: `cashflow_${userId}` },
        UpdateExpression: 'SET #d = :data, #u = :updatedAt, #uid = :userId, #t = :type, #ca = if_not_exists(#ca, :createdAt)',
        ExpressionAttributeNames: {
          '#d': 'cashFlowData',
          '#u': 'updatedAt',
          '#uid': 'userId',
          '#t': 'type',
          '#ca': 'createdAt',
        },
        ExpressionAttributeValues: {
          ':data': cashFlowData,
          ':updatedAt': now,
          ':userId': userId,
          ':type': 'cashflow_report',
          ':createdAt': now,
        },
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
        TableName: TABLES.REPORTS,
        Key: { id: `cashflow_${userId}` },
      })
    );

    if (!result.Item) {
      return NextResponse.json(null);
    }

    return NextResponse.json(result.Item.cashFlowData);

  } catch (error: unknown) {
    // If the table doesn't exist in this region/account, DynamoDB returns ResourceNotFoundException
    const err = error as { name?: string } | undefined;
    if (err?.name === 'ResourceNotFoundException') {
      console.error('Cashflow table not found. Check TABLES.REPORTS and AWS_REGION.', {
        table: TABLES.REPORTS,
        region: process.env.AWS_REGION,
      });
      // Return null so frontend treats it as no data yet instead of a hard error
      return NextResponse.json(null);
    }
    console.error('Error fetching cashflow data:', error, {
      table: TABLES.REPORTS,
      region: process.env.AWS_REGION,
    });
    return NextResponse.json(
      { error: 'Failed to fetch cashflow data' },
      { status: 500 }
    );
  }
}
