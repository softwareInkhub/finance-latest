import { NextResponse } from 'next/server';
import { PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES, getBankTransactionTable } from '../../aws-client';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { bankName, tags } = await request.json();

  if (!bankName) {
    return NextResponse.json({ error: 'Bank name is required' }, { status: 400 });
  }

  const bank = {
    id,
    bankName,
    tags: Array.isArray(tags) ? tags : [],
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLES.BANKS,
      Item: bank,
    })
  );

  return NextResponse.json(bank);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // Get the bankName for this bank id
    const bankResult = await docClient.send(
      new ScanCommand({
        TableName: TABLES.BANKS,
        FilterExpression: 'id = :id',
        ExpressionAttributeValues: { ':id': id },
      })
    );
    const bank = (bankResult.Items && bankResult.Items[0]) || null;
    if (!bank) {
      return NextResponse.json({ error: 'Bank not found' }, { status: 404 });
    }
    const tableName = getBankTransactionTable(bank.bankName);

    // Find and delete all related transactions for this bank
    const transactionResult = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: 'bankId = :bankId',
        ExpressionAttributeValues: {
          ':bankId': id,
        },
      })
    );
    const relatedTransactions = transactionResult.Items || [];
    if (relatedTransactions.length > 0) {
      const deleteTransactionPromises = relatedTransactions.map((transaction) =>
        docClient.send(
          new DeleteCommand({
            TableName: tableName,
            Key: { id: transaction.id },
          })
        )
      );
      await Promise.all(deleteTransactionPromises);
    }

    // Find and delete all related statements
    const statementResult = await docClient.send(
      new ScanCommand({
        TableName: TABLES.BANK_STATEMENTS,
        FilterExpression: 'bankId = :bankId',
        ExpressionAttributeValues: {
          ':bankId': id,
        },
      })
    );

    const relatedStatements = statementResult.Items || [];
    console.log(`Found ${relatedStatements.length} related statements to delete`);

    // Delete all related statements
    if (relatedStatements.length > 0) {
      const deleteStatementPromises = relatedStatements.map((statement) =>
        docClient.send(
          new DeleteCommand({
            TableName: TABLES.BANK_STATEMENTS,
            Key: { id: statement.id },
          })
        )
      );
      await Promise.all(deleteStatementPromises);
      console.log(`Successfully deleted ${relatedStatements.length} related statements`);
    }

    // Find and delete all related accounts
    const accountResult = await docClient.send(
      new ScanCommand({
        TableName: TABLES.ACCOUNTS,
        FilterExpression: 'bankId = :bankId',
        ExpressionAttributeValues: {
          ':bankId': id,
        },
      })
    );

    const relatedAccounts = accountResult.Items || [];
    console.log(`Found ${relatedAccounts.length} related accounts to delete`);

    // Delete all related accounts
    if (relatedAccounts.length > 0) {
      const deleteAccountPromises = relatedAccounts.map((account) =>
        docClient.send(
          new DeleteCommand({
            TableName: TABLES.ACCOUNTS,
            Key: { id: account.id },
          })
        )
      );
      await Promise.all(deleteAccountPromises);
      console.log(`Successfully deleted ${relatedAccounts.length} related accounts`);
    }

    // Finally, delete the bank itself
  await docClient.send(
    new DeleteCommand({
      TableName: TABLES.BANKS,
      Key: { id },
    })
  );

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