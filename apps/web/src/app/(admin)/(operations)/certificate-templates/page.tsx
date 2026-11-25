import Link from 'next/link';
import { asc, count, eq, ilike } from 'drizzle-orm';
import { saveCertificateTemplateAction } from '@/app/actions/content';
import { BoundForm, SubmitButton } from '@/components/ui/bound-form';
import { CertificatePreview } from '@/components/features/certificate-preview';
import { DataTable, RowMenu } from '@/components/ui/data-table';
import { ListFilters } from '@/components/ui/list-filters';
import { Modal } from '@/components/ui/modal';
import { Pager } from '@/components/ui/pager';
import { db } from '@/db/client';
import { certificateTemplates } from '@/db/schema';
import { pageWindow, shortDate, withParams } from '@/lib/domain/tournament-status';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const where = query.q ? ilike(certificateTemplates.name, `%${query.q}%`) : undefined;
  const [totalRow] = await db.select({ value: count() }).from(certificateTemplates).where(where);
  const total = Number(totalRow?.value ?? 0);
  const window = pageWindow(query.page, total);
  const rows = await db.select().from(certificateTemplates).where(where).orderBy(asc(certificateTemplates.name)).limit(window.size).offset(window.start);
  const keep = { q: query.q };
  const close = withParams('/certificate-templates', keep, { modal: null, id: null });
  const templateId = query.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query.id) ? query.id : undefined;
  const selected = templateId && (query.modal === 'template' || query.modal === 'preview') ? (await db.select().from(certificateTemplates).where(eq(certificateTemplates.id, templateId)).limit(1))[0] : undefined;
  const editing = query.modal === 'template' ? selected : undefined;
  const preview = query.modal === 'preview' ? selected : undefined;
  return <section>
    <header className="figma-heading"><div><h1>Template Certificate</h1><p>Click a template to edit its name, description, logo, or layout.</p></div><Link className="dark-button" href={withParams('/certificate-templates', keep, { modal: 'template', id: null })}>Create template</Link></header>
    <div className="figma-panel module-panel">
      <ListFilters action="/certificate-templates" query={query.q} placeholder="Search template" />
      <DataTable columns={['Name', 'Description', 'Created', '']} empty="No certificate template yet." rows={rows.map((row) => { const editHref = withParams('/certificate-templates', keep, { modal: 'template', id: row.id }); const previewHref = withParams('/certificate-templates', keep, { modal: 'preview', id: row.id }); return { id: row.id, cells: [<Link className="row-link" href={editHref} key={row.id}>{row.name}</Link>, row.description || '—', shortDate(row.createdAt), <RowMenu items={[{ href: previewHref, label: 'Preview' }, { href: editHref, label: 'Edit' }]} />] }; })} />
      <Pager page={window.page} pages={window.pages} start={window.start} end={window.end} total={total} href={(page) => withParams('/certificate-templates', keep, { page: String(page) })} />
    </div>
    {query.modal === 'template' && !query.id && <Modal closeHref={close} title="Create certificate template"><BoundForm action={saveCertificateTemplateAction}><label>Name<input name="name" required maxLength={160} /></label><label>Description<textarea name="description" /></label><label>Logo<input name="logo" type="file" accept="image/png,image/jpeg,image/gif" /></label><label>Layout image<input name="layout" type="file" accept="image/png,image/jpeg,image/gif" /></label><div className="form-actions"><SubmitButton>Save template</SubmitButton></div></BoundForm></Modal>}
    {editing && <Modal closeHref={close} title="Edit certificate template" subtitle={editing.name}><BoundForm action={saveCertificateTemplateAction}><input name="id" type="hidden" value={editing.id} /><input name="back" type="hidden" value={withParams('/certificate-templates', keep, {})} /><label>Name<input name="name" required maxLength={160} defaultValue={editing.name} /></label><label>Description<textarea name="description" defaultValue={editing.description ?? ''} /></label>{editing.logoPath && <img alt="" className="preview-banner" src={editing.logoPath} />}<label>Logo<input name="logo" type="file" accept="image/png,image/jpeg,image/gif" /></label>{editing.layoutPath && <img alt="" className="preview-banner" src={editing.layoutPath} />}<label>Layout image<input name="layout" type="file" accept="image/png,image/jpeg,image/gif" /></label><p className="split-note">Leave a file empty to keep the current image.</p><div className="form-actions"><Link className="secondary-button" href={withParams('/certificate-templates', keep, { modal: 'preview', id: editing.id })}>Preview</Link><SubmitButton>Save template</SubmitButton></div></BoundForm></Modal>}
    {preview && <Modal closeHref={close} title="Certificate preview" subtitle={preview.name}><CertificatePreview title={preview.name} kind="Champion" recipientName="Sample Player" tournamentName="Sample Tournament" teamName="Sample Club" date={shortDate(new Date())} verificationCode="SAMPLE-0000" logoPath={preview.logoPath} layoutPath={preview.layoutPath} /><p className="split-note">Sample text shows how the logo and layout sit on a certificate. A generated file uses the real recipient and verification code.</p></Modal>}
  </section>;
}
