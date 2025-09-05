import { NextResponse } from 'next/server';
import { getBankTransactionTable } from '../../../config/database';
import { brmhExecute } from '@/app/lib/brmhExecute';
import { recomputeAndSaveTagsSummary } from '../../reports/tags-summary/aggregate';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { updates } = body; // Array of { transactionId, tags, bankName }
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid updates array' }, { status: 400 });
    }

    // Group updates by bank table to minimize API calls
    const updatesByTable: {
      [tableName: string]: {
        transactionId: string;
        tags: string[];
        bankName: string;
        transactionData?: Record<string, string | number | string[]>;
      }[];
    } = {};
    
    updates.forEach(update => {
      if (!update.transactionId || !update.bankName) {
        throw new Error('Missing transactionId or bankName in update');
      }
      
      const tableName = getBankTransactionTable(update.bankName);
      if (!updatesByTable[tableName]) {
        updatesByTable[tableName] = [];
      }
      updatesByTable[tableName].push(update);
    });

    // Process each table's updates (limit concurrency to avoid DynamoDB throttling)
    const results: Array<{ transactionId: string; success: boolean; error?: string }> = [];
    for (const [tableName, tableUpdates] of Object.entries(updatesByTable)) {
      const executeUpdate = async (update: {
        transactionId: string;
        tags: string[];
        bankName: string;
        transactionData?: Record<string, string | number | string[]>;
      }) => {
        const updatesObject: Record<string, string | number | string[]> = {};

        if (update.tags) {
          updatesObject['tags'] = Array.isArray(update.tags) ? update.tags : [];
        }

        if (update.transactionData) {
          for (const [key, value] of Object.entries(update.transactionData)) {
            updatesObject[key] = value as string | number | string[];
          }
        }

        if (Object.keys(updatesObject).length === 0) {
          return { transactionId: update.transactionId, success: false, error: 'No fields to update' };
        }

        try {
          await brmhExecute({
            executeType: 'crud',
            crudOperation: 'put',
            tableName,
            key: { id: update.transactionId },
            updates: updatesObject
          });
          return { transactionId: update.transactionId, success: true };
        } catch (error) {
          return { transactionId: update.transactionId, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      };

      const MAX_CONCURRENCY = 20; // keep under DynamoDB write capacity
      for (let i = 0; i < tableUpdates.length; i += MAX_CONCURRENCY) {
        const chunk = tableUpdates.slice(i, i + MAX_CONCURRENCY);
        const tableResults = await Promise.all(chunk.map(executeUpdate));
        results.push(...tableResults);
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    // Attempt to recompute tag summary asynchronously if a single userId is provided in any update.transactionData
    try {
      const anyWithUserId = (updates || []).find(u => u.transactionData && typeof (u.transactionData as Record<string, unknown>).userId === 'string');
      const userId = anyWithUserId ? (anyWithUserId.transactionData as Record<string, unknown>).userId as string : undefined;
      if (userId) {
        // Fire and forget - don't await this to avoid blocking the response
        recomputeAndSaveTagsSummary(userId).catch(e => {
          console.warn('Tags summary recompute after bulk update failed (non-blocking):', e);
        });
      }
    } catch (e) {
      console.warn('Tags summary recompute after bulk update failed (non-blocking):', e);
    }

    return NextResponse.json({ 
      success: true, 
      total: results.length,
      successful,
      failed,
      results
    });
  } catch (error) {
    console.error('Error bulk updating transactions:', error);
    return NextResponse.json({ error: 'Failed to bulk update transactions' }, { status: 500 });
  }
} 