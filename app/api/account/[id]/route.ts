import { NextResponse } from 'next/server';
import { brmhExecute } from '@/app/lib/brmhExecute';
import { getBankTransactionTable } from '../../../config/database';

type BankRow = { bankName?: string };
type TxRow = { id?: string; accountId?: string };
type StatementRow = { id?: string; accountId?: string };

// PUT /api/account/[id]
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updates = await request.json();
  if (!updates?.bankId || !updates?.accountHolderName || !updates?.accountNumber || !updates?.ifscCode) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const r = await brmhExecute({
    executeType: 'crud',
    crudOperation: 'put',
    tableName: 'accounts',
    key: { id },
    updates
  });
  return NextResponse.json(r);
}

// DELETE /api/account/[id]
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // First, list banks via BRMH
    const banksRes = await brmhExecute<{ items?: BankRow[] }>({
      executeType: 'crud',
      crudOperation: 'get',
      tableName: 'banks',
      pagination: 'true',
      itemPerPage: 1000
    });
    const banks = banksRes.items || [];
    let totalDeletedTransactions = 0;

    // For each bank, delete transactions with this accountId
    for (const bank of banks) {
      const tableName = getBankTransactionTable(String(bank.bankName || ''));
      try {
        const txRes = await brmhExecute<{ items?: TxRow[] }>({
          executeType: 'crud',
          crudOperation: 'get',
          tableName,
          pagination: 'true',
          itemPerPage: 1000
        });
        const relatedTransactions = (txRes.items || []).filter(tx => tx.accountId === id);
        const toDelete = relatedTransactions.filter((t): t is TxRow & { id: string } => typeof t.id === 'string');
        if (toDelete.length > 0) {
          await Promise.all(toDelete.map((transaction) => brmhExecute({
            executeType: 'crud',
            crudOperation: 'delete',
            tableName,
            id: transaction.id
          })));
          totalDeletedTransactions += toDelete.length;
        }
      } catch {
        continue;
      }
    }

    // Delete related statements
    const statementsTable = process.env.AWS_DYNAMODB_STATEMENTS_TABLE || 'bank-statements';
    const stmRes = await brmhExecute<{ items?: StatementRow[] }>({
      executeType: 'crud',
      crudOperation: 'get',
      tableName: statementsTable,
      pagination: 'true',
      itemPerPage: 1000
    });
    const relatedStatements = (stmRes.items || []).filter(s => s.accountId === id);
    const stmToDelete = relatedStatements.filter((s): s is StatementRow & { id: string } => typeof s.id === 'string');
    if (stmToDelete.length > 0) {
      await Promise.all(stmToDelete.map((statement) => brmhExecute({
        executeType: 'crud',
        crudOperation: 'delete',
        tableName: statementsTable,
        id: statement.id
      })));
    }

    // Delete the account
    await brmhExecute({
      executeType: 'crud',
      crudOperation: 'delete',
      tableName: 'accounts',
      id
    });

    return NextResponse.json({
      success: true,
      deletedTransactions: totalDeletedTransactions,
      deletedStatements: stmToDelete.length
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}