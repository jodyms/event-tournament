import { randomBytes } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { AppError } from './errors';

const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSIONS = new Map([['image/png', 'png'], ['image/jpeg', 'jpg'], ['image/gif', 'gif']]);

export function uploadDirectory() {
  return path.join(process.cwd(), 'storage', 'uploads');
}

export function assertUpload(file: File) {
  if (file.size === 0) return null;
  if (file.size > MAX_BYTES) throw new AppError('FILE_TOO_LARGE', 'Upload PNG, JPG, or GIF up to 5MB.');
  const extension = EXTENSIONS.get(file.type);
  if (!extension) throw new AppError('FILE_TYPE', 'Upload PNG, JPG, or GIF up to 5MB.');
  return extension;
}

export async function saveUpload(file: File) {
  const extension = assertUpload(file);
  if (!extension) return null;
  const name = `${Date.now()}-${randomBytes(6).toString('hex')}.${extension}`;
  const directory = uploadDirectory();
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, name), Buffer.from(await file.arrayBuffer()));
  return `/api/uploads/${name}`;
}

export function uploadFile(form: FormData, name: string) {
  const value = form.get(name);
  return value instanceof File ? value : null;
}
