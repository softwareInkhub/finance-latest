import { NextResponse } from 'next/server';
import { uploadToBrmhDrive } from '../../drive/brmh-drive';
import { brmhExecute } from '@/app/lib/brmhExecute';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

// POST /api/entity-files/upload
// Multipart form fields:
// - file: File
// - userId: string
// - entityName: string
// - customName: optional string
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const userId = String(formData.get('userId') || '');
    const entityName = String(formData.get('entityName') || '');
    const customName = formData.get('customName');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }
    if (!userId || !entityName) {
      return NextResponse.json({ error: 'userId and entityName are required' }, { status: 400 });
    }

    // Determine file name
    let fileName = typeof customName === 'string' && customName.trim() 
      ? customName.trim() 
      : (file as File).name || 'uploaded-file';
    
    // Ensure proper file extension
    if (!fileName.includes('.')) {
      const mimeType = (file as File).type;
      if (mimeType === 'text/csv') {
        fileName += '.csv';
      } else if (mimeType === 'application/pdf') {
        fileName += '.pdf';
      } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
        fileName += '.xlsx';
      }
    }

    // Upload file to BRMH Drive
    const arrayBuffer = await (file as File).arrayBuffer();
    const uploadResult = await uploadToBrmhDrive(userId, {
      name: fileName,
      mimeType: (file as File).type || 'application/octet-stream',
      size: (file as File).size,
      content: Buffer.from(arrayBuffer),
      tags: ['entity-file', entityName],
      filePath: `entities/${entityName}/files`
    }, 'ROOT');

    // If it's a CSV file, also parse and save to brmh-entity-transactions
    if ((file as File).type === 'text/csv' || fileName.toLowerCase().endsWith('.csv')) {
      try {
        const text = new TextDecoder().decode(new Uint8Array(arrayBuffer));
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        
        if (parsed.errors && parsed.errors.length > 0) {
          console.warn('CSV parse errors:', parsed.errors);
        }
        
        const rows = (parsed.data as Record<string, string>[]) || [];
        if (rows.length > 0) {
          const now = new Date().toISOString();
          const tableName = 'brmh-entity-transactions';

          // Save rows to entity transactions table (limited concurrency)
          const MAX_CONCURRENCY = 20;
          for (let i = 0; i < rows.length; i += MAX_CONCURRENCY) {
            const chunk = rows.slice(i, i + MAX_CONCURRENCY);
            const batch = chunk.map((row) => {
              const cleaned: Record<string, unknown> = {};
              for (const key in row) {
                if (key && key.trim() !== '') cleaned[key] = row[key];
              }
              cleaned['id'] = uuidv4();
              cleaned['transactionId'] = cleaned['id'];
              cleaned['entityName'] = entityName;
              cleaned['userId'] = userId;
              cleaned['fileName'] = fileName;
              cleaned['fileId'] = uploadResult.fileId;
              cleaned['createdAt'] = now;
              return brmhExecute({ executeType: 'crud', crudOperation: 'post', tableName, item: cleaned });
            });
            await Promise.all(batch);
            
            // Small delay for large files to avoid overwhelming the system
            if (rows.length > 200 && i + MAX_CONCURRENCY < rows.length) {
              await new Promise((r) => setTimeout(r, 25));
            }
          }
          
          console.log(`Successfully saved ${rows.length} transactions for entity ${entityName}`);
        }
      } catch (parseError) {
        console.error('Error parsing CSV for transactions:', parseError);
        // Don't fail the upload if parsing fails, just log the error
      }
    }

    return NextResponse.json({ 
      success: true, 
      fileId: uploadResult.fileId,
      fileName: uploadResult.name,
      s3Key: uploadResult.s3Key,
      size: uploadResult.size,
      mimeType: uploadResult.mimeType,
      createdAt: uploadResult.createdAt
    });
  } catch (error) {
    console.error('Error uploading entity file:', error);
    return NextResponse.json({ 
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
