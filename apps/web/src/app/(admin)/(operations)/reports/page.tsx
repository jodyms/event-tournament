import { count, desc } from 'drizzle-orm';
import { DataTable, StatusPill } from '@/components/ui/data-table';
import { ListFilters } from '@/components/ui/list-filters';
import { Pager } from '@/components/ui/pager';
import { db } from '@/db/client';
import { jobOutbox } from '@/db/schema';
import { requirePermission } from '@/lib/auth/session';
import { reportStatus, reportWhere } from '@/lib/infra/report-filters';
import { pageWindow, withParams } from '@/lib/domain/tournament-status';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePermission('audit.read');
  const query = await searchParams;
  const status = reportStatus(query.status);
  const where = reportWhere({ q: query.q, status });
  const [totalRow] = await db.select({ value: count() }).from(jobOutbox).where(where);
  const total = Number(totalRow?.value ?? 0);
  const window = pageWindow(query.page, total);
  const rows = await db.select().from(jobOutbox).where(where).orderBy(desc(jobOutbox.createdAt)).limit(window.size).offset(window.start);
  const keep = { q: query.q, status };
  return <section>
    <header className="figma-heading"><div><h1>Reports</h1><p>Queued exports and delivery jobs. Search matches the job type.</p></div></header>
    <div className="figma-panel module-panel">
      <ListFilters action="/reports" query={query.q} placeholder="Search report" filters={[{ name: 'status', label: 'All status', value: status, options: [{ value: 'QUEUED', label: 'Queued' }, { value: 'DELIVERED', label: 'Delivered' }] }]} />
      <DataTable columns={['Type', 'Created', 'Attempts', 'Status']} empty="No report matches this filter." rows={rows.map((row) => ({ id: row.id, cells: [row.type, row.createdAt.toLocaleString(), row.attempts, <StatusPill key={row.id} label={row.processedAt ? 'Delivered' : 'Queued'} tone={row.processedAt ? 'success' : 'warning'} />] }))} />
      <Pager page={window.page} pages={window.pages} start={window.start} end={window.end} total={total} href={(page) => withParams('/reports', keep, { page: String(page) })} />
    </div>
  </section>;
}
