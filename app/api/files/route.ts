import { NextResponse } from 'next/server';
import { brmhDrive } from '../brmh-drive-client';
import { brmhCrud } from '../brmh-client';

// GET /api/files - List files
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const parentId = searchParams.get('parentId') || 'ROOT';
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    console.log(`Fetching files for user: ${userId}, parentId: ${parentId}`);
    
    // First try to get files from local brmh-drive-files table
    try {
      const localFiles = await brmhCrud.scan('brmh-drive-files', {
        FilterExpression: 'userId = :userId AND parentId = :parentId',
        ExpressionAttributeValues: { 
          ':userId': userId,
          ':parentId': parentId
        },
        itemPerPage: limit
      });
      
      if (localFiles.items && localFiles.items.length > 0) {
        console.log(`Found ${localFiles.items.length} files in local brmh-drive-files table`);
        
        // Convert local files to the expected format
        const files = localFiles.items.map((file: Record<string, unknown>) => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
          userId: file.userId,
          parentId: file.parentId || 'ROOT',
          tags: file.tags || [],
          bankName: file.bankName,
          accountId: file.accountId,
          accountName: file.accountName,
          accountNumber: file.accountNumber,
          fileType: file.fileType,
          s3Key: file.s3Key,
          downloadUrl: file.downloadUrl
        }));
        
        return NextResponse.json({ files });
      }
    } catch (localError) {
      console.log('Local files not available, trying external BRMH Drive API:', localError);
    }
    
    // Fallback: List files using external BRMH Drive API
    try {
      const result = await brmhDrive.listFiles(userId, parentId, limit);
      return NextResponse.json(result);
    } catch (externalError) {
      console.log('External BRMH Drive API not accessible:', externalError);
      return NextResponse.json({ 
        files: [],
        message: 'BRMH backend not accessible. Files will appear once connection is restored.',
        userId,
        parentId
      });
    }
    
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json({ 
      error: 'Failed to list files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/files - Upload file (Optimized)
export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const userId = formData.get('userId');
    const parentId = formData.get('parentId') || 'ROOT';
    const tags = formData.get('tags');
    
    if (!file || typeof file === 'string' || !userId) {
      return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 });
    }
    
    // File size validation (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB` 
      }, { status: 400 });
    }
    
    console.log(`Starting upload for ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    
    // Optimized base64 conversion with streaming
    const arrayBuffer = await file.arrayBuffer();
    const base64Start = Date.now();
    
    // Use Buffer.from with encoding for better performance
    const base64Content = Buffer.from(arrayBuffer).toString('base64');
    
    const base64Time = Date.now() - base64Start;
    console.log(`Base64 conversion took ${base64Time}ms`);
    
    // Parse tags if provided
    let tagArray: string[] = [];
    if (tags && typeof tags === 'string') {
      try {
        tagArray = JSON.parse(tags);
      } catch {
        tagArray = [tags];
      }
    }
    
    // Upload file using BRMH Drive
    const uploadStart = Date.now();
    const uploadResult = await brmhDrive.uploadFile(userId as string, {
      name: file.name,
      mimeType: file.type,
      size: arrayBuffer.byteLength,
      content: base64Content,
      tags: tagArray
    }, parentId as string);
    
    const uploadTime = Date.now() - uploadStart;
    const totalTime = Date.now() - startTime;
    
    console.log(`Upload completed in ${totalTime}ms (base64: ${base64Time}ms, upload: ${uploadTime}ms)`);
    
    return NextResponse.json({
      ...uploadResult,
      performance: {
        totalTime,
        base64Time,
        uploadTime,
        fileSize: file.size
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}