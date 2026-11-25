import Link from 'next/link';
import { and, count, desc, eq, gt, gte, ilike, lt, lte, or, type SQL } from 'drizzle-orm';
import { deleteDraftTournamentAction } from '@/app/actions/tournaments';
import { DataTable, RowMenu, StatusPill } from '@/components/ui/data-table';
import { ListFilters } from '@/components/ui/list-filters';
import { Modal } from '@/components/ui/modal';
import { Pager } from '@/components/ui/pager';
import { BoundForm, SubmitButton } from '@/components/ui/bound-form';
import { db } from '@/db/client';
import { teams, tournaments } from '@/db/schema';
import { pageWindow, shortDate, tournamentLabel, withParams } from '@/lib/domain/tournament-status';

function statusFilter(choice: string | undefined): SQL | undefined {
  const now = new Date();
  if (choice === 'DRAFT') return eq(tournaments.status, 'DRAFT');
  if (choice === 'CANCELLED') return eq(tournaments.status, 'CANCELLED');
  if (choice === 'SCHEDULED') return and(eq(tournaments.status, 'PUBLISHED'), gt(tournaments.startsAt, now));
  if (choice === 'ON_GOING') return and(eq(tournaments.status, 'PUBLISHED'), lte(tournaments.startsAt, now), gte(tournaments.endsAt, now));
  if (choice === 'FINISHED') return or(eq(tournaments.status, 'ARCHIVED'), and(eq(tournaments.status, 'PUBLISHED'), lt(tournaments.endsAt, now)));
  return undefined;
}
function dayBoundary(value: string | undefined, end = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return new Date(`${value}T${end ? '23:59:59' : '00:00:00'}`);
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const from = dayBoundary(query.from);
  const to = dayBoundary(query.to, true);
  const clauses = [statusFilter(query.status), query.q ? ilike(tournaments.name, `%${query.q}%`) : undefined, from ? gte(tournaments.startsAt, from) : undefined, to ? lte(tournaments.startsAt, to) : undefined].filter((clause): clause is SQL => Boolean(clause));
  const where = clauses.length ? and(...clauses) : undefined;
  const [totalRow] = await db.select({ value: count() }).from(tournaments).where(where);
  const total = Number(totalRow?.value ?? 0);
  const window = pageWindow(query.page, total);
  const rows = await db.select().from(tournaments).where(where).orderBy(desc(tournaments.startsAt)).limit(window.size).offset(window.start);
  const counts = new Map<string, number>();
  if (rows.length) {
    const grouped = await db.select({ tournamentId: teams.tournamentId, value: count() }).from(teams).groupBy(teams.tournamentId);
    for (const row of grouped) counts.set(row.tournamentId, Number(row.value));
  }
  const keep = { q: query.q, status: query.status, from: query.from, to: query.to };
  const discard = rows.find((row) => row.id === query.discard && row.status === 'DRAFT');
  return <section>
    <header className="figma-heading"><div><h1>Tournaments</h1><p>Create a draft, then finish age categories, stages, pitches, and rules.</p></div><Link className="dark-button" href="/tournaments/new">Add tournament</Link></header>
    <div className="figma-panel module-panel">
      <ListFilters action="/tournaments" query={query.q} placeholder="Search tournament" filters={[{ name: 'status', label: 'All status', value: query.status, options: [{ value: 'DRAFT', label: 'Draft' }, { value: 'SCHEDULED', label: 'Scheduled' }, { value: 'ON_GOING', label: 'On Going' }, { value: 'FINISHED', label: 'Finished' }, { value: 'CANCELLED', label: 'Canceled' }] }]} extra={<><label className="filter-select"><input name="from" type="date" defaultValue={query.from ?? ''} /></label><label className="filter-select"><input name="to" type="date" defaultValue={query.to ?? ''} /></label></>} />
      <DataTable columns={['Tournament', 'Start', 'End', 'Teams', 'Status', '']} empty="No tournament matches this filter." rows={rows.map((row) => { const label = tournamentLabel(row.status, row.startsAt, row.endsAt); return { id: row.id, cells: [<Link className="row-link" href={`/tournaments/${row.id}`} key={row.id}>{row.name}</Link>, shortDate(row.startsAt), shortDate(row.endsAt), counts.get(row.id) ?? 0, <StatusPill key={row.id} label={label.label} tone={label.tone} />, <RowMenu items={[{ href: `/tournaments/${row.id}`, label: 'Open' }, { href: `/tournaments/${row.id}/setup?step=details`, label: 'Edit setup' }, ...(row.status === 'DRAFT' ? [{ href: withParams('/tournaments', keep, { discard: row.id }), label: 'Discard draft' }] : [])]} />] }; })} />
      <Pager page={window.page} pages={window.pages} start={window.start} end={window.end} total={total} href={(page) => withParams('/tournaments', keep, { page: String(page) })} />
    </div>
    {discard && <Modal closeHref={withParams('/tournaments', keep, { discard: null })} title="Discard draft" subtitle={discard.name}><p className="split-note">This deletes the draft tournament and its matches, teams, and players.</p><BoundForm action={deleteDraftTournamentAction}><input name="id" type="hidden" value={discard.id} /><div className="form-actions"><SubmitButton>Discard draft</SubmitButton></div></BoundForm></Modal>}
  </section>;
}
