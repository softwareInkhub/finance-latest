import { NextResponse } from 'next/server';
import { brmhCrud, getBankTransactionTable } from '../../brmh-client';

// GET /api/dashboard/summary?userId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  
  try {
    // Get all banks
    const banksResult = await brmhCrud.scan('banks', {
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    });
    const banks = banksResult.items || [];
    
    // Get all accounts
    const accountsResult = await brmhCrud.scan('accounts', {
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    });
    const accounts = accountsResult.items || [];
    
    // Get all statements
    const statementsResult = await brmhCrud.scan('statements', {
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    });
    const statements = statementsResult.items || [];
    
    // Get transaction counts and recent transactions (limited to 50 for dashboard)
    let totalTransactions = 0;
    const recentTransactions: Record<string, unknown>[] = [];
    
    for (const bank of banks) {
      const tableName = getBankTransactionTable(bank.bankName);
      
      try {
        // Get transaction count for this bank
        const countResult = await brmhCrud.scan(tableName, {
          FilterExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': userId }
        });
        totalTransactions += countResult.count || 0;
        
        // Get recent transactions for this bank (limit 10 per bank)
        const recentResult = await brmhCrud.scan(tableName, {
          FilterExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': userId },
          itemPerPage: 10
        });
        const bankRecentTransactions = recentResult.items || [];
        
        // Add bank name to each transaction for context
        const transactionsWithBank = bankRecentTransactions.map((transaction: Record<string, unknown>) => ({
          ...transaction,
          bankName: bank.bankName
        }));
        
        recentTransactions.push(...transactionsWithBank);
        
      } catch (error) {
        // If a table doesn't exist yet, skip it
        console.warn(`Table ${tableName} not found, skipping:`, error);
        continue;
      }
    }
    
    // Sort recent transactions by date and take top 20
    const sortedRecentTransactions = recentTransactions
      .sort((a, b) => {
        const dateA = new Date((a.transactionDate || a.date || 0) as string | number | Date).getTime();
        const dateB = new Date((b.transactionDate || b.date || 0) as string | number | Date).getTime();
        return dateB - dateA;
      })
      .slice(0, 20);
    
    // Calculate summary stats
    const summary = {
      totalBanks: banks.length,
      totalAccounts: accounts.length,
      totalStatements: statements.length,
      totalTransactions,
      recentTransactions: sortedRecentTransactions,
      banks: banks.map((bank: Record<string, unknown>) => ({
        id: bank.id,
        bankName: bank.bankName,
        createdAt: bank.createdAt
      })),
      accounts: accounts.map((account: Record<string, unknown>) => ({
        id: account.id,
        accountHolderName: account.accountHolderName,
        accountNumber: account.accountNumber,
        bankId: account.bankId,
        createdAt: account.createdAt
      })),
      statements: statements.map((statement: Record<string, unknown>) => ({
        id: statement.id,
        fileName: statement.fileName,
        accountId: statement.accountId,
        createdAt: statement.createdAt
      }))
    };
    
    return NextResponse.json(summary);
    
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch dashboard summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
