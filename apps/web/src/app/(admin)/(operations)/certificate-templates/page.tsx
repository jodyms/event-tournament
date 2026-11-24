import Link from 'next/link';
import { asc, count, ilike } from 'drizzle-orm';
import { saveCertificateTemplateAction } from '@/app/figma-actions';
import { BoundForm, SubmitButton } from '@/components/bound-form';
import { DataTable } from '@/components/data-table';
import { ListFilters } from '@/components/list-filters';
import { Modal } from '@/components/modal';
import { Pager } from '@/components/pager';
import { db } from '@/db/client';
import { certificateTemplates } from '@/db/schema';
import { pageWindow, shortDate, withParams } from '@/lib/tournament-status';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const where = query.q ? ilike(certificateTemplates.name, `%${query.q}%`) : undefined;
  const [totalRow] = await db.select({ value: count() }).from(certificateTemplates).where(where);
  const total = Number(totalRow?.value ?? 0);
  const window = pageWindow(query.page, total);
  const rows = await db.select().from(certificateTemplates).where(where).orderBy(asc(certificateTemplates.name)).limit(window.size).offset(window.start);
  const keep = { q: query.q };
  return <section>
    <header className="figma-heading"><div><h1>Template Certificate</h1><p>Global layouts used when a tournament issues a champion or participant certificate.</p></div><Link className="dark-button" href={withParams('/certificate-templates', keep, { modal: 'template' })}>Create template</Link></header>
    <div className="figma-panel module-panel">
      <ListFilters action="/certificate-templates" query={query.q} placeholder="Search template" />
      <DataTable columns={['Name', 'Description', 'Created']} empty="No certificate template yet." rows={rows.map((row) => ({ id: row.id, cells: [row.name, row.description || '—', shortDate(row.createdAt)] }))} />
      <Pager page={window.page} pages={window.pages} start={window.start} end={window.end} total={total} href={(page) => withParams('/certificate-templates', keep, { page: String(page) })} />
    </div>
    {query.modal === 'template' && <Modal closeHref={withParams('/certificate-templates', keep, { modal: null })} title="Create certificate template"><BoundForm action={saveCertificateTemplateAction}><label>Name<input name="name" required /></label><label>Description<textarea name="description" /></label><label>Logo<input name="logo" type="file" accept="image/png,image/jpeg,image/gif" /></label><label>Layout image<input name="layout" type="file" accept="image/png,image/jpeg,image/gif" /></label><div className="form-actions"><SubmitButton>Save template</SubmitButton></div></BoundForm></Modal>}
  </section>;
}
