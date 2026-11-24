import Link from 'next/link';
import { and, asc, count, eq, ilike, type SQL } from 'drizzle-orm';
import { savePitchModalAction } from '@/app/figma-actions';
import { BoundForm, SubmitButton } from '@/components/bound-form';
import { DataTable, RowMenu } from '@/components/data-table';
import { ListFilters } from '@/components/list-filters';
import { Modal } from '@/components/modal';
import { Pager } from '@/components/pager';
import { db } from '@/db/client';
import { tournaments, venues } from '@/db/schema';
import { pageWindow, withParams } from '@/lib/tournament-status';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const clauses = [query.q ? ilike(venues.name, `%${query.q}%`) : undefined, query.tournamentId ? eq(venues.tournamentId, query.tournamentId) : undefined].filter((clause): clause is SQL => Boolean(clause));
  const where = clauses.length ? and(...clauses) : undefined;
  const [totalRow] = await db.select({ value: count() }).from(venues).where(where);
  const total = Number(totalRow?.value ?? 0);
  const window = pageWindow(query.page, total);
  const [rows, tournamentRows] = await Promise.all([
    db.select({ venue: venues, tournament: tournaments }).from(venues).innerJoin(tournaments, eq(venues.tournamentId, tournaments.id)).where(where).orderBy(asc(venues.name)).limit(window.size).offset(window.start),
    db.select().from(tournaments).orderBy(asc(tournaments.name)),
  ]);
  const keep = { q: query.q, tournamentId: query.tournamentId };
  const close = withParams('/venues', keep, { modal: null });
  return <section>
    <header className="figma-heading"><div><h1>Pitch</h1><p>A new pitch creates a venue and a pitch of the same name.</p></div><Link className="dark-button" href={withParams('/venues', keep, { modal: 'pitch' })}>Add new pitch</Link></header>
    <div className="figma-panel module-panel">
      <ListFilters action="/venues" query={query.q} placeholder="Search pitch" filters={[{ name: 'tournamentId', label: 'All tournaments', value: query.tournamentId, options: tournamentRows.map((tournament) => ({ value: tournament.id, label: tournament.name })) }]} />
      <DataTable columns={['Pitch', 'Tournament', 'Address', 'Capacity', 'Map', '']} empty="No pitch matches this filter." rows={rows.map((row) => ({ id: row.venue.id, cells: [row.venue.name, row.tournament.name, row.venue.address || '—', row.venue.capacity ?? '—', row.venue.mapUrl ? <a href={row.venue.mapUrl} key={row.venue.id}>Map</a> : '—', <RowMenu items={[{ href: `/tournaments/${row.tournament.id}/setup?step=pitches`, label: 'Edit in tournament' }]} />] }))} />
      <Pager page={window.page} pages={window.pages} start={window.start} end={window.end} total={total} href={(page) => withParams('/venues', keep, { page: String(page) })} />
    </div>
    {query.modal === 'pitch' && <Modal closeHref={close} title="Add new pitch"><BoundForm action={savePitchModalAction}><label>Tournament<select name="tournamentId" required defaultValue={query.tournamentId ?? ''}><option value="">Select</option>{tournamentRows.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.name}</option>)}</select></label><label>Name<input name="name" required /></label><label>Address<input name="address" /></label><label>Capacity<input name="capacity" type="number" min={0} /></label><label>Map URL<input name="mapUrl" type="url" placeholder="https://" /></label><div className="form-actions"><SubmitButton>Save pitch</SubmitButton></div></BoundForm></Modal>}
  </section>;
}
