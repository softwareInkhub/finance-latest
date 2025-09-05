import { NextResponse } from 'next/server';
import { getBankTransactionTable } from '../../../config/database';
import { brmhExecute } from '@/app/lib/brmhExecute';

type BankRow = { id?: string; bankName?: string; userId?: string; createdAt?: string };
type AccountRow = { id?: string; bankId?: string; userId?: string; accountHolderName?: string; accountNumber?: string; createdAt?: string };
type StatementRow = { id?: string; accountId?: string; userId?: string; fileName?: string; createdAt?: string };
type TxRow = { id?: string; userId?: string; transactionDate?: string; date?: string; [key: string]: unknown };

// GET /api/dashboard/summary?userId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  
  try {
    // Get all banks/accounts/statements via BRMH and filter for user
    const banksRes = await brmhExecute<{ items?: BankRow[] }>({ executeType: 'crud', crudOperation: 'get', tableName: 'banks', pagination: 'true', itemPerPage: 1000 });
    const banks = (banksRes.items || []).filter(b => b.userId === userId);

    const accountsRes = await brmhExecute<{ items?: AccountRow[] }>({ executeType: 'crud', crudOperation: 'get', tableName: 'accounts', pagination: 'true', itemPerPage: 1000 });
    const accounts = (accountsRes.items || []).filter(a => a.userId === userId);

    const statementsRes = await brmhExecute<{ items?: StatementRow[] }>({ executeType: 'crud', crudOperation: 'get', tableName: 'bank-statements', pagination: 'true', itemPerPage: 1000 });
    const statements = (statementsRes.items || []).filter(s => s.userId === userId);
    
    // Get transaction counts and recent transactions (limited to 50 for dashboard)
    let totalTransactions = 0;
    const recentTransactions: Record<string, unknown>[] = [];
    
    for (const bank of banks) {
      const tableName = getBankTransactionTable(String(bank.bankName || ''));
      
      try {
        // Get transaction count for this bank
        // BRMH execute doesn't support COUNT; approximate by fetching a page and counting
        const pageRes = await brmhExecute<{ items?: TxRow[] }>({ executeType: 'crud', crudOperation: 'get', tableName, pagination: 'true', itemPerPage: 1000 });
        const pageItems = (pageRes.items || []).filter(t => t.userId === userId);
        totalTransactions += pageItems.length;
        
        // Get recent transactions for this bank (limit 10 per bank)
        const recentRes = await brmhExecute<{ items?: TxRow[] }>({ executeType: 'crud', crudOperation: 'get', tableName, pagination: 'true', itemPerPage: 50 });
        const bankRecentTransactions = (recentRes.items || []).filter(t => t.userId === userId).slice(0, 10);
        
        // Add bank name to each transaction for context
        const transactionsWithBank = bankRecentTransactions.map(transaction => ({
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
      banks: banks.map(bank => ({
        id: bank.id,
        bankName: bank.bankName,
        createdAt: bank.createdAt
      })),
      accounts: accounts.map(account => ({
        id: account.id,
        accountHolderName: account.accountHolderName,
        accountNumber: account.accountNumber,
        bankId: account.bankId,
        createdAt: account.createdAt
      })),
      statements: statements.map(statement => ({
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
