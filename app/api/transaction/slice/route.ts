import { NextResponse } from 'next/server';
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, getBankTransactionTable } from '../../aws-client';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { csv, statementId, startRow, endRow, bankId, accountId, fileName, userId, bankName, accountName, duplicateCheckFields, s3FileUrl } = await request.json();
    if (!csv || !statementId || startRow == null || endRow == null || !bankId || !accountId || !bankName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get bank-specific table name
    const tableName = getBankTransactionTable(bankName);
    
    // Parse CSV to array of objects
    const parsed = Papa.parse(csv, { header: true });
    const rows = parsed.data as Record<string, string>[];
    const now = new Date().toISOString();

    // Fetch existing transactions for this accountId from the bank-specific table
    const existingResult = await docClient.send(new ScanCommand({
      TableName: tableName,
      FilterExpression: 'accountId = :accountId',
      ExpressionAttributeValues: { ':accountId': accountId },
    }));
    const existing = (existingResult.Items || []) as Record<string, string>[];

    // Use provided fields for duplicate check
    const uniqueFields = Array.isArray(duplicateCheckFields) && duplicateCheckFields.length > 0 ? duplicateCheckFields : null;
    if (uniqueFields) {
    const existingSet = new Set(
      existing.map(tx => uniqueFields.map(f => (tx[f] || '').toString().trim().toLowerCase()).join('|'))
    );
    const newSet = new Set();
    for (const row of rows) {
      const key = uniqueFields.map(f => (row[f] || '').toString().trim().toLowerCase()).join('|');
      if (existingSet.has(key) || newSet.has(key)) {
        return NextResponse.json({ error: 'Duplicate transaction(s) exist. No transactions were saved.' }, { status: 400 });
      }
      newSet.add(key);
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
    return NextResponse.json({ success: true, count: rows.length });
  } catch (error) {
    console.error('Error saving transaction slice:', error);
    return NextResponse.json({ error: 'Failed to save transaction slice' }, { status: 500 });
  }
} 