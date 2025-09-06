import { NextResponse } from 'next/server';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../../aws-client';
import { v4 as uuidv4 } from 'uuid';
import { uploadToBrmhDrive, buildPublicS3Url } from '../../drive/brmh-drive';

export const runtime = 'nodejs'; // Required for file uploads in Next.js API routes

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const bankId = formData.get('bankId');
    const bankName = formData.get('bankName');
    const accountId = formData.get('accountId');
    const accountName = formData.get('accountName');
    const accountNumber = formData.get('accountNumber');
    const fileName = formData.get('fileName');
    const userId = formData.get('userId');
    const fileType = formData.get('fileType');
    
    if (!file || typeof file === 'string' || !bankId || !bankName || !accountId) {
      return NextResponse.json({ error: 'Missing file, bankId, bankName, or accountId' }, { status: 400 });
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required for file upload' }, { status: 400 });
    }
    
    const statementId = uuidv4();
    let baseFileName = typeof fileName === 'string' && fileName.trim() ? fileName.trim() : `${statementId}.csv`;
    if (!baseFileName.endsWith('.csv')) baseFileName += '.csv';
    
    // Upload file to BRMH Drive under statements path
    const arrayBuffer = await file.arrayBuffer();
    const uploadResult = await uploadToBrmhDrive(String(userId), {
      name: baseFileName,
      mimeType: 'text/csv',
      size: (file as File).size,
      content: Buffer.from(arrayBuffer),
      tags: ['statement', String(bankName || ''), String(accountId || '')],
      filePath: 'statements'
    }, 'ROOT');
    
    const s3FileUrl = buildPublicS3Url(uploadResult.bucket, uploadResult.s3Key);
    const statement = {
      id: statementId,
      bankId,
      bankName,
      accountId,
      accountName: accountName || '',
      accountNumber: accountNumber || '',
      s3FileUrl,
      fileName: uploadResult.name,
      userId: userId,
      fileType: fileType || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await docClient.send(
      new PutCommand({
        TableName: TABLES.BANK_STATEMENTS,
        Item: statement,
      })
    );
    
    return NextResponse.json({ ...statement, brmhFileId: uploadResult.fileId, brmhS3Key: uploadResult.s3Key });
  } catch (error) {
    console.error('Error uploading statement:', error);
    return NextResponse.json({ error: 'Failed to upload statement' }, { status: 500 });
  }
} 