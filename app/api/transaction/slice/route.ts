import { NextResponse } from 'next/server';
import { PutCommand, ScanCommand, ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { docClient, getBankTransactionTable } from '../../aws-client';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { csv, statementId, startRow, endRow, bankId, accountId, fileName, userId, bankName, accountName, accountNumber, duplicateCheckFields, s3FileUrl } = await request.json();
    if (!csv || !statementId || startRow == null || endRow == null || !bankId || !accountId || !bankName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get bank-specific table name
    const tableName = getBankTransactionTable(bankName);
    
    // Parse CSV to array of objects
    const parsed = Papa.parse(csv, { header: true });
    const rows = parsed.data as Record<string, string>[];
    const now = new Date().toISOString();

    // Fetch existing transactions for this accountId from the bank-specific table with pagination
    const existing: Record<string, string>[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
    let hasMoreItems = true;
    
    while (hasMoreItems) {
      const params: ScanCommandInput = {
        TableName: tableName,
        FilterExpression: 'accountId = :accountId',
        ExpressionAttributeValues: { ':accountId': accountId },
      };
      
      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }
      
      const existingResult = await docClient.send(new ScanCommand(params));
      const batchItems = (existingResult.Items || []) as Record<string, string>[];
      existing.push(...batchItems);
      
      // Check if there are more items to fetch
      lastEvaluatedKey = existingResult.LastEvaluatedKey;
      hasMoreItems = !!lastEvaluatedKey;
      
      // Add a small delay to avoid overwhelming DynamoDB
      if (hasMoreItems) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
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
      existing.map(tx => uniqueFields.map(f => (tx[f] || '').toString().trim().toLowerCase()).join('|'))
    );
      
    for (const row of rows) {
      const key = uniqueFields.map(f => (row[f] || '').toString().trim().toLowerCase()).join('|');
        if (existingSet.has(key)) {
          return NextResponse.json({ error: 'Duplicate transaction(s) exist in database. No transactions were saved.' }, { status: 400 });
      }
      }
    }

    // Save each row as a separate transaction item in the bank-specific table
    const putPromises = rows.map((row) => {
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
      return docClient.send(new PutCommand({
        TableName: tableName,
        Item: cleaned,
      }));
    });
    await Promise.all(putPromises);
    console.log(`Saved ${rows.length} transactions to ${tableName}`);
    return NextResponse.json({ success: true, count: rows.length });
  } catch (error) {
    console.error('Error saving transaction slice:', error);
    return NextResponse.json({ error: 'Failed to save transaction slice' }, { status: 500 });
  }
} 