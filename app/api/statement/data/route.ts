import { NextResponse } from 'next/server';
import { brmhCrud, getBankTransactionTable } from '../../brmh-client';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statementId = searchParams.get('statementId');
    const userId = searchParams.get('userId');
    
    if (!statementId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // First, get the statement details
    const statementResult = await brmhCrud.getItem('bank-statements', { id: statementId });

    if (!statementResult.item) {
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
    }

    const statement = statementResult.item;
    if (statement.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get bank-specific table name
    const tableName = getBankTransactionTable(statement.bankName || 'default');

    // Find all transactions for this statement
    let transactionResult;
    try {
      transactionResult = await brmhCrud.scan(tableName, {
        FilterExpression: 'statementId = :statementId OR s3FileUrl = :s3FileUrl',
        ExpressionAttributeValues: {
          ':statementId': statementId,
          ':s3FileUrl': statement.s3FileUrl,
        },
      });
    } catch (error) {
      console.warn('Failed to scan transactions table:', error);
      transactionResult = { items: [] };
    }

    const transactions = transactionResult.items || [];
    
    // Calculate total rows from transactions
    let totalRows = 0;
    let csvData = '';
    
    transactions.forEach((tx: Record<string, unknown>) => {
      if (tx.rowCount) {
        totalRows += tx.rowCount as number;
      } else if (tx.rows && Array.isArray(tx.rows)) {
        totalRows += tx.rows.length;
      } else if (tx.data && Array.isArray(tx.data)) {
        totalRows += tx.data.length;
      } else if (tx.csvData) {
        const lines = (tx.csvData as string).split('\n').filter((line: string) => line.trim());
        totalRows += lines.length - 1; // Subtract header
        if (!csvData) csvData = tx.csvData as string;
      } else if (tx.startRow && tx.endRow) {
        totalRows += (tx.endRow as number) - (tx.startRow as number) + 1;
      } else {
        totalRows += 1; // Default to 1 row per transaction
      }
    });

    return NextResponse.json({
      success: true,
      statementId,
      totalRows,
      transactionCount: transactions.length,
      csvData: csvData || null,
      transactions: transactions
    });
  } catch (error) {
    console.error('Error fetching statement data:', error);
    return NextResponse.json({ error: 'Failed to fetch statement data' }, { status: 500 });
  }
} 