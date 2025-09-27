import { NextResponse } from 'next/server';
import { brmhCrud, getBankTransactionTable } from '../../brmh-client';
import { brmhDrive } from '../../brmh-drive-client';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { statementId, s3FileUrl, userId, bankName, batchStart, batchEnd } = await request.json();
    if (!statementId || !userId) {
      return NextResponse.json({ error: 'Missing required fields: statementId and userId are required' }, { status: 400 });
    }

    // First, verify the statement belongs to the user
    const statementResult = await brmhCrud.getItem('bank-statements', { id: statementId });

    if (!statementResult.item) {
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
    }

    const statement = statementResult.item;
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
        const bankResult = await brmhCrud.getItem('banks', { id: statement.bankId });
        if (bankResult.item && bankResult.item.bankName) {
          finalBankName = bankResult.item.bankName;
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
        const params: {
          TableName: string;
          FilterExpression: string;
          ExpressionAttributeValues: Record<string, string>;
          ExclusiveStartKey?: Record<string, unknown>;
        } = {
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
        
        // Build filter expression based on available data
        let filterExpression = 'statementId = :statementId';
        const expressionAttributeValues: Record<string, string> = {
          ':statementId': statementId,
        };
        
        // Add s3FileUrl filter if available (for legacy files)
        if (s3FileUrl) {
          filterExpression += ' OR s3FileUrl = :s3FileUrl';
          expressionAttributeValues[':s3FileUrl'] = s3FileUrl;
        }
        
        // Add driveFileId filter if available (for BRMH Drive files)
        if (statement.driveFileId) {
          filterExpression += ' OR driveFileId = :driveFileId';
          expressionAttributeValues[':driveFileId'] = statement.driveFileId;
        }

        const transactionResult = await brmhCrud.scan(tableName, {
          FilterExpression: filterExpression,
          ExpressionAttributeValues: expressionAttributeValues,
          itemPerPage: 100
        });
        const batchTransactions = transactionResult.items || [];
        relatedTransactions.push(...batchTransactions);
        
        // Check if there are more items to fetch
        lastEvaluatedKey = transactionResult.lastEvaluatedKey;
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
          brmhCrud.delete(tableName, { id: transaction.id })
        );
        await Promise.all(deletePromises);
        console.log(`Successfully deleted batch ${batchStart}-${batchEnd} (${batchTransactions.length} transactions)`);
      }
    } else {
      // Delete all related transactions (original behavior)
      if (relatedTransactions.length > 0) {
        const deletePromises = (relatedTransactions as Array<{ id: string }>).map((transaction) =>
          brmhCrud.delete(tableName, { id: transaction.id })
        );
        await Promise.all(deletePromises);
        console.log(`Successfully deleted ${relatedTransactions.length} related transactions`);
      }
    }

    // Delete the file from BRMH Drive if it has a driveFileId
    if (statement.driveFileId) {
      try {
        await brmhDrive.deleteFile(userId, statement.driveFileId);
        console.log(`Successfully deleted BRMH Drive file: ${statement.driveFileId}`);
      } catch (driveError) {
        console.warn('Failed to delete BRMH Drive file:', driveError);
        // Continue with statement deletion even if Drive deletion fails
      }
    } else if (s3FileUrl) {
      // For legacy files without driveFileId, try to extract and delete from S3
      // This is a fallback for old files that might still be in S3
      console.log('Legacy file detected, skipping S3 deletion (file may still exist in S3)');
    }

    // Delete the statement record
    await brmhCrud.delete('bank-statements', { id: statementId });

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