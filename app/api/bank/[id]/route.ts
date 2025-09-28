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
  try {
    const { id } = await params;
    console.log('DELETE bank request for ID:', id);
    
    const { userId, userEmail } = await request.json();
    console.log('Delete request data:', { userId, userEmail });

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Check if user is admin
    const adminEmail = process.env.ADMIN_EMAIL;
    console.log('Admin email check:', { adminEmail, userEmail });
    
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

    // Test BRMH connection
    console.log('Testing BRMH connection...');
    try {
      const testResult = await brmhCrud.scan(TABLES.BANKS, { itemPerPage: 1 });
      console.log('BRMH connection test successful:', testResult);
    } catch (testError) {
      console.error('BRMH connection test failed:', testError);
      return NextResponse.json({ 
        error: 'BRMH backend connection failed',
        details: testError instanceof Error ? testError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Get the bankName for this bank id (global bank)
    console.log('Fetching bank with ID:', id);
    const bankResult = await brmhCrud.scan(TABLES.BANKS, {
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: { 
        ':id': id
      },
    });
    console.log('Bank scan result:', bankResult);
    
    const bank = (bankResult.items && bankResult.items[0]) || null;
    if (!bank) {
      console.log('Bank not found for ID:', id);
      return NextResponse.json({ error: 'Bank not found' }, { status: 404 });
    }
    
    console.log('Found bank:', bank);
    const tableName = getBankTransactionTable(bank.bankName);
    console.log('Transaction table name:', tableName);

    // Find and delete all related transactions for this bank
    console.log('Scanning for transactions in table:', tableName);
    let relatedTransactions: { id: string }[] = [];
    try {
      const transactionResult = await brmhCrud.scan(tableName, {
        FilterExpression: 'bankId = :bankId',
        ExpressionAttributeValues: {
          ':bankId': id,
        },
      });
      relatedTransactions = transactionResult.items || [];
      console.log('Found transactions:', relatedTransactions.length);
      
      if (relatedTransactions.length > 0) {
        console.log('Deleting transactions...');
        const deleteTransactionPromises = relatedTransactions.map((transaction: { id: string }) =>
          brmhCrud.delete(tableName, { id: transaction.id })
        );
        await Promise.all(deleteTransactionPromises);
        console.log('Successfully deleted transactions');
      }
    } catch (transactionError) {
      console.log(`Transaction table ${tableName} doesn't exist or is empty:`, transactionError);
      // Continue with deletion even if transaction table doesn't exist
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
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json({ 
      error: 'Failed to delete bank',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 