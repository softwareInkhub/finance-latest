import { NextResponse } from 'next/server';
import { brmhCrud, TABLES } from '../brmh-client';

// GET /api/statements?accountId=xxx&userId=yyy&bankId=zzz
// Now fetches from brmh-drive-files table instead of bank-statements table
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const userId = searchParams.get('userId');
  const bankId = searchParams.get('bankId');
  
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  
  try {
    let filterExpression = 'userId = :userId AND isFile = :isFile';
    const expressionAttributeValues: Record<string, string | number> = {
      ':userId': userId,
      ':isFile': 1
    };
    
    if (accountId) {
      filterExpression += ' AND accountId = :accountId';
      expressionAttributeValues[':accountId'] = accountId;
    }
    
    if (bankId) {
      filterExpression += ' AND bankId = :bankId';
      expressionAttributeValues[':bankId'] = bankId;
    }
    
    // Fetch all files from brmh-drive-files table
    const result = await brmhCrud.scan(TABLES.BRMH_DRIVE_FILES, {
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      itemPerPage: 1000
    });
    
    const files = result.items || [];
    
    // Convert to statement format for compatibility
    const statements = files.map((file: Record<string, unknown>) => ({
      id: file.id,
      bankId: file.bankId || '',
      bankName: file.bankName || '',
      accountId: file.accountId || '',
      accountName: file.accountName || '',
      accountNumber: file.accountNumber || '',
      fileName: file.name,
      userId: file.userId,
      fileType: file.fileType || 'Statement',
      driveFileId: file.id,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      size: file.size,
      mimeType: file.mimeType,
      tags: file.tags || []
    }));
    
    return NextResponse.json(statements);
  } catch (error) {
    console.error('Error fetching statements:', error);
    return NextResponse.json({ error: 'Failed to fetch statements' }, { status: 500 });
  }
} 