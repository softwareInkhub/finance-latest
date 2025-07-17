import { NextResponse } from 'next/server';
import { PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES, getBankTransactionTable } from '../../aws-client';

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

  await docClient.send(
    new PutCommand({
      TableName: TABLES.ACCOUNTS,
      Item: account,
    })
  );

  return NextResponse.json(account);
}

// DELETE /api/account/[id]
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // First, get all banks to know which tables to scan
    const banksResult = await docClient.send(
      new ScanCommand({
        TableName: TABLES.BANKS,
      })
    );
    const banks = banksResult.Items || [];
    let totalDeletedTransactions = 0;

    // For each bank, scan its transaction table for transactions with this accountId
    for (const bank of banks) {
      const tableName = getBankTransactionTable(bank.bankName);
      try {
        const transactionResult = await docClient.send(
          new ScanCommand({
            TableName: tableName,
            FilterExpression: 'accountId = :accountId',
            ExpressionAttributeValues: {
              ':accountId': id,
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
          totalDeletedTransactions += relatedTransactions.length;
        }
      } catch {
        // If table doesn't exist, skip
        continue;
      }
    }

    // Find and delete all related statements
    const statementResult = await docClient.send(
      new ScanCommand({
        TableName: TABLES.BANK_STATEMENTS,
        FilterExpression: 'accountId = :accountId',
        ExpressionAttributeValues: {
          ':accountId': id,
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

    // Finally, delete the account itself
    await docClient.send(
      new DeleteCommand({
        TableName: TABLES.ACCOUNTS,
        Key: { id },
      })
    );

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