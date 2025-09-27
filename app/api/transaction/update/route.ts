import { NextResponse } from 'next/server';
import { brmhCrud, getBankTransactionTable } from '../../brmh-client';
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
    
    // Build the update expression dynamically
    const updateFields = [];
    const exprAttrNames: Record<string, string> = {};
    const exprAttrValues: Record<string, string | number | string[]> = {};
    if (transactionData) {
      for (const f of Object.keys(transactionData)) {
        updateFields.push(f);
        exprAttrNames[`#${f}`] = f;
        exprAttrValues[`:${f}`] = transactionData[f];
      }
    }
    if (tags) {
      // Extract only tag IDs from the tags array
      const tagIds = Array.isArray(tags) 
        ? tags.map(tag => typeof tag === 'string' ? tag : tag.id).filter(Boolean)
        : [];
      updateFields.push('tags');
      exprAttrNames['#tags'] = 'tags';
      exprAttrValues[':tags'] = tagIds;
    }
    // Build updates object for brmhCrud
    const updates: Record<string, string | number | string[]> = {};
    if (transactionData) {
      Object.assign(updates, transactionData);
    }
    if (tags) {
      const tagIds = Array.isArray(tags) 
        ? tags.map(tag => typeof tag === 'string' ? tag : tag.id).filter(Boolean)
        : [];
      updates.tags = tagIds;
    }
    
    await brmhCrud.update(tableName, { id: transactionId }, updates);
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