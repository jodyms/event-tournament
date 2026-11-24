import { readFile } from 'fs/promises';
import path from 'path';
import { uploadDirectory } from '@/lib/uploads';

const types: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif' };

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const name = (await context.params).path.join('/');
  if (!/^[\w.-]+$/.test(name)) return new Response('Not found', { status: 404 });
  const file = await readFile(path.join(uploadDirectory(), name)).catch(() => null);
  if (!file) return new Response('Not found', { status: 404 });
  const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
  return new Response(file, { headers: { 'Content-Type': types[extension] ?? 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' } });
}
