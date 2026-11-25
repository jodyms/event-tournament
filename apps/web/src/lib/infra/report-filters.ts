import { and, ilike, isNotNull, isNull, type SQL } from 'drizzle-orm';
import { jobOutbox } from '@/db/schema';

export function reportStatus(value: string | undefined) {
  return value === 'QUEUED' || value === 'DELIVERED' ? value : undefined;
}

export function reportWhere(query: { q?: string; status?: string }) {
  const status = reportStatus(query.status);
  const clauses = [query.q ? ilike(jobOutbox.type, `%${query.q}%`) : undefined, status === 'QUEUED' ? isNull(jobOutbox.processedAt) : undefined, status === 'DELIVERED' ? isNotNull(jobOutbox.processedAt) : undefined].filter((clause): clause is SQL => Boolean(clause));
  return clauses.length ? and(...clauses) : undefined;
}
