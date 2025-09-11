import { NextResponse } from 'next/server';
import { brmhExecute } from '@/app/lib/brmhExecute';

// Lightweight type guard for drive items
interface DriveItem {
  ownerId?: unknown;
  type?: unknown;
  path?: unknown;
  name?: unknown;
}

function isEntityFolderForUser(it: DriveItem, userId: string): it is { ownerId: string; type: string; path: string; name?: string } {
  return (
    typeof it === 'object' && it !== null &&
    typeof it.ownerId === 'string' && it.ownerId === userId &&
    typeof it.type === 'string' && it.type === 'folder' &&
    typeof it.path === 'string' && it.path.startsWith('entities/')
  );
}

// GET /api/entities/list?userId=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const data = await brmhExecute<{ items?: DriveItem[] }>({
      executeType: 'crud',
      crudOperation: 'get',
      tableName: 'brmh-drive-files',
      pagination: 'true',
      itemPerPage: 1000
    });
    const items = data.items || [];

    const entities = items
      .filter((it) => isEntityFolderForUser(it, userId))
      .map((it) => (typeof it.name === 'string' ? it.name : ''))
      .filter((n): n is string => Boolean(n));

    // Return unique, sorted list
    const unique = Array.from(new Set(entities)).sort((a, b) => a.localeCompare(b));
    return NextResponse.json({ entities: unique });
  } catch (error) {
    console.error('Error listing entities:', error);
    return NextResponse.json({ error: 'Failed to list entities' }, { status: 500 });
  }
}


