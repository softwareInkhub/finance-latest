import { NextRequest, NextResponse } from 'next/server';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, getBankTransactionTable } from '../../aws-client';

function toNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const match = val.replace(/₹|,/g, '').match(/-?\d+(?:\.\d+)?/);
    if (match) return parseFloat(match[0]);
  }
  return 0;
}

function extractAmountAndType(tx: Record<string, unknown>): { amountAbs: number; crdr: 'CR' | 'DR' | ''; debug: Record<string, unknown> } {
  const debug = {
    unified: tx.AmountRaw ?? tx.Amount ?? tx.amount,
    crdrField: '',
    num: 0,
    abs: 0,
    credit: 0,
    debit: 0,
    fields: Object.keys(tx),
    crdrFields: {
      'Dr./Cr.': tx['Dr./Cr.'],
      'Dr/Cr': tx['Dr/Cr'],
      'DR/CR': tx['DR/CR'],
      'dr/cr': tx['dr/cr'],
      'CR/DR': tx['CR/DR'],
      'cr/dr': tx['cr/dr'],
      'Cr/Dr': tx['Cr/Dr'],
      'Type': tx['Type']
    }
  };

  // Robustly locate a CR/DR indicator field across bank schemas
  const findCrDr = (): string => {
    const direct = (
      tx['Dr./Cr.'] ??
      tx['Dr/Cr'] ??
      tx['DR/CR'] ??
      tx['dr/cr'] ??
      tx['CR/DR'] ??
      tx['cr/dr'] ??
      tx['Cr/Dr'] ??
      tx['Type'] ??
      ''
    );
    const norm = direct?.toString().trim().toUpperCase();
    debug.crdrField = norm;
    if (norm) return norm;
    
    // Fallback: scan keys that contain both 'cr' and 'dr'
    for (const k of Object.keys(tx || {})) {
      const lk = k.toLowerCase();
      if (lk.includes('cr') && lk.includes('dr')) {
        const v = tx[k];
        if (v != null) {
          const result = String(v).trim().toUpperCase();
          debug.crdrField = result;
          return result;
        }
      }
    }
    return '';
  };
  
  const crdrField = findCrDr();

  if (debug.unified !== undefined) {
    debug.num = toNumber(debug.unified);
    debug.abs = Math.abs(debug.num);
    if (crdrField === 'CR' || crdrField === 'DR') return { amountAbs: debug.abs, crdr: crdrField as 'CR' | 'DR', debug };
    if (debug.num > 0) return { amountAbs: debug.abs, crdr: 'CR', debug };
    if (debug.num < 0) return { amountAbs: debug.abs, crdr: 'DR', debug };
  }

  // Try split credit/debit style fields
  for (const [rawKey, value] of Object.entries(tx)) {
    const key = rawKey.toLowerCase();
    const n = toNumber(value);
    if (!n) continue;
    if (key.includes('credit') || key.includes('deposit') || key.includes('cr amount') || /(^|\W)cr(\W|$)/.test(key)) {
      debug.credit += Math.abs(n);
    }
    if (key.includes('debit') || key.includes('withdraw') || key.includes('dr amount') || /(^|\W)dr(\W|$)/.test(key)) {
      debug.debit += Math.abs(n);
    }
  }
  
  if (debug.credit > 0 && debug.debit === 0) return { amountAbs: Math.round(debug.credit * 100) / 100, crdr: 'CR', debug };
  if (debug.debit > 0 && debug.credit === 0) return { amountAbs: Math.round(debug.debit * 100) / 100, crdr: 'DR', debug };

  return { amountAbs: 0, crdr: '', debug };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const bankName = searchParams.get('bankName') || 'HDFC';

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const tableName = getBankTransactionTable(bankName);
    
    // Get sample transactions
    const result = await docClient.send(new ScanCommand({ 
      TableName: tableName, 
      FilterExpression: 'userId = :userId', 
      ExpressionAttributeValues: { ':userId': userId },
      Limit: 20
    }));
    
    const transactions = result.Items || [];
    const analysis = transactions.map(tx => {
      const { amountAbs, crdr, debug } = extractAmountAndType(tx);
      return {
        transactionId: tx.id,
        description: tx.Description || tx.Narration || tx.Particulars,
        amount: tx.Amount || tx.amount || tx.AmountRaw,
        amountAbs,
        crdr,
        debug,
        tags: tx.tags
      };
    });

    const summary = {
      total: analysis.length,
      cr: analysis.filter(t => t.crdr === 'CR').length,
      dr: analysis.filter(t => t.crdr === 'DR').length,
      unknown: analysis.filter(t => t.crdr === '').length,
      crAmount: analysis.filter(t => t.crdr === 'CR').reduce((sum, t) => sum + t.amountAbs, 0),
      drAmount: analysis.filter(t => t.crdr === 'DR').reduce((sum, t) => sum + t.amountAbs, 0)
    };

    return NextResponse.json({
      userId,
      bankName,
      tableName,
      summary,
      analysis
    });

  } catch (error) {
    console.error('Error in CR/DR analysis:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}





