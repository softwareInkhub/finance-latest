import { NextResponse } from 'next/server';
import { ScanCommand, ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { docClient, getBankTransactionTable } from '../../aws-client';

// GET /api/transactions/all?userId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  try {
    // First, get all banks to know which tables to scan
    const banksResult = await docClient.send(
      new ScanCommand({
        TableName: 'banks',
      })
    );
    const banks = banksResult.Items || [];
    
    // Fetch all tags to populate tag data
    const tagsResult = await docClient.send(
      new ScanCommand({
        TableName: 'tags',
      })
    );
    const allTags = tagsResult.Items || [];
    const tagsMap = new Map(allTags.map(tag => [tag.id, tag]));

    // Fetch transactions from all bank tables
    const allTransactions: Record<string, unknown>[] = [];
    
    for (const bank of banks) {
      const tableName = getBankTransactionTable(bank.bankName);
      
      try {
        const params: ScanCommandInput = {
          TableName: tableName,
        };
        if (userId) {
          params.FilterExpression = 'userId = :userId';
          params.ExpressionAttributeValues = { ':userId': userId };
        }
        
        const result = await docClient.send(new ScanCommand(params));
        const transactions = result.Items || [];
        
        // Populate tag data for each transaction
        const transactionsWithTags = transactions.map(transaction => {
          if (Array.isArray(transaction.tags)) {
            transaction.tags = transaction.tags
              .map(tag => typeof tag === 'string' ? tagsMap.get(tag) : tag)
              .filter(Boolean);
          }
          return transaction;
        });
        
        allTransactions.push(...transactionsWithTags);
      } catch (error) {
        // If a table doesn't exist yet, skip it
        console.warn(`Table ${tableName} not found, skipping:`, error);
        continue;
      }
    }

    return NextResponse.json(allTransactions);
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch all transactions' }, { status: 500 });
  }
} 