import Link from 'next/link';
import { and, count, desc, eq, ilike, isNull, type SQL } from 'drizzle-orm';
import { DataTable, RowMenu, StatusPill } from '@/components/ui/data-table';
import { ListFilters } from '@/components/ui/list-filters';
import { Pager } from '@/components/ui/pager';
import { db } from '@/db/client';
import { news } from '@/db/schema';
import { pageWindow, shortDate, withParams } from '@/lib/domain/tournament-status';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const status = query.status === 'PUBLISHED' || query.status === 'DRAFT' || query.status === 'ARCHIVED' ? query.status : undefined;
  const clauses = [isNull(news.deletedAt), query.q ? ilike(news.title, `%${query.q}%`) : undefined, status ? eq(news.status, status) : undefined].filter((clause): clause is SQL => Boolean(clause));
  const where = and(...clauses);
  const [totalRow] = await db.select({ value: count() }).from(news).where(where);
  const total = Number(totalRow?.value ?? 0);
  const window = pageWindow(query.page, total);
  const rows = await db.select().from(news).where(where).orderBy(desc(news.createdAt)).limit(window.size).offset(window.start);
  const keep = { q: query.q, status: query.status };
  return <section>
    <header className="figma-heading"><div><h1>News</h1><p>Published news is what the mobile app can read.</p></div><Link className="dark-button" href="/news/new">Add news</Link></header>
    <div className="figma-panel module-panel">
      <ListFilters action="/news" query={query.q} placeholder="Search news" filters={[{ name: 'status', label: 'All status', value: query.status, options: [{ value: 'DRAFT', label: 'Draft' }, { value: 'PUBLISHED', label: 'Published' }, { value: 'ARCHIVED', label: 'Archived' }] }]} />
      <DataTable columns={['Title', 'Category', 'Published', 'Status', '']} empty="No news matches this filter." rows={rows.map((row) => { const editHref = `/news/${row.id}/edit`; return { id: row.id, cells: [<Link className="row-link" href={editHref} key={row.id}>{row.title}</Link>, row.category || '—', row.publishedAt ? shortDate(row.publishedAt) : '—', <StatusPill key={row.id} label={row.status === 'PUBLISHED' ? 'Published' : row.status === 'ARCHIVED' ? 'Archived' : 'Draft'} tone={row.status === 'PUBLISHED' ? 'success' : 'warning'} />, <RowMenu items={[{ href: editHref, label: 'Edit' }]} />] }; })} />
      <Pager page={window.page} pages={window.pages} start={window.start} end={window.end} total={total} href={(page) => withParams('/news', keep, { page: String(page) })} />
    </div>
  </section>;
}
