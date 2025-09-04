import { NextResponse } from 'next/server';
import { ScanCommand, ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { docClient, getBankTransactionTable } from '../../aws-client';

// GET /api/dashboard/summary?userId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  
  try {
    // Get all banks
    const banksResult = await docClient.send(
      new ScanCommand({
        TableName: 'banks',
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId }
      })
    );
    const banks = banksResult.Items || [];
    
    // Get all accounts
    const accountsResult = await docClient.send(
      new ScanCommand({
        TableName: 'accounts',
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId }
      })
    );
    const accounts = accountsResult.Items || [];
    
    // Get all statements
    const statementsResult = await docClient.send(
      new ScanCommand({
        TableName: 'statements',
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId }
      })
    );
    const statements = statementsResult.Items || [];
    
    // Get transaction counts and recent transactions (limited to 50 for dashboard)
    let totalTransactions = 0;
    const recentTransactions: Record<string, unknown>[] = [];
    
    for (const bank of banks) {
      const tableName = getBankTransactionTable(bank.bankName);
      
      try {
        // Get transaction count for this bank
        const countParams: ScanCommandInput = {
          TableName: tableName,
          FilterExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': userId },
          Select: 'COUNT'
        };
        
        const countResult = await docClient.send(new ScanCommand(countParams));
        totalTransactions += countResult.Count || 0;
        
        // Get recent transactions for this bank (limit 10 per bank)
        const recentParams: ScanCommandInput = {
          TableName: tableName,
          FilterExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': userId },
          Limit: 10
        };
        
        const recentResult = await docClient.send(new ScanCommand(recentParams));
        const bankRecentTransactions = recentResult.Items || [];
        
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
