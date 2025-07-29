import { NextResponse } from 'next/server';
import { UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../../aws-client';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { statementId, userId, fileName, bankName } = await request.json();
    if (!statementId || !userId || !fileName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the statement to verify ownership and get bank info
    const statementResult = await docClient.send(
      new GetCommand({
        TableName: 'bank-statements',
        Key: { id: statementId },
      })
    );
    if (!statementResult.Item) {
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
    }
    const statement = statementResult.Item;
    if (statement.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized: You can only edit your own files' }, { status: 403 });
    }

    // Get bankName from statement if not provided
    let finalBankName = bankName;
    if (!finalBankName && statement.bankName) {
      finalBankName = statement.bankName;
    }
    // If still no bankName, try to get it from bankId
    if (!finalBankName && statement.bankId) {
      try {
        const bankResult = await docClient.send(
          new GetCommand({
            TableName: 'banks',
            Key: { id: statement.bankId },
          })
        );
        if (bankResult.Item && bankResult.Item.bankName) {
          finalBankName = bankResult.Item.bankName;
        }
      } catch (error) {
        console.warn('Failed to fetch bank name from bankId:', error);
      }
    }

    // Update the statement record
    await docClient.send(
      new UpdateCommand({
        TableName: 'bank-statements',
        Key: { id: statementId },
        UpdateExpression: 'SET #fileName = :fileName, #bankName = :bankName, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#fileName': 'fileName',
          '#bankName': 'bankName',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':fileName': fileName,
          ':bankName': finalBankName || '',
          ':updatedAt': new Date().toISOString(),
        },
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating statement:', error);
    return NextResponse.json({ error: 'Failed to update statement' }, { status: 500 });
  }
} 