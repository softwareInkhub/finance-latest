import { NextResponse } from 'next/server';
import { DeleteCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, getBankTransactionTable, s3, S3_BUCKET } from '../../aws-client';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { statementId, s3FileUrl, userId, bankName } = await request.json();
    if (!statementId || !s3FileUrl || !userId || !bankName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // First, verify the statement belongs to the user
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
      return NextResponse.json({ error: 'Unauthorized: You can only delete your own files' }, { status: 403 });
    }

    // Get bank-specific table name
    const tableName = getBankTransactionTable(bankName);

    // First, find and delete all related transactions from the bank-specific table
    // Look for transactions with matching statementId, fileName, or s3FileUrl
    const transactionResult = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: 'statementId = :statementId OR s3FileUrl = :s3FileUrl',
        ExpressionAttributeValues: {
          ':statementId': statementId,
          ':s3FileUrl': s3FileUrl,
        },
      })
    );

    const relatedTransactions = transactionResult.Items || [];
    console.log(`Found ${relatedTransactions.length} related transactions to delete`);

    // Delete all related transactions
    if (relatedTransactions.length > 0) {
      const deletePromises = (relatedTransactions as Array<{ id: string }>).map((transaction) =>
        docClient.send(
          new DeleteCommand({
            TableName: tableName,
            Key: { id: transaction.id },
          })
        )
      );
      await Promise.all(deletePromises);
      console.log(`Successfully deleted ${relatedTransactions.length} related transactions`);
    }

    // Extract the key from the s3FileUrl
    const key = s3FileUrl.split('.amazonaws.com/')[1];
    if (!key) {
      return NextResponse.json({ error: 'Invalid S3 file URL' }, { status: 400 });
    }

    // Delete the file from S3
    try {
    await s3.send(new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    }));
      console.log(`Successfully deleted S3 file: ${key}`);
    } catch (s3Error) {
      console.warn('Failed to delete S3 file:', s3Error);
      // Continue with statement deletion even if S3 deletion fails
    }

    // Delete the statement record
    await docClient.send(
      new DeleteCommand({
        TableName: 'bank-statements',
        Key: { id: statementId },
      })
    );

    return NextResponse.json({ 
      success: true, 
      deletedTransactions: relatedTransactions.length 
    });
  } catch (error) {
    console.error('Error deleting statement:', error);
    return NextResponse.json({ error: 'Failed to delete statement' }, { status: 500 });
  }
} 