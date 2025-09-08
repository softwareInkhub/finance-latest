import { NextResponse } from 'next/server';

interface DriveItem {
  ownerId?: unknown;
  type?: unknown;
  path?: unknown;
  name?: unknown;
}

// GET /api/entities/folders?userId=...&entityName=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const entityName = searchParams.get('entityName');
    if (!userId || !entityName) {
      return NextResponse.json({ error: 'userId and entityName are required' }, { status: 400 });
    }

    const crudBase = process.env.BRMH_CRUD_API_BASE_URL || process.env.CRID_API_BASE_URL || process.env.CRUD_API_BASE_URL || 'http://localhost:5001';
    const res = await fetch(`${crudBase}/crud?tableName=brmh-drive-files&pagination=true&itemPerPage=1000`, { method: 'GET', cache: 'no-store' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json({ error: `Failed to load folders: ${text}` }, { status: 500 });
    }
    const data = await res.json();
    const items = (data?.items as DriveItem[] | undefined) || [];
    const basePath = `entities/${entityName}/`;
    const folders = items
      .filter((it) => typeof it === 'object' && it !== null &&
        (it.ownerId as string) === userId && (it.type as string) === 'folder' && typeof it.path === 'string' && (it.path as string).startsWith(basePath))
      .map((it) => (typeof it.path === 'string' ? (it.path as string) : ''))
      .filter(Boolean)
      // only immediate child folders (depth 2: entities/<entity>/<folder>)
      .filter((p) => p.split('/').length === 3)
      .map((p) => p.split('/')[2]);

    const unique = Array.from(new Set(folders)).sort((a, b) => a.localeCompare(b));
    return NextResponse.json({ folders: unique });
  } catch (error) {
    console.error('Error listing entity folders:', error);
    return NextResponse.json({ error: 'Failed to list entity folders' }, { status: 500 });
  }
}



