import { NextResponse } from 'next/server';

// In-memory progress tracking (in production, use Redis or database)
const progressMap = new Map<string, {
  total: number;
  completed: number;
  status: 'processing' | 'completed' | 'error';
  startTime: number;
  error?: string;
}>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }
  
  const progress = progressMap.get(jobId);
  if (!progress) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }
  
  return NextResponse.json({
    jobId,
    total: progress.total,
    completed: progress.completed,
    status: progress.status,
    percentage: progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0,
    elapsedTime: Date.now() - progress.startTime,
    error: progress.error
  });
}

export async function POST(request: Request) {
  const { jobId, total, status, error } = await request.json();
  
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }
  
  const existing = progressMap.get(jobId) || {
    total: 0,
    completed: 0,
    status: 'processing' as const,
    startTime: Date.now()
  };
  
  progressMap.set(jobId, {
    ...existing,
    total: total ?? existing.total,
    completed: status === 'completed' ? existing.total : existing.completed,
    status: status ?? existing.status,
    error: error ?? existing.error
  });
  
  // Clean up completed jobs after 5 minutes
  if (status === 'completed' || status === 'error') {
    setTimeout(() => {
      progressMap.delete(jobId);
    }, 5 * 60 * 1000);
  }
  
  return NextResponse.json({ success: true });
}

export async function PUT(request: Request) {
  const { jobId, completed } = await request.json();
  
  if (!jobId || completed === undefined) {
    return NextResponse.json({ error: 'jobId and completed are required' }, { status: 400 });
  }
  
  const existing = progressMap.get(jobId);
  if (!existing) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }
  
  progressMap.set(jobId, {
    ...existing,
    completed: Math.min(completed, existing.total)
  });
  
  return NextResponse.json({ success: true });
}



