import { NextResponse } from 'next/server';
import { brmhCrud, TABLES, getBankTransactionTable } from '../../brmh-client';

// PUT /api/account/[id]
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { bankId, accountHolderName, accountNumber, ifscCode, tags, userId } = await request.json();

  if (!bankId || !accountHolderName || !accountNumber || !ifscCode) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

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
}

// DELETE /api/account/[id]
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    // First, get user's banks only to know which tables to scan
    const banksResult = await brmhCrud.scan(TABLES.BANKS, {
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    });
    const banks = banksResult.items || [];
    let totalDeletedTransactions = 0;

    // For each bank, scan its transaction table for transactions with this accountId
    for (const bank of banks) {
      const tableName = getBankTransactionTable(bank.bankName);
      try {
        const transactionResult = await brmhCrud.scan(tableName, {
          FilterExpression: 'accountId = :accountId',
          ExpressionAttributeValues: {
            ':accountId': id,
          },
        });
        const relatedTransactions = transactionResult.items || [];
        if (relatedTransactions.length > 0) {
          const deleteTransactionPromises = relatedTransactions.map((transaction: { id: string }) =>
            brmhCrud.delete(tableName, { id: transaction.id })
          );
          await Promise.all(deleteTransactionPromises);
          totalDeletedTransactions += relatedTransactions.length;
        }
      } catch {
        // If table doesn't exist, skip
        continue;
      }
    }

    // Find and delete all related statements
    const statementResult = await brmhCrud.scan(TABLES.BANK_STATEMENTS, {
      FilterExpression: 'accountId = :accountId',
      ExpressionAttributeValues: {
        ':accountId': id,
      },
    });

    const relatedStatements = statementResult.items || [];
    console.log(`Found ${relatedStatements.length} related statements to delete`);

    // Delete all related statements
    if (relatedStatements.length > 0) {
      const deleteStatementPromises = relatedStatements.map((statement: { id: string }) =>
        brmhCrud.delete(TABLES.BANK_STATEMENTS, { id: statement.id })
      );
      await Promise.all(deleteStatementPromises);
      console.log(`Successfully deleted ${relatedStatements.length} related statements`);
    }

    // Finally, delete the account itself
    await brmhCrud.delete(TABLES.ACCOUNTS, { id });

    return NextResponse.json({ 
      success: true, 
      deletedTransactions: totalDeletedTransactions,
      deletedStatements: relatedStatements.length
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
} 