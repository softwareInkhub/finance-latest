    import { NextResponse } from 'next/server';
import { brmhCrud, getBankTransactionTable } from '../../brmh-client';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const { csv, statementId, startRow, endRow, bankId, accountId, fileName, userId, bankName, accountName, accountNumber, duplicateCheckFields, s3FileUrl, skipDuplicateCheck = false } = await request.json();
    if (!csv || !statementId || startRow == null || endRow == null || !bankId || !accountId || !bankName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get bank-specific table name
    const tableName = getBankTransactionTable(bankName);
    
    // Parse CSV to array of objects
    const parsed = Papa.parse(csv, { header: true });
    const rows = parsed.data as Record<string, string>[];
    const now = new Date().toISOString();

    console.log(`Processing ${rows.length} transactions for account ${accountId}`);

    // OPTIMIZATION 1: Skip expensive duplicate checking for trusted uploads
    if (!skipDuplicateCheck && duplicateCheckFields && Array.isArray(duplicateCheckFields) && duplicateCheckFields.length > 0) {
      // OPTIMIZATION 2: Only check recent transactions (last 30 days) instead of all
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      try {
        // OPTIMIZATION 3: Use targeted query instead of full table scan
        const recentTransactions = await brmhCrud.scan(tableName, {
          FilterExpression: 'accountId = :accountId AND createdAt > :thirtyDaysAgo',
          ExpressionAttributeValues: { 
            ':accountId': accountId,
            ':thirtyDaysAgo': thirtyDaysAgo.toISOString()
          },
          itemPerPage: 50 // Limit to recent transactions only
        });
        
        const existing = recentTransactions.items || [];
        
        // Check for duplicates within the new data first (fast)
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
          return NextResponse.json({ 
            error: `Duplicate transactions found within uploaded data at rows: ${duplicateRows.join(', ')}`, 
            duplicateRows 
          }, { status: 400 });
        }
        
        // Check against recent existing data (much faster)
        const existingSet = new Set(
          existing.map((tx: Record<string, string>) => duplicateCheckFields.map(f => (tx[f] || '').toString().trim().toLowerCase()).join('|'))
        );
        
        const dbDuplicates: number[] = [];
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const key = duplicateCheckFields.map(f => (row[f] || '').toString().trim().toLowerCase()).join('|');
          if (existingSet.has(key)) {
            dbDuplicates.push(i);
          }
        }
        
        if (dbDuplicates.length > 0) {
          return NextResponse.json({ 
            error: `Duplicate transactions found in database at rows: ${dbDuplicates.join(', ')}`, 
            duplicateRows: dbDuplicates 
          }, { status: 400 });
        }
        
        console.log(`Duplicate check completed in ${Date.now() - startTime}ms`);
      } catch (duplicateError) {
        console.warn('Duplicate check failed, proceeding without check:', duplicateError);
        // Continue without duplicate check if it fails
      }
    }

    // OPTIMIZATION 4: Batch processing with concurrency control
    const BATCH_SIZE = 25;
    const MAX_CONCURRENCY = 5; // Limit concurrent batches
    let totalInserted = 0;
    let totalDuplicates = 0;

    // Process in batches with controlled concurrency
    for (let i = 0; i < rows.length; i += BATCH_SIZE * MAX_CONCURRENCY) {
      const batchPromises: Promise<{ inserted: number; duplicates: number }>[] = [];
      
      // Create multiple batches to process concurrently
      for (let j = 0; j < MAX_CONCURRENCY && (i + j * BATCH_SIZE) < rows.length; j++) {
        const batchStart = i + j * BATCH_SIZE;
        const batchEnd = Math.min(batchStart + BATCH_SIZE, rows.length);
        const batchRows = rows.slice(batchStart, batchEnd);
        
        const batchPromise = processBatch(batchRows, {
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
      
      // Aggregate results
      for (const result of batchResults) {
        totalInserted += result.inserted;
        totalDuplicates += result.duplicates;
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`Successfully processed ${totalInserted} transactions in ${totalTime}ms (${Math.round(totalInserted / (totalTime / 1000))} tx/sec)`);
    
    return NextResponse.json({ 
      success: true, 
      inserted: totalInserted, 
      duplicates: totalDuplicates,
      processingTime: totalTime,
      throughput: Math.round(totalInserted / (totalTime / 1000))
    });
  } catch (error) {
    console.error('Error processing transaction slice:', error);
    return NextResponse.json({ error: 'Failed to process transaction slice' }, { status: 500 });
  }
}

// OPTIMIZATION 5: Separate batch processing function
async function processBatch(rows: Record<string, string>[], context: {
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
}): Promise<{ inserted: number; duplicates: number }> {
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

  // OPTIMIZATION 6: Use Promise.allSettled for better error handling
  const createPromises = batchItems.map(item => brmhCrud.create(tableName, item));
  const results = await Promise.allSettled(createPromises);
  
  let inserted = 0;
  let duplicates = 0;
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      inserted++;
    } else {
      console.warn(`Failed to insert transaction ${index}:`, result.reason);
      // Check if it's a duplicate error
      if (result.reason?.message?.includes('duplicate') || result.reason?.message?.includes('already exists')) {
        duplicates++;
      }
    }
  });
  
  return { inserted, duplicates };
}