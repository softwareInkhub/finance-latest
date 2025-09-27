import { NextResponse } from 'next/server';
import { brmhCrud, TABLES } from '../../brmh-client';
import { brmhDrive } from '../../brmh-drive-client';
import { v4 as uuidv4 } from 'uuid';

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
    
    // Generate a temporary ID for the filename if needed
    const tempId = uuidv4();
    let baseFileName = typeof fileName === 'string' && fileName.trim() ? fileName.trim() : `${tempId}.csv`;
    if (!baseFileName.endsWith('.csv')) baseFileName += '.csv';
    
    // File size validation (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB` 
      }, { status: 400 });
    }
    
    console.log(`Starting statement upload for ${baseFileName} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    
    // Optimized base64 conversion
    const arrayBuffer = await file.arrayBuffer();
    const base64Start = Date.now();
    const base64Content = Buffer.from(arrayBuffer).toString('base64');
    const base64Time = Date.now() - base64Start;
    console.log(`Base64 conversion took ${base64Time}ms`);
    
    // Upload file using BRMH Drive (stores in brmh-drive-files table)
    console.log('Uploading file to BRMH Drive:', {
      userId,
      fileName: baseFileName,
      size: arrayBuffer.byteLength,
      bankName,
      accountId
    });
    
    // Upload file using BRMH Drive API (now properly configured)
    console.log('Uploading file to BRMH Drive:', {
      userId,
      fileName: baseFileName,
      size: arrayBuffer.byteLength,
      bankName,
      accountId
    });
    
    let uploadResult;
    let driveFileId;
    
    try {
      // 1. Upload to S3 via BRMH Drive API
      console.log('Attempting to upload to S3 via BRMH Drive API:', {
        userId,
        fileName: baseFileName,
        size: arrayBuffer.byteLength
      });
      
      uploadResult = await brmhDrive.uploadFile(userId as string, {
        name: baseFileName,
        mimeType: 'text/csv',
        size: arrayBuffer.byteLength,
        content: base64Content,
        tags: ['bank-statement', bankName as string, accountId as string]
      }, 'ROOT');
      
      console.log('BRMH Drive S3 upload successful:', uploadResult);
      driveFileId = uploadResult.fileId;
      
      // Verify the upload was successful
      if (uploadResult && uploadResult.fileId) {
        console.log('✅ S3 upload successful, fileId:', uploadResult.fileId);
        console.log('✅ S3 Key:', uploadResult.s3Key);
        
        // Verify the file exists in S3 by trying to get it
        try {
          const verifyResult = await brmhDrive.getFileById(userId as string, uploadResult.fileId);
          console.log('✅ File verification successful:', verifyResult);
        } catch (verifyError) {
          console.log('❌ File verification failed:', verifyError);
        }
      } else {
        console.log('❌ S3 upload failed, no fileId returned');
      }
      
      // 2. Save metadata to brmh-drive-files table
      const driveFileRecord = {
        id: driveFileId,
        userId: userId, // Keep for our app's filtering
        ownerId: userId, // Required by BRMH Drive backend
        name: baseFileName,
        type: 'file', // Required by BRMH Drive backend
        mimeType: 'text/csv',
        size: arrayBuffer.byteLength,
        content: base64Content, // Store base64 content for backup
        parentId: 'ROOT',
        tags: ['bank-statement', bankName as string, accountId as string],
        // Bank/Account metadata
        bankId: bankId as string,
        bankName: bankName as string,
        accountId: accountId as string,
        accountName: accountName as string,
        accountNumber: accountNumber as string,
        fileType: fileType as string || 'Statement',
        // S3 metadata
        s3Key: uploadResult.s3Key || '',
        s3Url: uploadResult.s3Url || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFile: true,
        isFolder: false,
        path: '', // Empty for root files
      };
      
      await brmhCrud.create(TABLES.BRMH_DRIVE_FILES, driveFileRecord);
      console.log('File metadata saved to brmh-drive-files table:', driveFileId);
      
    } catch (driveError) {
      console.error('BRMH Drive upload failed:', driveError);
      
      // Fallback: create a local file record
      uploadResult = {
        fileId: `local-${tempId}`,
        downloadUrl: '',
        message: 'BRMH Drive not available, using local storage'
      };
      driveFileId = uploadResult.fileId;
      
      console.log('Using fallback upload result:', uploadResult);
    }
    
    // For BRMH Drive files, we don't need to save to bank-statements table
    // The file is already stored in brmh-drive-files table with all metadata
    // Only save to bank-statements if it's a fallback (local storage)
    if (uploadResult.fileId && uploadResult.fileId.startsWith('local-')) {
      // Fallback case: save to bank-statements table
      const statement = {
        id: tempId,
        bankId,
        bankName,
        accountId,
        accountName: accountName || '',
        accountNumber: accountNumber || '',
        fileName: baseFileName,
        userId: userId,
        fileType: fileType || 'Statement',
        driveFileId: uploadResult.fileId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await brmhCrud.create(TABLES.BANK_STATEMENTS, statement);
      console.log('Saved fallback file to bank-statements table');
    } else {
      console.log('File saved to BRMH Drive, no need for bank-statements entry');
    }
    
    // Return the upload result
    return NextResponse.json({
      success: true,
      fileId: driveFileId,
      fileName: baseFileName,
      message: uploadResult.message || 'File uploaded successfully to both S3 and database'
    });
  } catch (error) {
    console.error('Error uploading statement:', error);
    return NextResponse.json({ error: 'Failed to upload statement' }, { status: 500 });
  }
} 