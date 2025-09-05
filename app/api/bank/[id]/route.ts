import { NextResponse } from 'next/server';
import { brmhExecute } from '@/app/lib/brmhExecute';
import { getBankTransactionTable } from '../../../config/database';

type BankRow = { bankName?: string };
type AccountRow = { id?: string; bankId?: string };
type StatementRow = { id?: string; bankId?: string };
type TxRow = { id?: string };

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updates = await request.json();
  if (!updates?.bankName) {
    return NextResponse.json({ error: 'Bank name is required' }, { status: 400 });
  }
  const r = await brmhExecute({
    executeType: 'crud',
    crudOperation: 'put',
    tableName: 'banks',
    key: { id },
    updates
  });
  return NextResponse.json(r);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // 1) Read bank to compute its transaction table
    const bankRes = await brmhExecute<{ item?: BankRow }>({
      executeType: 'crud',
      crudOperation: 'get',
      tableName: 'banks',
      id
    });
    const bank = bankRes.item;
    if (!bank) {
      return NextResponse.json({ error: 'Bank not found' }, { status: 404 });
    }

    // 2) Delete related accounts
    const accountsRes = await brmhExecute<{ items?: AccountRow[] }>({
      executeType: 'crud',
      crudOperation: 'get',
      tableName: 'accounts',
      pagination: 'true',
      itemPerPage: 1000
    });
    const relatedAccounts = (accountsRes.items || []).filter(a => a.bankId === id);
    const accountsToDelete = relatedAccounts.filter((a): a is AccountRow & { id: string } => typeof a.id === 'string');
    await Promise.all(accountsToDelete.map(a => brmhExecute({
      executeType: 'crud',
      crudOperation: 'delete',
      tableName: 'accounts',
      id: a.id
    })));

    // 3) Delete related statements
    const statementsTable = process.env.AWS_DYNAMODB_STATEMENTS_TABLE || 'bank-statements';
    const stmRes = await brmhExecute<{ items?: StatementRow[] }>({
      executeType: 'crud',
      crudOperation: 'get',
      tableName: statementsTable,
      pagination: 'true',
      itemPerPage: 1000
    });
    const relatedStatements = (stmRes.items || []).filter(s => s.bankId === id);
    const statementsToDelete = relatedStatements.filter((s): s is StatementRow & { id: string } => typeof s.id === 'string');
    await Promise.all(statementsToDelete.map(s => brmhExecute({
      executeType: 'crud',
      crudOperation: 'delete',
      tableName: statementsTable,
      id: s.id
    })));

    // 4) Delete related transactions from dynamic table
    const txTable = getBankTransactionTable(String(bank.bankName || ''));
    const txRes = await brmhExecute<{ items?: TxRow[] }>({
      executeType: 'crud',
      crudOperation: 'get',
      tableName: txTable,
      pagination: 'true',
      itemPerPage: 1000
    });
    const relatedTransactions = txRes.items || [];
    const txsToDelete = relatedTransactions.filter((t): t is TxRow & { id: string } => typeof t.id === 'string');
    await Promise.all(txsToDelete.map(tx => brmhExecute({
      executeType: 'crud',
      crudOperation: 'delete',
      tableName: txTable,
      id: tx.id
    })));

    // 5) Delete the bank
    await brmhExecute({
      executeType: 'crud',
      crudOperation: 'delete',
      tableName: 'banks',
      id
    });

    return NextResponse.json({
      success: true,
      deletedTransactions: txsToDelete.length,
      deletedStatements: statementsToDelete.length,
      deletedAccounts: accountsToDelete.length
    });
  } catch (error) {
    console.error('Error deleting bank:', error);
    return NextResponse.json({ error: 'Failed to delete bank' }, { status: 500 });
  }
}