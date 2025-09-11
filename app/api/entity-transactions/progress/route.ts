import { NextResponse } from 'next/server';
import { getProgress } from '../progressStore';

export const runtime = 'nodejs';

// GET /api/entity-transactions/progress?jobId=...
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  if (!jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  const p = getProgress(jobId);
  if (!p) return NextResponse.json({ processed: null, total: null, done: true });
  return NextResponse.json({ processed: p.processed, total: p.total, done: p.processed >= p.total });
}




