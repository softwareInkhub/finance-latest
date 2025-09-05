import { NextResponse } from 'next/server';
import { getBankTransactionTable } from '../../../config/database';
import { brmhExecute } from '@/app/lib/brmhExecute';
import { recomputeAndSaveTagsSummary } from '../../reports/tags-summary/aggregate';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transactionId, transactionData, tags, bankName } = body;
    if (!transactionId || (!transactionData && !tags) || !bankName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get bank-specific table name
    const tableName = getBankTransactionTable(bankName);
    
    // Build updates object dynamically
    const updatesObject: Record<string, string | number | string[]> = {};
    if (transactionData) {
      for (const f of Object.keys(transactionData)) {
        updatesObject[f] = transactionData[f] as string | number | string[];
      }
    }
    if (tags) {
      const tagIds = Array.isArray(tags)
        ? (tags.map(tag => (typeof tag === 'string' ? tag : tag.id)).filter(Boolean) as string[])
        : [];
      updatesObject['tags'] = tagIds;
    }
    // Forward update to BRMH execute (crud put)
    await brmhExecute({
      executeType: 'crud',
      crudOperation: 'put',
      tableName,
      key: { id: transactionId },
      updates: updatesObject
    });
    // Fire-and-forget recompute of user tag summary if userId is present in transactionData
    try {
      const userId = (transactionData && (transactionData as Record<string, unknown>).userId) as string | undefined;
      if (userId) {
        // Don't block the response on recompute to keep single updates snappy
        recomputeAndSaveTagsSummary(userId).catch(() => {});
      }
    } catch (e) {
      console.warn('Tags summary recompute after transaction update failed (non-blocking):', e);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
} 