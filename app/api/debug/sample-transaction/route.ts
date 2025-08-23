import { NextRequest, NextResponse } from 'next/server';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, getBankTransactionTable } from '../../aws-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const bankName = searchParams.get('bankName') || 'HDFC';

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const tableName = getBankTransactionTable(bankName);
    
    // Get a few sample transactions
    const result = await docClient.send(new ScanCommand({ 
      TableName: tableName, 
      FilterExpression: 'userId = :userId', 
      ExpressionAttributeValues: { ':userId': userId },
      Limit: 5
    }));
    
    const transactions = result.Items || [];

    return NextResponse.json({
      userId,
      bankName,
      tableName,
      sampleTransactions: transactions.map(tx => ({
        id: tx.id,
        amount: tx.Amount || tx.amount || tx.AmountRaw,
        type: tx['Dr./Cr.'] || tx['Dr/Cr'] || tx['DR/CR'] || tx['Type'],
        description: tx.Description || tx.Narration || tx.Particulars,
        date: tx.Date || tx.TransactionDate,
        tags: tx.tags,
        allFields: Object.keys(tx),
        allValues: Object.fromEntries(
          Object.entries(tx).filter(([, value]) => 
            typeof value === 'string' || typeof value === 'number'
          )
        )
      }))
    });

  } catch (error) {
    console.error('Error getting sample transaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

