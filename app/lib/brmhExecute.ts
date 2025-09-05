const BASE =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:5001';

const TOKEN = process.env.BACKEND_BEARER_TOKEN;

export async function brmhExecute<T = unknown>(payload: unknown, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...(init?.headers || {}),
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`BRMH execute failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}


