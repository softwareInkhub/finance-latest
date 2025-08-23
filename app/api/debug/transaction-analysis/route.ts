import { NextRequest, NextResponse } from 'next/server';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES, getBankTransactionTable } from '../../aws-client';

function toNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const match = val.replace(/₹|,/g, '').match(/-?\d+(?:\.\d+)?/);
    if (match) return parseFloat(match[0]);
  }
  return 0;
}

function extractAmountAndType(tx: Record<string, unknown>): { amountAbs: number; crdr: 'CR' | 'DR' | '' } {
  // Prefer unified amount fields if present
  const unified = tx.AmountRaw ?? tx.Amount ?? tx.amount;

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
    if (norm) return norm;
    // Fallback: scan keys that contain both 'cr' and 'dr'
    for (const k of Object.keys(tx || {})) {
      const lk = k.toLowerCase();
      if (lk.includes('cr') && lk.includes('dr')) {
        const v = tx[k];
        if (v != null) return String(v).trim().toUpperCase();
      }
    }
    return '';
  };
  const crdrField = findCrDr();

  if (unified !== undefined) {
    const num = toNumber(unified);
    const abs = Math.abs(num);
    if (crdrField === 'CR' || crdrField === 'DR') return { amountAbs: abs, crdr: crdrField as 'CR' | 'DR' };
    if (num > 0) return { amountAbs: abs, crdr: 'CR' };
    if (num < 0) return { amountAbs: abs, crdr: 'DR' };
  }

  // Try split credit/debit style fields
  let credit = 0;
  let debit = 0;
  for (const [rawKey, value] of Object.entries(tx)) {
    const key = rawKey.toLowerCase();
    const n = toNumber(value);
    if (!n) continue;
    if (key.includes('credit') || key.includes('deposit') || key.includes('cr amount') || /(^|\W)cr(\W|$)/.test(key)) {
      credit += Math.abs(n);
    }
    if (key.includes('debit') || key.includes('withdraw') || key.includes('dr amount') || /(^|\W)dr(\W|$)/.test(key)) {
      debit += Math.abs(n);
    }
  }
  if (credit > 0 && debit === 0) return { amountAbs: Math.round(credit * 100) / 100, crdr: 'CR' };
  if (debit > 0 && credit === 0) return { amountAbs: Math.round(debit * 100) / 100, crdr: 'DR' };

  return { amountAbs: 0, crdr: '' };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const tagName = searchParams.get('tagName');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Get all banks
    const banksResult = await docClient.send(new ScanCommand({ TableName: TABLES.BANKS }));
    const banks = (banksResult.Items || []) as Array<{ bankName?: string } & Record<string, unknown>>;

    const analysis: Array<Record<string, unknown>> = [];

    // Analyze transactions from each bank
    for (const bank of banks) {
      const bankName = String(bank.bankName ?? '').trim();
      if (!bankName) continue;
      
      const tableName = getBankTransactionTable(bankName);
      try {
        const result = await docClient.send(new ScanCommand({ 
          TableName: tableName, 
          FilterExpression: 'userId = :userId', 
          ExpressionAttributeValues: { ':userId': userId },
          Limit: 50 // Limit to first 50 transactions for analysis
        }));
        
        const txs = (result.Items || []) as Array<Record<string, unknown>>;

        for (const tx of txs) {
          const txTagsRaw = Array.isArray(tx.tags) ? tx.tags : [];
          const txTags = txTagsRaw.map((tag: unknown) => {
            if (typeof tag === 'string') return tag;
            if (tag && typeof tag === 'object' && tag !== null) {
              const tagObj = tag as Record<string, unknown>;
              return (tagObj.name as string) || (tagObj.id as string);
            }
            return null;
          }).filter(Boolean);

          // Only analyze transactions with the specified tag if provided
          if (tagName && !txTags.some((tag: string | null) => tag?.toLowerCase().includes(tagName.toLowerCase()))) {
            continue;
          }

          const { amountAbs, crdr } = extractAmountAndType(tx);
          
          analysis.push({
            transactionId: tx.id,
            bankName,
            tags: txTags,
            amount: tx.Amount || tx.amount || tx.AmountRaw,
            amountAbs,
            crdr,
            allFields: Object.keys(tx),
            crdrFields: {
              'Dr./Cr.': tx['Dr./Cr.'],
              'Dr/Cr': tx['Dr/Cr'],
              'DR/CR': tx['DR/CR'],
              'Type': tx['Type'],
              'Amount': tx['Amount'],
              'amount': tx['amount'],
              'AmountRaw': tx['AmountRaw']
            }
          });
        }
      } catch (error) {
        console.error(`Error analyzing bank ${bankName}:`, error);
      }
    }

    return NextResponse.json({
      userId,
      tagName,
      totalTransactionsAnalyzed: analysis.length,
      transactions: analysis,
      summary: {
        cr: analysis.filter(t => t.crdr === 'CR').length,
        dr: analysis.filter(t => t.crdr === 'DR').length,
        unknown: analysis.filter(t => t.crdr === '').length
      }
    });

  } catch (error) {
    console.error('Error in transaction analysis:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

