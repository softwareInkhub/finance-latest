import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import Papa from 'papaparse';

export const runtime = 'nodejs';

// GET /api/entity-files/preview?s3Key=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const s3Key = searchParams.get('s3Key');
    if (!s3Key) return NextResponse.json({ error: 's3Key is required' }, { status: 400 });

    const region = process.env.AWS_REGION || 'us-east-1';
    const bucket = process.env.BRMH_S3_BUCKET || process.env.AWS_S3_BUCKET || 'brmh';
    const s3 = new S3Client({ region });
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: s3Key }));
    const stream = res.Body as unknown as ReadableStream;
    const text = await new Response(stream).text();

    type CsvRow = Record<string, string>;
    const parsed = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true });
    const headers: string[] = parsed.meta.fields || [];
    const rows: CsvRow[] = (Array.isArray(parsed.data) ? parsed.data : []) as CsvRow[]; // return all rows
    return NextResponse.json({ headers, rows });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 });
  }
}


