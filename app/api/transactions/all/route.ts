import { NextResponse } from 'next/server';
import { getBankTransactionTable } from '../../../config/database';
import { brmhExecute } from '@/app/lib/brmhExecute';



// GET /api/transactions/all?userId=xxx&limit=xxx&fetchAll=true
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const fetchAll = searchParams.get('fetchAll') === 'true';
  const limit = fetchAll ? 100000 : (searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 1000); // Fetch all if requested
  
  try {
    // First, get all banks to know which tables to scan
    type BankRow = { bankName?: string };
    const banksRes = await brmhExecute<{ items?: BankRow[] }>({ executeType: 'crud', crudOperation: 'get', tableName: 'banks', pagination: 'true', itemPerPage: 1000 });
    const banks = banksRes.items || [];
    
    // Fetch all tags to populate tag data
    const tagsTable = process.env.AWS_DYNAMODB_TAGS_TABLE || 'tags';
    type TagRow = { id?: string } & Record<string, unknown>;
    const tagsRes = await brmhExecute<{ items?: TagRow[] }>({ executeType: 'crud', crudOperation: 'get', tableName: tagsTable, pagination: 'true', itemPerPage: 1000 });
    const allTags = tagsRes.items || [];
    const tagsMap = new Map<string, TagRow>(allTags.filter(t => typeof t.id === 'string').map(tag => [tag.id as string, tag]));
    

    // Fetch transactions from all bank tables with pagination
    const allTransactions: Record<string, unknown>[] = [];
    
    for (const bank of banks) {
      const tableName = getBankTransactionTable(String(bank.bankName || ''));
      
      try {
        let bankTransactionCount = 0;
        
        console.log(`Fetching transactions from bank: ${bank.bankName} (table: ${tableName})`);
        
        if (allTransactions.length < limit) {
          // Pull a page client-side; BRMH get is scan-based; filter by userId locally
          const pageRes = await brmhExecute<{ items?: Record<string, unknown>[] }>({
            executeType: 'crud', crudOperation: 'get', tableName: tableName, pagination: 'true', itemPerPage: Math.min(250, limit - allTransactions.length)
          });
          const transactions = pageRes.items || [];
          
          // Populate tag data for each transaction
          const transactionsWithTags = transactions.map((transaction: Record<string, unknown>) => {
            const maybeTags = transaction.tags as unknown;
            if (Array.isArray(maybeTags)) {
              const mapped = (maybeTags as unknown[])
                .map((tag: unknown) => (typeof tag === 'string' ? tagsMap.get(tag) : tag))
                .filter(Boolean);
              transaction.tags = mapped as unknown[];
            }
            return transaction;
          });
          
          const filtered = userId ? transactionsWithTags.filter(t => t.userId === userId) : transactionsWithTags;
          allTransactions.push(...filtered);
          bankTransactionCount += filtered.length;
          
          console.log(`Fetched ${transactionsWithTags.length} transactions from ${bank.bankName} (total from this bank: ${bankTransactionCount}, overall total: ${allTransactions.length})`);
          
          if (allTransactions.length >= limit) {
            console.log(`Reached limit of ${limit} transactions, stopping fetch`);
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