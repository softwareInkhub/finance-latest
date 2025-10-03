import { NextResponse } from 'next/server';
import { brmhCrud, getBankTransactionTable } from '../../../brmh-client';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const startTime = Date.now();
  const jobId = uuidv4();
  
  try {
    const { csv, statementId, startRow, endRow, bankId, accountId, fileName, userId, bankName, accountName, accountNumber, duplicateCheckFields, s3FileUrl, skipDuplicateCheck = true } = await request.json();
    
    if (!csv || !statementId || startRow == null || endRow == null || !bankId || !accountId || !bankName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get bank-specific table name
    const tableName = getBankTransactionTable(bankName);
    
    // Parse CSV to array of objects
    const parsed = Papa.parse(csv, { header: true });
    const rows = parsed.data as Record<string, string>[];
    const now = new Date().toISOString();

    console.log(`[${jobId}] Processing ${rows.length} transactions for account ${accountId}`);

    // Initialize progress tracking
    await updateProgress(jobId, rows.length, 0, 'processing');

    // OPTIMIZATION: Skip duplicate checking for maximum speed
    if (!skipDuplicateCheck && duplicateCheckFields && Array.isArray(duplicateCheckFields) && duplicateCheckFields.length > 0) {
      // Quick duplicate check within new data only (no database scan)
      const newDataKeys = new Set<string>();
      const duplicateRows: number[] = [];
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const key = duplicateCheckFields.map(f => (row[f] || '').toString().trim().toLowerCase()).join('|');
        if (newDataKeys.has(key)) {
          duplicateRows.push(i);
        }
        newDataKeys.add(key);
      }
      
      if (duplicateRows.length > 0) {
        await updateProgress(jobId, rows.length, 0, 'error', `Duplicate transactions found at rows: ${duplicateRows.join(', ')}`);
        return NextResponse.json({ 
          error: `Duplicate transactions found within uploaded data at rows: ${duplicateRows.join(', ')}`, 
          duplicateRows,
          jobId
        }, { status: 400 });
      }
    }

    // OPTIMIZATION: Ultra-fast batch processing
    const BATCH_SIZE = 50; // Larger batches for speed
    const MAX_CONCURRENCY = 10; // Higher concurrency
    let totalInserted = 0;
    let completed = 0;

    // Process in large batches with high concurrency
    for (let i = 0; i < rows.length; i += BATCH_SIZE * MAX_CONCURRENCY) {
      const batchPromises: Promise<number>[] = [];
      
      // Create multiple batches to process concurrently
      for (let j = 0; j < MAX_CONCURRENCY && (i + j * BATCH_SIZE) < rows.length; j++) {
        const batchStart = i + j * BATCH_SIZE;
        const batchEnd = Math.min(batchStart + BATCH_SIZE, rows.length);
        const batchRows = rows.slice(batchStart, batchEnd);
        
        const batchPromise = processBatchFast(batchRows, {
          tableName,
          statementId,
          bankId,
          bankName,
          accountId,
          accountName,
          accountNumber,
          fileName,
          userId,
          s3FileUrl,
          now
        });
        
        batchPromises.push(batchPromise);
      }
      
      // Wait for all batches in this group to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Update progress
      completed += batchResults.reduce((sum, count) => sum + count, 0);
      totalInserted += completed;
      
      await updateProgress(jobId, rows.length, completed, 'processing');
    }

    const totalTime = Date.now() - startTime;
    console.log(`[${jobId}] Successfully processed ${totalInserted} transactions in ${totalTime}ms (${Math.round(totalInserted / (totalTime / 1000))} tx/sec)`);
    
    await updateProgress(jobId, rows.length, rows.length, 'completed');
    
    return NextResponse.json({ 
      success: true, 
      inserted: totalInserted, 
      processingTime: totalTime,
      throughput: Math.round(totalInserted / (totalTime / 1000)),
      jobId
    });
  } catch (error) {
    console.error(`[${jobId}] Error processing transaction slice:`, error);
    await updateProgress(jobId, 0, 0, 'error', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Failed to process transaction slice', jobId }, { status: 500 });
  }
}

// Ultra-fast batch processing function
async function processBatchFast(rows: Record<string, string>[], context: {
  tableName: string;
  statementId: string;
  bankId: string;
  bankName: string;
  accountId: string;
  accountName: string;
  accountNumber: string;
  fileName: string;
  userId: string;
  s3FileUrl: string;
  now: string;
}): Promise<number> {
  const { tableName, statementId, bankId, bankName, accountId, accountName, accountNumber, fileName, userId, s3FileUrl, now } = context;
  
  // Prepare batch data
  const batchItems = rows.map((row) => {
    const cleaned: Record<string, string | string[]> = {};
    for (const key in row) {
      if (key && key.trim() !== '' && key !== 'tag' && key !== 'tags') {
        cleaned[key] = row[key];
      }
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
    return cleaned;
  });

  // Use Promise.allSettled for maximum speed
  const createPromises = batchItems.map(item => brmhCrud.create(tableName, item));
  const results = await Promise.allSettled(createPromises);
  
  // Count successful insertions
  let inserted = 0;
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      inserted++;
    }
  });
  
  return inserted;
}

// Helper function to update progress
async function updateProgress(jobId: string, total: number, completed: number, status: 'processing' | 'completed' | 'error', error?: string) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/transaction/slice/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, total, completed, status, error })
    });
  } catch (err) {
    console.warn('Failed to update progress:', err);
  }
}



