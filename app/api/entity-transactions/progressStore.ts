type Progress = { processed: number; total: number; updatedAt: number };

const store: Record<string, Progress> = {};

export function setProgress(jobId: string, processed: number, total: number) {
  store[jobId] = { processed, total, updatedAt: Date.now() };
}

export function getProgress(jobId: string): Progress | null {
  return store[jobId] || null;
}

export function clearProgress(jobId: string) {
  delete store[jobId];
}




