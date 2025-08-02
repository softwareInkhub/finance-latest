import { NextResponse } from 'next/server';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../aws-client';

// GET /api/files?userId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLES.BANK_STATEMENTS,
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })
    );
    
    // Transform the data to match the expected file format
    const files = (result.Items || []).map((item: any) => ({
      id: item.id,
      name: item.fileName || item.name || 'Unknown file',
      type: item.fileType || 'csv',
      bank: item.bankName,
      bankId: item.bankId,
      accountId: item.accountId,
      accountName: item.accountName,
      createdAt: item.createdAt,
      s3FileUrl: item.s3FileUrl,
    }));
    
    return NextResponse.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
  }
} 