import { NextResponse } from 'next/server';
import { brmhCrud, getBankTransactionTable } from '../../brmh-client';

// GET /api/transactions/by-tag?userId=xxx&tagName=xxx&limit=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const tagName = searchParams.get('tagName');
  const limit = parseInt(searchParams.get('limit') || '100');
  
  if (!userId || !tagName) {
    return NextResponse.json({ error: 'userId and tagName are required' }, { status: 400 });
  }
  
  try {
    console.log(`🔍 Fetching transactions for tag: ${tagName}, userId: ${userId}`);
    
    // Get user's banks and accounts
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
    
    // Create maps for quick lookups
    const tagsMap = new Map(allTags.map((tag: Record<string, unknown>) => [tag.id, tag]));
    const userAccountIds = new Set(userAccounts.map((account: Record<string, unknown>) => account.id));
    
    // Find the tag ID for the given tag name
    const targetTag = allTags.find((tag: Record<string, unknown>) => 
      typeof tag.name === 'string' && tag.name.toLowerCase() === tagName.toLowerCase()
    );
    
    if (!targetTag) {
      console.log(`❌ Tag not found: ${tagName}`);
      return NextResponse.json([]);
    }
    
    const targetTagId = targetTag.id;
    console.log(`✅ Found tag ID: ${targetTagId} for tag: ${tagName}`);
    
    // Fetch transactions from all bank tables, but with more efficient filtering
    const tagTransactions: Record<string, unknown>[] = [];
    
    for (const bank of banks) {
      const tableName = getBankTransactionTable(bank.bankName);
      
      try {
        console.log(`🔍 Scanning bank: ${bank.bankName} (table: ${tableName})`);
        
        let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
        let hasMoreItems = true;
        let scannedCount = 0;
        let matchingTransactions: Record<string, unknown>[] = [];
        
        while (hasMoreItems && tagTransactions.length < limit) {
          const result = await brmhCrud.scan(tableName, {
            FilterExpression: 'userId = :userId',
            ExpressionAttributeValues: { ':userId': userId },
            itemPerPage: Math.min(50, limit - tagTransactions.length) // Even smaller batches for faster response
          });
          
          const bankTransactions = result.items || [];
          scannedCount += bankTransactions.length;
          
          // Filter transactions that belong to user's accounts AND have the target tag
          matchingTransactions = bankTransactions.filter((transaction: Record<string, unknown>) => {
            // Check if transaction belongs to user's account
            if (!userAccountIds.has(transaction.accountId)) {
              return false;
            }
            
            // Check if transaction has the target tag
            if (!Array.isArray(transaction.tags)) {
              return false;
            }
            
            return transaction.tags.some((tag: unknown) => {
              if (typeof tag === 'string') {
                return tag === targetTagId;
              }
              if (typeof tag === 'object' && tag !== null) {
                const tagObj = tag as Record<string, unknown>;
                return tagObj.id === targetTagId || 
                       (typeof tagObj.name === 'string' && tagObj.name.toLowerCase() === tagName.toLowerCase());
              }
              return false;
            });
          });
          
          // Populate tag data for matching transactions
          const enrichedTransactions = matchingTransactions.map((transaction: Record<string, unknown>) => {
            if (Array.isArray(transaction.tags)) {
              transaction.tags = transaction.tags
                .map(tag => typeof tag === 'string' ? tagsMap.get(tag) : tag)
                .filter(Boolean);
            }
            return transaction;
          });
          
          tagTransactions.push(...enrichedTransactions);
          
          // Early termination if we have enough transactions
          if (tagTransactions.length >= limit) {
            console.log(`✅ Found enough transactions (${tagTransactions.length}), stopping scan`);
            break;
          }
          
          // Check pagination
          lastEvaluatedKey = result.lastEvaluatedKey;
          hasMoreItems = !!lastEvaluatedKey;
          
          // Add small delay to avoid overwhelming the database
          if (hasMoreItems) {
            await new Promise(resolve => setTimeout(resolve, 25)); // Reduced delay
          }
        }
        
        console.log(`✅ Bank ${bank.bankName}: scanned ${scannedCount} transactions, found ${matchingTransactions.length} matching`);
        
      } catch (error) {
        console.error(`❌ Error scanning bank ${bank.bankName}:`, error);
        continue;
      }
    }
    
    console.log(`🎉 Total transactions found for tag "${tagName}": ${tagTransactions.length}`);
    
    return NextResponse.json(tagTransactions);
    
  } catch (error) {
    console.error('❌ Error fetching transactions by tag:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
