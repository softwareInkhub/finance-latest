import { NextResponse } from 'next/server';
import { brmhCrud, TABLES, getBankTransactionTable } from '../../brmh-client';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { bankName, tags, userEmail } = await request.json();

  if (!bankName) {
    return NextResponse.json({ error: 'Bank name is required' }, { status: 400 });
  }

  // Check if user is admin
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return NextResponse.json(
      { error: 'Admin email not configured' },
      { status: 500 }
    );
  }
  if (userEmail !== adminEmail) {
    return NextResponse.json(
      { error: 'Only admin can edit banks' },
      { status: 403 }
    );
  }

  const bank = {
    id,
    bankName,
    tags: Array.isArray(tags) ? tags : [],
    updatedAt: new Date().toISOString(),
  };

  await brmhCrud.create(TABLES.BANKS, bank);

  return NextResponse.json(bank);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, userEmail } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  // Check if user is admin
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return NextResponse.json(
      { error: 'Admin email not configured' },
      { status: 500 }
    );
  }
  if (userEmail !== adminEmail) {
    return NextResponse.json(
      { error: 'Only admin can delete banks' },
      { status: 403 }
    );
  }

  try {
    // Get the bankName for this bank id (global bank)
    const bankResult = await brmhCrud.scan(TABLES.BANKS, {
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: { 
        ':id': id
      },
    });
    const bank = (bankResult.items && bankResult.items[0]) || null;
    if (!bank) {
      return NextResponse.json({ error: 'Bank not found' }, { status: 404 });
    }
    const tableName = getBankTransactionTable(bank.bankName);

    // Find and delete all related transactions for this bank
    const transactionResult = await brmhCrud.scan(tableName, {
      FilterExpression: 'bankId = :bankId',
      ExpressionAttributeValues: {
        ':bankId': id,
      },
    });
    const relatedTransactions = transactionResult.items || [];
    if (relatedTransactions.length > 0) {
      const deleteTransactionPromises = relatedTransactions.map((transaction: { id: string }) =>
        brmhCrud.delete(tableName, { id: transaction.id })
      );
      await Promise.all(deleteTransactionPromises);
    }

    // Find and delete all related statements
    const statementResult = await brmhCrud.scan(TABLES.BANK_STATEMENTS, {
      FilterExpression: 'bankId = :bankId',
      ExpressionAttributeValues: {
        ':bankId': id,
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

    // Find and delete all related accounts
    const accountResult = await brmhCrud.scan(TABLES.ACCOUNTS, {
      FilterExpression: 'bankId = :bankId',
      ExpressionAttributeValues: {
        ':bankId': id,
      },
    });

    const relatedAccounts = accountResult.items || [];
    console.log(`Found ${relatedAccounts.length} related accounts to delete`);

    // Delete all related accounts
    if (relatedAccounts.length > 0) {
      const deleteAccountPromises = relatedAccounts.map((account: { id: string }) =>
        brmhCrud.delete(TABLES.ACCOUNTS, { id: account.id })
      );
      await Promise.all(deleteAccountPromises);
      console.log(`Successfully deleted ${relatedAccounts.length} related accounts`);
    }

    // Finally, delete the bank itself
    await brmhCrud.delete(TABLES.BANKS, { id });

    return NextResponse.json({ 
      success: true, 
      deletedTransactions: relatedTransactions.length,
      deletedStatements: relatedStatements.length,
      deletedAccounts: relatedAccounts.length
    });
  } catch (error) {
    console.error('Error deleting bank:', error);
    return NextResponse.json({ error: 'Failed to delete bank' }, { status: 500 });
  }
} 