import { NextResponse } from 'next/server';
import { getBankTransactionTable } from '../../../config/database';
import { brmhExecute } from '@/app/lib/brmhExecute';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { csv, statementId, startRow, endRow, bankId, accountId, fileName, userId, bankName, accountName, accountNumber, duplicateCheckFields, s3FileUrl } = await request.json();
    if (!csv || !statementId || startRow == null || endRow == null || !bankId || !accountId || !bankName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tableName = getBankTransactionTable(bankName);
    if (!tableName || typeof tableName !== 'string') {
      return NextResponse.json({ error: 'Invalid bankName for transaction table' }, { status: 400 });
    }

    // Parse CSV to array of objects
    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
    if (parsed.errors && parsed.errors.length > 0) {
      return NextResponse.json({ error: 'CSV parse error', details: parsed.errors.map(e => e.message || String(e)) }, { status: 400 });
    }
    const rows = (parsed.data as Record<string, string>[]) || [];
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No rows to save after parsing CSV' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Fetch existing transactions for this accountId from the bank-specific table with pagination
    type TxRecord = Record<string, unknown>;
    const existing: TxRecord[] = [];
    try {
      const existingRes = await brmhExecute<{ items?: TxRecord[] }>({ executeType: 'crud', crudOperation: 'get', tableName, pagination: 'true', itemPerPage: 1000 });
      existing.push(...((existingRes.items || []).filter((t: TxRecord & { accountId?: string }) => t.accountId === accountId)));
    } catch (e) {
      console.warn('Failed to fetch existing transactions; proceeding without duplicate DB check:', e);
    }

    // Use provided fields for duplicate check
    const uniqueFields = Array.isArray(duplicateCheckFields) && duplicateCheckFields.length > 0 ? duplicateCheckFields : null;
    if (uniqueFields) {
      // Check for duplicates within the new data first
      const newDataKeys = new Set<string>();
      for (const row of rows) {
        const key = uniqueFields.map(f => (row[f] || '').toString().trim().toLowerCase()).join('|');
        if (newDataKeys.has(key)) {
          return NextResponse.json({ error: 'Duplicate transaction(s) exist within the uploaded data. No transactions were saved.' }, { status: 400 });
        }
        newDataKeys.add(key);
      }

      // Check for duplicates against existing database data
      const existingSet = new Set(
        existing.map(tx => uniqueFields.map(f => String((tx as Record<string, unknown>)[f] ?? '').trim().toLowerCase()).join('|'))
      );

      for (const row of rows) {
        const key = uniqueFields.map(f => (row[f] || '').toString().trim().toLowerCase()).join('|');
        if (existingSet.has(key)) {
          return NextResponse.json({ error: 'Duplicate transaction(s) exist in database. No transactions were saved.' }, { status: 400 });
        }
      }
    }

    // Save each row as a separate transaction item in the bank-specific table, with limited concurrency
    const MAX_CONCURRENCY = 20;
    for (let i = 0; i < rows.length; i += MAX_CONCURRENCY) {
      const chunk = rows.slice(i, i + MAX_CONCURRENCY);
      const batch = chunk.map((row) => {
        // Clean row and add extra fields
        const cleaned: Record<string, string | string[]> = {};
        for (const key in row) {
          if (key && key.trim() !== '' && key !== 'tag' && key !== 'tags') cleaned[key] = row[key];
        }
        cleaned['tags'] = [];
        cleaned['userId'] = userId || '';
        cleaned['bankId'] = bankId;
        cleaned['bankName'] = bankName || '';
        cleaned['accountId'] = accountId;
        cleaned['accountName'] = accountName || '';
        cleaned['accountNumber'] = accountNumber || '';
        cleaned['statementId'] = statementId;
        cleaned['fileName'] = fileName || '';
        cleaned['s3FileUrl'] = s3FileUrl || '';
        cleaned['createdAt'] = now;
        cleaned['id'] = uuidv4();
        return brmhExecute({ executeType: 'crud', crudOperation: 'post', tableName, item: cleaned });
      });
      await Promise.all(batch);
      if (rows.length > 200 && i + MAX_CONCURRENCY < rows.length) {
        await new Promise((r) => setTimeout(r, 25));
      }
    }
    console.log(`Saved ${rows.length} transactions to ${tableName}`);
    return NextResponse.json({ success: true, count: rows.length });
  } catch (error) {
    console.error('Error saving transaction slice:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to save transaction slice', details: message }, { status: 500 });
  }
} 