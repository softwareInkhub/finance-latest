import { NextResponse } from 'next/server';
import { ScanCommand, ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES, getBankTransactionTable } from '../../../aws-client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tagName: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const resolvedParams = await params;
    const tagName = resolvedParams.tagName;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!tagName) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    // Get all banks to scan their transaction tables
    const allBanks: Record<string, unknown>[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
    let hasMoreItems = true;
    
    while (hasMoreItems) {
      const banksParams: ScanCommandInput = { TableName: TABLES.BANKS };
      if (lastEvaluatedKey) {
        banksParams.ExclusiveStartKey = lastEvaluatedKey;
      }
      
      const banksResult = await docClient.send(new ScanCommand(banksParams));
      const batchBanks = banksResult.Items || [];
      allBanks.push(...batchBanks);
      
      lastEvaluatedKey = banksResult.LastEvaluatedKey;
      hasMoreItems = !!lastEvaluatedKey;
      
      if (hasMoreItems) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Collect transactions that have the specified tag
    const transactions: Record<string, unknown>[] = [];
    
    for (const bank of allBanks) {
      const tableName = getBankTransactionTable(typeof bank.bankName === 'string' ? bank.bankName : '');
      
      try {
        // Scan transactions for this bank with pagination
        let txLastEvaluatedKey: Record<string, unknown> | undefined = undefined;
        let txHasMoreItems = true;
        
        while (txHasMoreItems) {
          const txParams: ScanCommandInput = { 
            TableName: tableName,
            FilterExpression: '#userId = :userId AND #tags = :tagName',
            ExpressionAttributeNames: {
              '#userId': 'userId',
              '#tags': 'tags'
            },
            ExpressionAttributeValues: {
              ':userId': userId,
              ':tagName': tagName
            }
          };
          
          if (txLastEvaluatedKey) {
            txParams.ExclusiveStartKey = txLastEvaluatedKey;
          }
          
          const txResult = await docClient.send(new ScanCommand(txParams));
          const batchTransactions = txResult.Items || [];
          transactions.push(...batchTransactions);
          
          txLastEvaluatedKey = txResult.LastEvaluatedKey;
          txHasMoreItems = !!txLastEvaluatedKey;
          
          if (txHasMoreItems) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      } catch {
        // If table doesn't exist, skip
        console.warn(`Table ${tableName} not found, skipping...`);
        continue;
      }
    }

    // Also check for transactions where tags is an array containing the tag name
    for (const bank of allBanks) {
      const tableName = getBankTransactionTable(typeof bank.bankName === 'string' ? bank.bankName : '');
      
      try {
        let txLastEvaluatedKey: Record<string, unknown> | undefined = undefined;
        let txHasMoreItems = true;
        
        while (txHasMoreItems) {
          const txParams: ScanCommandInput = { 
            TableName: tableName,
            FilterExpression: '#userId = :userId',
            ExpressionAttributeNames: {
              '#userId': 'userId'
            },
            ExpressionAttributeValues: {
              ':userId': userId
            }
          };
          
          if (txLastEvaluatedKey) {
            txParams.ExclusiveStartKey = txLastEvaluatedKey;
          }
          
          const txResult = await docClient.send(new ScanCommand(txParams));
          const batchTransactions = txResult.Items || [];
          
          // Filter transactions that have the tag in their tags array
          const taggedTransactions = batchTransactions.filter((tx: Record<string, unknown>) => {
            if (!Array.isArray(tx.tags)) return false;
            return (tx.tags as Array<unknown>).some((tag: unknown) => 
              (typeof tag === 'string' && tag === tagName) ||
              (typeof tag === 'object' && tag !== null && (tag as Record<string, unknown>).name === tagName)
            );
          });
          
          transactions.push(...taggedTransactions);
          
          txLastEvaluatedKey = txResult.LastEvaluatedKey;
          txHasMoreItems = !!txLastEvaluatedKey;
          
          if (txHasMoreItems) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      } catch {
        console.warn(`Table ${tableName} not found, skipping...`);
        continue;
      }
    }

    // Remove duplicates based on transaction ID
    const uniqueTransactions = transactions.filter((tx, index, self) => 
      index === self.findIndex(t => t.id === tx.id)
    );

    return NextResponse.json(uniqueTransactions);
  } catch (error) {
    console.error('Error fetching transactions by tag:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
