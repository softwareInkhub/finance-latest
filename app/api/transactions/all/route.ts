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
    

    // Fetch transactions from all bank tables in parallel for better performance
    const bankPromises = banks.map(async (bank: Record<string, unknown>) => {
      const tableName = getBankTransactionTable(bank.bankName as string);
      const bankTransactions: Record<string, unknown>[] = [];
      
      try {
        let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
        let hasMoreItems = true;
        let bankTransactionCount = 0;
        
        console.log(`Fetching transactions from bank: ${bank.bankName} (table: ${tableName})`);
        
        while (hasMoreItems && bankTransactions.length < Math.min(limit, 1000)) { // Limit per bank
          const result = await brmhCrud.scan(tableName, {
            FilterExpression: userId ? 'userId = :userId' : undefined,
            ExpressionAttributeValues: userId ? { ':userId': userId } : undefined,
            itemPerPage: 250
          });
          const allBankTransactions = result.items || [];
          
          // Filter transactions by user's account IDs
          const transactions = allBankTransactions.filter((transaction: Record<string, unknown>) => 
            userAccountIds.has(transaction.accountId)
          );
          
          bankTransactions.push(...transactions);
          bankTransactionCount += transactions.length;
          
          console.log(`Fetched ${transactions.length} transactions from ${bank.bankName} (total from this bank: ${bankTransactionCount})`);
          
          lastEvaluatedKey = result.lastEvaluatedKey;
          hasMoreItems = !!lastEvaluatedKey;
        }
        
        console.log(`Completed fetching from ${bank.bankName}: ${bankTransactionCount} transactions`);
        return bankTransactions;
      } catch (error) {
        console.warn(`Table ${tableName} not found, skipping:`, error);
        return [];
      }
    });
    
    // Wait for all banks to complete in parallel
    const bankResults = await Promise.all(bankPromises);
    const allTransactions = bankResults.flat();
    
    // Populate tag data for all transactions at once (more efficient)
    const transactionsWithTags = allTransactions.map((transaction: Record<string, unknown>) => {
      if (Array.isArray(transaction.tags)) {
        transaction.tags = transaction.tags
          .map(tag => typeof tag === 'string' ? tagsMap.get(tag) : tag)
          .filter(Boolean);
      }
      return transaction;
    });
    
    // Apply limit after processing all banks
    const limitedTransactions = transactionsWithTags.slice(0, limit);

    console.log(`Fetched ${limitedTransactions.length} total transactions from all banks (limited from ${allTransactions.length})`);
    
    // Return empty array if no transactions found, but don't treat as error
    if (limitedTransactions.length === 0) {
      console.log('No transactions found for user');
    }
    
    return NextResponse.json(limitedTransactions);
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch all transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 