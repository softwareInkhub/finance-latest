import { NextResponse } from 'next/server';
import { getBankTransactionTable } from '../../config/database';
import { brmhExecute } from '@/app/lib/brmhExecute';

// GET /api/transactions?accountId=xxx&userId=yyy&bankName=zzz
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const userId = searchParams.get('userId');
  const bankName = searchParams.get('bankName');
  
  if (!accountId || !bankName) {
    return NextResponse.json({ error: 'accountId and bankName are required' }, { status: 400 });
  }
  
  try {
    // Get bank-specific table name
    const tableName = getBankTransactionTable(bankName);
    
    // Fetch all transactions for this account and optional user (filter client-side)
    let allTransactions: Record<string, unknown>[] = [];
    try {
      const txRes = await brmhExecute<{ items?: Record<string, unknown>[] }>({
        executeType: 'crud', crudOperation: 'get', tableName, pagination: 'true', itemPerPage: 1000
      });
      allTransactions = (txRes.items || []).filter(t => (t as Record<string, unknown>).accountId === accountId && (!userId || (t as Record<string, unknown>).userId === userId));
    } catch (e) {
      console.warn('Primary BRMH execute failed, attempting CRUD fallback for transactions:', e);
      const CRUD_BASE = process.env.BRMH_CRUD_API_BASE_URL || process.env.CRUD_API_BASE_URL;
      if (CRUD_BASE) {
        try {
          const url = `${CRUD_BASE}/crud?tableName=${encodeURIComponent(tableName)}&pagination=true&itemPerPage=1000`;
          const res = await fetch(url, { method: 'GET', cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            const items = (data?.items as Record<string, unknown>[] | undefined) || [];
            allTransactions = items.filter(t => (t as Record<string, unknown>).accountId === accountId && (!userId || (t as Record<string, unknown>).userId === userId));
          } else {
            const text = await res.text().catch(() => '');
            throw new Error(`CRUD fallback failed: ${res.status} ${text}`);
          }
        } catch (fallbackErr) {
          console.error('CRUD fallback for transactions failed:', fallbackErr);
          // Final graceful fallback: return empty list so UI can continue (no duplicates assumed)
          allTransactions = [];
        }
      } else {
        // No fallback configured; return empty list gracefully
        allTransactions = [];
      }
    }

    // Fetch all tags to populate tag data (tolerate backend failures)
    const tagsTable = process.env.AWS_DYNAMODB_TAGS_TABLE || 'tags';
    let allTags: Array<{ id?: string } & Record<string, unknown>> = [];
    try {
      const tagsRes = await brmhExecute<{ items?: Array<{ id?: string } & Record<string, unknown>> }>({ executeType: 'crud', crudOperation: 'get', tableName: tagsTable, pagination: 'true', itemPerPage: 1000 });
      allTags = tagsRes.items || [];
    } catch (tagsErr) {
      console.warn('Fetching tags via BRMH failed; continuing with no tags:', tagsErr);
      allTags = [];
    }
    const tagsMap = new Map<string, Record<string, unknown>>(allTags.filter(t => typeof t.id === 'string').map(tag => [tag.id as string, tag]));

    // Populate tag data for each transaction (handle both string IDs and full objects)
    const transactions = allTransactions.map((transaction: Record<string, unknown>) => {
      const maybeTags = transaction.tags as unknown;
      if (Array.isArray(maybeTags)) {
        const mapped = (maybeTags as unknown[])
          .map((tag: unknown) => (typeof tag === 'string' ? tagsMap.get(tag) : tag))
          .filter(Boolean);
        transaction.tags = mapped as unknown[];
      }
      return transaction;
    });

    console.log(`Fetched ${transactions.length} transactions for account ${accountId}`);
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
} 