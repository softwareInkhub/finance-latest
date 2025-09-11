import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import { uploadToBrmhDrive, buildPublicS3Url } from '../../drive/brmh-drive';
import { setProgress, clearProgress } from '../progressStore';
import { brmhExecute } from '@/app/lib/brmhExecute';

export const runtime = 'nodejs';

// POST /api/entity-transactions/upload
// Multipart form fields:
// - file: CSV File
// - userId: string
// - entityName: string
// - fileName: optional string
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const userId = String(formData.get('userId') || '');
    const entityName = String(formData.get('entityName') || '');
    const providedFileName = formData.get('fileName');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
    }
    if (!userId || !entityName) {
      return NextResponse.json({ error: 'userId and entityName are required' }, { status: 400 });
    }

    // Ensure a .csv name
    const statementId = uuidv4();
    let baseFileName = typeof providedFileName === 'string' && providedFileName.trim() ? providedFileName.trim() : `${statementId}.csv`;
    if (!baseFileName.toLowerCase().endsWith('.csv')) baseFileName += '.csv';

    // Upload original file to S3 under entities/<entity>/statements
    const arrayBuffer = await (file as File).arrayBuffer();
    const uploadResult = await uploadToBrmhDrive(userId, {
      name: baseFileName,
      mimeType: 'text/csv',
      size: (file as File).size,
      content: Buffer.from(arrayBuffer),
      tags: ['entity-statement', entityName],
      filePath: `entities/${entityName}/statements`
    }, 'ROOT');

    const s3FileUrl = buildPublicS3Url(uploadResult.bucket, uploadResult.s3Key);

    // Parse CSV
    const text = new TextDecoder().decode(new Uint8Array(arrayBuffer));
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    if (parsed.errors && parsed.errors.length > 0) {
      return NextResponse.json({ error: 'CSV parse error', details: parsed.errors.map(e => e.message || String(e)) }, { status: 400 });
    }
    const rows = (parsed.data as Record<string, string>[]) || [];
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No rows to save after parsing CSV' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const tableName = 'brmh-entity-transactions';

    // Generate a jobId so client can poll progress
    const jobId = `${entityName}:${uploadResult.fileId}`;

    // Save rows to entity table (limited concurrency)
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
        cleaned['fileName'] = baseFileName;
        cleaned['fileId'] = uploadResult.fileId; // link rows to the uploaded entity file
        cleaned['s3FileUrl'] = s3FileUrl;
        cleaned['createdAt'] = now;
        return brmhExecute({ executeType: 'crud', crudOperation: 'post', tableName, item: cleaned });
      });
      await Promise.all(batch);
      setProgress(jobId, Math.min(i + chunk.length, rows.length), rows.length);
      if (rows.length > 200 && i + MAX_CONCURRENCY < rows.length) {
        await new Promise((r) => setTimeout(r, 25));
      }
    }
    clearProgress(jobId);

    return NextResponse.json({ success: true, count: rows.length, entityName, fileName: baseFileName, s3FileUrl, jobId });
  } catch (error) {
    console.error('Error uploading entity transactions:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to upload entity transactions', details: message }, { status: 500 });
  }
}


