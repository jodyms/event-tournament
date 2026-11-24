import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { saveNewsPageAction } from '@/app/figma-actions';
import { db } from '@/db/client';
import { news, tournaments } from '@/db/schema';
import { dateInput } from '@/lib/tournament-status';
import { BoundForm, SubmitButton } from './bound-form';
import { RichText } from './rich-text';

const categories = ['Match', 'Tournament', 'Announcement'];

export async function NewsEditor({ row }: { row?: typeof news.$inferSelect }) {
  const options = await db.select().from(tournaments).orderBy(asc(tournaments.name));
  const categoryOptions = row?.category && !categories.includes(row.category) ? [row.category, ...categories] : categories;
  return <section><header className="figma-heading"><div><p className="breadcrumb"><Link href="/news">News</Link><span>/</span><strong>{row ? 'Edit' : 'New'}</strong></p><h1>{row ? row.title : 'Create news'}</h1><p>Save a draft or publish it for the mobile app.</p></div></header><div className="wizard-card"><BoundForm action={saveNewsPageAction}>{row && <input name="id" type="hidden" value={row.id} />}{row?.coverUrl && <input name="existingCover" type="hidden" value={row.coverUrl} />}<label>Title<input name="title" required defaultValue={row?.title ?? ''} /></label><label>Category<select name="category" required defaultValue={row?.category ?? ''}><option value="">Select</option>{categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label>Tournament<select name="tournamentId" defaultValue={row?.tournamentId ?? ''}><option value="">No tournament</option>{options.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.name}</option>)}</select></label><label>Publish date<input name="publishDate" type="date" defaultValue={row?.publishedAt ? dateInput(row.publishedAt) : ''} /></label><label>Cover<input name="cover" type="file" accept="image/png,image/jpeg,image/gif" /></label>{row?.coverUrl && <img alt="" className="preview-banner" src={row.coverUrl} />}<RichText name="body" initial={row?.body ?? ''} /><div className="form-actions"><SubmitButton name="intent" value="draft" variant="secondary">Save draft</SubmitButton><SubmitButton name="intent" value="publish">Publish</SubmitButton></div></BoundForm></div></section>;
}
