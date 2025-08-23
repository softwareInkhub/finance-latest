import { NextRequest, NextResponse } from 'next/server';
import { docClient, TABLES, getBankTransactionTable } from '../../aws-client';
import { ScanCommand, ScanCommandInput } from '@aws-sdk/lib-dynamodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const tagName = searchParams.get('tagName') || 'HDFC';
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    console.log(`Debug: Counting transactions with tag "${tagName}" for user ${userId}`);

    // Get all banks
    const banksResult = await docClient.send(new ScanCommand({ TableName: TABLES.BANKS }));
    const banks = (banksResult.Items || []) as Array<{ bankName?: string } & Record<string, unknown>>;

    let totalCount = 0;
    const transactionDetails: Array<{id: string, bankName: string, amount: unknown, tags: unknown}> = [];

    // Count across all bank tables
    for (const bank of banks) {
      const bankName = String(bank.bankName ?? '').trim();
      if (!bankName) continue;
      
      const tableName = getBankTransactionTable(bankName);
      console.log(`Debug: Scanning bank table: ${tableName}`);
      
      try {
        let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
        let hasMoreItems = true;
        let bankCount = 0;
        
        while (hasMoreItems) {
                            const params = { 
            TableName: tableName, 
            FilterExpression: 'userId = :userId', 
            ExpressionAttributeValues: { ':userId': userId } 
          };
          if (lastEvaluatedKey) (params as ScanCommandInput).ExclusiveStartKey = lastEvaluatedKey;
          
          const result = await docClient.send(new ScanCommand(params as ScanCommandInput));
          const txs = (result.Items || []) as Array<Record<string, unknown>>;

          for (const tx of txs) {
            const txTagsRaw = Array.isArray(tx.tags) ? tx.tags : [];
            
            // Check if this transaction has the target tag
            const hasTag = txTagsRaw.some((tag: unknown) => {
              if (typeof tag === 'string') return tag.toLowerCase() === tagName.toLowerCase();
              if (tag && typeof tag === 'object' && tag !== null) {
                const tagObj = tag as Record<string, unknown>;
                return (tagObj.name as string)?.toLowerCase() === tagName.toLowerCase() || 
                       (tagObj.id as string)?.toLowerCase() === tagName.toLowerCase();
              }
              return false;
            });

            if (hasTag) {
              bankCount++;
              totalCount++;
              transactionDetails.push({
                id: String(tx.id),
                bankName: bankName,
                amount: tx.Amount || tx.amount || tx.AmountRaw,
                tags: tx.tags
              });
            }
          }

          lastEvaluatedKey = result.LastEvaluatedKey;
          hasMoreItems = !!lastEvaluatedKey;
          if (hasMoreItems) await new Promise(r => setTimeout(r, 100));
        }
        
        console.log(`Debug: Bank ${bankName} has ${bankCount} transactions with tag "${tagName}"`);
        
      } catch (error) {
        console.error(`Debug: Error scanning bank ${bankName} (table: ${tableName}):`, error);
      }
    }

    console.log(`Debug: Total count for tag "${tagName}": ${totalCount}`);
    
    return NextResponse.json({
      tagName,
      totalCount,
      transactionDetails: transactionDetails.slice(-10), // Last 10 transactions for debugging
      summary: {
        totalBanks: banks.length,
        scannedTables: banks.map(b => getBankTransactionTable(String(b.bankName ?? '').trim())).filter(Boolean)
      }
    });

  } catch (error) {
    console.error('Debug: Error counting tag transactions:', error);
    return NextResponse.json({ error: 'Failed to count tag transactions' }, { status: 500 });
  }
}

