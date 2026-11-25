import Link from 'next/link';
import { and, asc, count, eq, ilike, inArray, type SQL } from 'drizzle-orm';
import { savePitchModalAction } from '@/app/actions/tournaments';
import { BoundForm, SubmitButton } from '@/components/ui/bound-form';
import { DataTable, RowMenu } from '@/components/ui/data-table';
import { ListFilters } from '@/components/ui/list-filters';
import { Modal } from '@/components/ui/modal';
import { Pager } from '@/components/ui/pager';
import { db } from '@/db/client';
import { matches, pitches, tournaments, venues } from '@/db/schema';
import { pageWindow, withParams } from '@/lib/domain/tournament-status';

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
  const close = withParams('/venues', keep, { modal: null, id: null });
  const selected = query.modal === 'venue' ? rows.find((row) => row.venue.id === query.id) : undefined;
  const selectedPitches = selected ? await db.select({ id: pitches.id }).from(pitches).where(eq(pitches.venueId, selected.venue.id)) : [];
  const used = selectedPitches.length ? await db.select({ id: matches.id }).from(matches).where(inArray(matches.pitchId, selectedPitches.map((pitch) => pitch.id))).limit(1) : [];
  const tournamentLocked = used.length > 0;
  return <section>
    <header className="figma-heading"><div><h1>Pitch</h1><p>Click a pitch to edit its name, tournament, address, capacity, or map.</p></div><Link className="dark-button" href={withParams('/venues', keep, { modal: 'pitch' })}>Add new pitch</Link></header>
    <div className="figma-panel module-panel">
      <ListFilters action="/venues" query={query.q} placeholder="Search pitch" filters={[{ name: 'tournamentId', label: 'All tournaments', value: query.tournamentId, options: tournamentRows.map((tournament) => ({ value: tournament.id, label: tournament.name })) }]} />
      <DataTable columns={['Pitch', 'Tournament', 'Address', 'Capacity', 'Map', '']} empty="No pitch matches this filter." rows={rows.map((row) => { const detailHref = withParams('/venues', keep, { modal: 'venue', id: row.venue.id }); return { id: row.venue.id, cells: [<Link className="row-link" href={detailHref} key={row.venue.id}>{row.venue.name}</Link>, row.tournament.name, row.venue.address || '—', row.venue.capacity ?? '—', row.venue.mapUrl ? <a href={row.venue.mapUrl} key={row.venue.id}>Map</a> : '—', <RowMenu items={[{ href: detailHref, label: 'Edit' }]} />] }; })} />
      <Pager page={window.page} pages={window.pages} start={window.start} end={window.end} total={total} href={(page) => withParams('/venues', keep, { page: String(page) })} />
    </div>
    {selected && <Modal closeHref={close} side title={selected.venue.name} subtitle={selected.tournament.name}><BoundForm action={savePitchModalAction}><input name="venueId" type="hidden" value={selected.venue.id} /><input name="back" type="hidden" value={withParams('/venues', keep, { modal: 'venue', id: selected.venue.id })} />{tournamentLocked ? <><input name="tournamentId" type="hidden" value={selected.venue.tournamentId} /><p className="split-note">This pitch is on a match. Its tournament stays the same. Name, address, capacity, and map can still change.</p></> : <label>Tournament<select name="tournamentId" required defaultValue={selected.venue.tournamentId}>{tournamentRows.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.name}</option>)}</select></label>}<label>Name<input name="name" required defaultValue={selected.venue.name} /></label><label>Address<input name="address" defaultValue={selected.venue.address ?? ''} /></label><label>Capacity<input name="capacity" type="number" min={0} defaultValue={selected.venue.capacity ?? ''} /></label><label>Map URL<input name="mapUrl" type="url" placeholder="https://" defaultValue={selected.venue.mapUrl ?? ''} /></label><div className="form-actions"><SubmitButton>Save pitch</SubmitButton></div></BoundForm></Modal>}
    {query.modal === 'pitch' && <Modal closeHref={close} title="Add new pitch"><BoundForm action={savePitchModalAction}><label>Tournament<select name="tournamentId" required defaultValue={query.tournamentId ?? ''}><option value="">Select</option>{tournamentRows.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.name}</option>)}</select></label><label>Name<input name="name" required /></label><label>Address<input name="address" /></label><label>Capacity<input name="capacity" type="number" min={0} /></label><label>Map URL<input name="mapUrl" type="url" placeholder="https://" /></label><div className="form-actions"><SubmitButton>Save pitch</SubmitButton></div></BoundForm></Modal>}
  </section>;
}
