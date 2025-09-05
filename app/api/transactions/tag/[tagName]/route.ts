import { NextResponse } from 'next/server';
import { TABLES, getBankTransactionTable } from '../../../../config/database';
import { brmhExecute } from '@/app/lib/brmhExecute';

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
    type BankRow = { bankName?: string };
    const allBanks: BankRow[] = [];
    const banksRes = await brmhExecute<{ items?: BankRow[] }>({ executeType: 'crud', crudOperation: 'get', tableName: TABLES.BANKS, pagination: 'true', itemPerPage: 1000 });
    allBanks.push(...(banksRes.items || []));

    // Collect transactions that have the specified tag
    const transactions: Record<string, unknown>[] = [];
    
    type TxRow = { id?: string; userId?: string; tags?: unknown[] } & Record<string, unknown>;

    for (const bank of allBanks) {
      const tableName = getBankTransactionTable(typeof bank.bankName === 'string' ? bank.bankName : '');
      try {
        // Pull all and filter client-side
        const txRes = await brmhExecute<{ items?: TxRow[] }>({ executeType: 'crud', crudOperation: 'get', tableName, pagination: 'true', itemPerPage: 1000 });
        const batchTransactions = (txRes.items || []).filter((tx: TxRow) => tx.userId === userId && Array.isArray(tx.tags) && (tx.tags as unknown[]).includes(tagName));
        transactions.push(...batchTransactions);
      } catch {
        console.warn(`Table ${tableName} not found, skipping...`);
        continue;
      }
    }

    // Also check for transactions where tags is an array containing the tag name
    for (const bank of allBanks) {
      const tableName = getBankTransactionTable(typeof bank.bankName === 'string' ? bank.bankName : '');
      try {
        const txRes2 = await brmhExecute<{ items?: TxRow[] }>({ executeType: 'crud', crudOperation: 'get', tableName, pagination: 'true', itemPerPage: 1000 });
        const taggedTransactions = (txRes2.items || []).filter((tx: TxRow) => Array.isArray(tx.tags) && (tx.tags as unknown[]).some((t: unknown) => t === tagName || (t && typeof t === 'object' && (t as Record<string, unknown>).name === tagName)) && tx.userId === userId);
        transactions.push(...taggedTransactions);
      } catch {
        console.warn(`Table ${tableName} not found, skipping...`);
        continue;
      }
    }

    // Remove duplicates based on transaction ID
    const uniqueTransactions = transactions.filter((tx, index, self) => 
      index === self.findIndex(t => (t as Record<string, unknown>).id === (tx as Record<string, unknown>).id)
    );

    return NextResponse.json(uniqueTransactions);
  } catch (error) {
    console.error('Error fetching transactions by tag:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
