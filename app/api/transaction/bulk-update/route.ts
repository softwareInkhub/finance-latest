import { NextResponse } from 'next/server';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, getBankTransactionTable } from '../../aws-client';

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

    // Process each table's updates
    const results = [];
    for (const [tableName, tableUpdates] of Object.entries(updatesByTable)) {
      const updatePromises = tableUpdates.map(async (update) => {
        const updateFields = [];
        const exprAttrNames: Record<string, string> = {};
        const exprAttrValues: Record<string, string | number | string[]> = {};
        
        if (update.tags) {
          updateFields.push('tags');
          exprAttrNames['#tags'] = 'tags';
          exprAttrValues[':tags'] = Array.isArray(update.tags) ? update.tags : [];
        }
        
        if (update.transactionData) {
          for (const [key, value] of Object.entries(update.transactionData)) {
            updateFields.push(key);
            exprAttrNames[`#${key}`] = key;
            exprAttrValues[`:${key}`] = value as string | number | string[];
          }
        }
        
        if (updateFields.length === 0) {
          return { transactionId: update.transactionId, success: false, error: 'No fields to update' };
        }
        
        const updateExpr = 'SET ' + updateFields.map(f => `#${f} = :${f}`).join(', ');
        
        try {
          await docClient.send(
            new UpdateCommand({
              TableName: tableName,
              Key: { id: update.transactionId },
              UpdateExpression: updateExpr,
              ExpressionAttributeNames: exprAttrNames,
              ExpressionAttributeValues: exprAttrValues,
            })
          );
          return { transactionId: update.transactionId, success: true };
        } catch (error) {
          return { transactionId: update.transactionId, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });
      
      const tableResults = await Promise.all(updatePromises);
      results.push(...tableResults);
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

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