import { NextResponse } from 'next/server';
import { DeleteCommand, GetCommand, ScanCommand, ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { docClient, getBankTransactionTable, s3, S3_BUCKET } from '../../aws-client';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { statementId, s3FileUrl, userId, bankName, batchStart, batchEnd } = await request.json();
    if (!statementId || !s3FileUrl || !userId) {
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

    // Get bank-specific table name
    const tableName = getBankTransactionTable(finalBankName || 'default');

    // Find and delete all related transactions from the bank-specific table with pagination
    // Look for transactions with matching statementId, fileName, or s3FileUrl
    const relatedTransactions: Record<string, unknown>[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
    let hasMoreItems = true;
    
    while (hasMoreItems) {
      try {
        const params: ScanCommandInput = {
          TableName: tableName,
          FilterExpression: 'statementId = :statementId OR s3FileUrl = :s3FileUrl',
          ExpressionAttributeValues: {
            ':statementId': statementId,
            ':s3FileUrl': s3FileUrl,
          },
        };
        
        if (lastEvaluatedKey) {
          params.ExclusiveStartKey = lastEvaluatedKey;
        }
        
        const transactionResult = await docClient.send(new ScanCommand(params));
        const batchTransactions = transactionResult.Items || [];
        relatedTransactions.push(...batchTransactions);
        
        // Check if there are more items to fetch
        lastEvaluatedKey = transactionResult.LastEvaluatedKey;
        hasMoreItems = !!lastEvaluatedKey;
        
        // Add a small delay to avoid overwhelming DynamoDB
        if (hasMoreItems) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.warn('Failed to scan transactions table, continuing with file deletion:', error);
        break;
      }
    }

    console.log(`Found ${relatedTransactions.length} related transactions to delete`);

    // Handle batch deletion if batchStart and batchEnd are provided
    if (batchStart !== undefined && batchEnd !== undefined) {
      const batchTransactions = relatedTransactions.slice(batchStart, batchEnd);
      if (batchTransactions.length > 0) {
        const deletePromises = (batchTransactions as Array<{ id: string }>).map((transaction) =>
          docClient.send(
            new DeleteCommand({
              TableName: tableName,
              Key: { id: transaction.id },
            })
          )
        );
        await Promise.all(deletePromises);
        console.log(`Successfully deleted batch ${batchStart}-${batchEnd} (${batchTransactions.length} transactions)`);
      }
    } else {
      // Delete all related transactions (original behavior)
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

    const deletedCount = batchStart !== undefined && batchEnd !== undefined 
      ? Math.min(batchEnd - batchStart, relatedTransactions.length - batchStart)
      : relatedTransactions.length;
      
    return NextResponse.json({ 
      success: true, 
      deletedTransactions: deletedCount,
      isBatch: batchStart !== undefined && batchEnd !== undefined
    });
  } catch (error) {
    console.error('Error deleting statement:', error);
    return NextResponse.json({ error: 'Failed to delete statement' }, { status: 500 });
  }
} 