import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(public code: string, message: string, public status = 400, public fields?: Record<string, string>) { super(message); }
}

export function apiError(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'One or more fields are invalid.', fields: Object.fromEntries(error.issues.map((issue) => [issue.path.join('.') || 'form', issue.message])) } }, { status: 422 });
  const known = error instanceof AppError ? error : new AppError('INTERNAL_ERROR', 'An unexpected error occurred.', 500);
  return NextResponse.json({ error: { code: known.code, message: known.message, ...(known.fields ? { fields: known.fields } : {}) } }, { status: known.status });
}

export function apiData<T>(data: T, meta: Record<string, unknown> = {}, status = 200) {
  return NextResponse.json({ data, meta }, { status });
}
