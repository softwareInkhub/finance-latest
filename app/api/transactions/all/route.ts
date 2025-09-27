import { NextResponse } from 'next/server';
import { brmhCrud, getBankTransactionTable } from '../../brmh-client';



// GET /api/transactions/all?userId=xxx&limit=xxx&fetchAll=true
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const fetchAll = searchParams.get('fetchAll') === 'true';
  const limit = fetchAll ? 100000 : (searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 1000); // Fetch all if requested
  
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  
  try {
    // First, get user's banks and accounts to know which tables to scan and filter transactions
    const [banksResult, accountsResult, tagsResult] = await Promise.all([
      brmhCrud.scan('banks', {
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId }
      }),
      brmhCrud.scan('accounts', {
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId }
      }),
      brmhCrud.scan('tags', {
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId }
      })
    ]);
    
    const banks = banksResult.items || [];
    const userAccounts = accountsResult.items || [];
    const allTags = tagsResult.items || [];
    const tagsMap = new Map(allTags.map((tag: Record<string, unknown>) => [tag.id, tag]));
    
    // Create a set of user's account IDs for filtering transactions
    const userAccountIds = new Set(userAccounts.map((account: Record<string, unknown>) => account.id));
    

    // Fetch transactions from all bank tables with pagination
    const allTransactions: Record<string, unknown>[] = [];
    
    for (const bank of banks) {
      const tableName = getBankTransactionTable(bank.bankName);
      
      try {
        let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
        let hasMoreItems = true;
        let bankTransactionCount = 0;
        
        console.log(`Fetching transactions from bank: ${bank.bankName} (table: ${tableName})`);
        
        while (hasMoreItems && allTransactions.length < limit) {
          const result = await brmhCrud.scan(tableName, {
            FilterExpression: userId ? 'userId = :userId' : undefined,
            ExpressionAttributeValues: userId ? { ':userId': userId } : undefined,
            itemPerPage: Math.min(250, limit - allTransactions.length)
          });
          const allBankTransactions = result.items || [];
          
          // Filter transactions by user's account IDs
          const transactions = allBankTransactions.filter((transaction: Record<string, unknown>) => 
            userAccountIds.has(transaction.accountId)
          );
          
          // Populate tag data for each transaction
          const transactionsWithTags = transactions.map((transaction: Record<string, unknown>) => {
            if (Array.isArray(transaction.tags)) {
              transaction.tags = transaction.tags
                .map(tag => typeof tag === 'string' ? tagsMap.get(tag) : tag)
                .filter(Boolean);
            }
            return transaction;
          });
          
          allTransactions.push(...transactionsWithTags);
          bankTransactionCount += transactionsWithTags.length;
          
          console.log(`Fetched ${transactionsWithTags.length} transactions from ${bank.bankName} (total from this bank: ${bankTransactionCount}, overall total: ${allTransactions.length})`);
          
          // Check if we've reached the limit or if there are more items to fetch
          if (allTransactions.length >= limit) {
            hasMoreItems = false;
            console.log(`Reached limit of ${limit} transactions, stopping fetch`);
          } else {
            lastEvaluatedKey = result.lastEvaluatedKey;
            hasMoreItems = !!lastEvaluatedKey;
          }
          
          // Remove artificial delay; rely on SDK retry/backoff
        }
        
        console.log(`Completed fetching from ${bank.bankName}: ${bankTransactionCount} transactions`);
      } catch (error) {
        // If a table doesn't exist yet, skip it
        console.warn(`Table ${tableName} not found, skipping:`, error);
        continue;
      }
    }

    console.log(`Fetched ${allTransactions.length} total transactions from all banks`);
    
    // Return empty array if no transactions found, but don't treat as error
    if (allTransactions.length === 0) {
      console.log('No transactions found for user');
    }
    
    return NextResponse.json(allTransactions);
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch all transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 