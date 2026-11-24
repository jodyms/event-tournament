import Link from 'next/link';
import { and, asc, count, eq, ilike, type SQL } from 'drizzle-orm';
import { deleteTeamAction } from '@/app/figma-actions';
import { BoundForm, SubmitButton } from '@/components/bound-form';
import { DataTable, RowMenu, StatusPill } from '@/components/data-table';
import { ListFilters } from '@/components/list-filters';
import { Modal } from '@/components/modal';
import { Pager } from '@/components/pager';
import { TeamDrawer } from '@/components/team-drawer';
import { db } from '@/db/client';
import { ageGroups, coachNameSubmissions, players, stages, teams, tournaments } from '@/db/schema';
import { jerseyColor, pageWindow, withParams } from '@/lib/tournament-status';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const clauses = [query.q ? ilike(teams.name, `%${query.q}%`) : undefined, query.tournamentId ? eq(teams.tournamentId, query.tournamentId) : undefined].filter((clause): clause is SQL => Boolean(clause));
  const where = clauses.length ? and(...clauses) : undefined;
  const [totalRow] = await db.select({ value: count() }).from(teams).where(where);
  const total = Number(totalRow?.value ?? 0);
  const window = pageWindow(query.page, total);
  const [rows, tournamentRows, approvedPlayers, approvedCoaches] = await Promise.all([
    db.select({ team: teams, tournament: tournaments, group: ageGroups, stage: stages }).from(teams).innerJoin(tournaments, eq(teams.tournamentId, tournaments.id)).innerJoin(ageGroups, eq(teams.ageGroupId, ageGroups.id)).leftJoin(stages, eq(teams.stageId, stages.id)).where(where).orderBy(asc(teams.name)).limit(window.size).offset(window.start),
    db.select().from(tournaments).orderBy(asc(tournaments.name)),
    db.select({ teamId: players.teamId, value: count() }).from(players).where(eq(players.approvalStatus, 'APPROVED')).groupBy(players.teamId),
    db.select({ teamId: coachNameSubmissions.teamId, value: count() }).from(coachNameSubmissions).where(eq(coachNameSubmissions.status, 'APPROVED')).groupBy(coachNameSubmissions.teamId),
  ]);
  const playerCount = new Map(approvedPlayers.map((row) => [row.teamId, Number(row.value)]));
  const coachCount = new Map(approvedCoaches.map((row) => [row.teamId, Number(row.value)]));
  const keep = { q: query.q, tournamentId: query.tournamentId };
  const confirm = rows.find((row) => row.team.id === query.confirm);
  return <section>
    <header className="figma-heading"><div><h1>Teams</h1><p>Club registration, jersey setup, coaches, and squad.</p></div><Link className="dark-button" href="/teams/new">Add new team</Link></header>
    <div className="figma-panel module-panel">
      <ListFilters action="/teams" query={query.q} placeholder="Search club" filters={[{ name: 'tournamentId', label: 'All tournaments', value: query.tournamentId, options: tournamentRows.map((tournament) => ({ value: tournament.id, label: tournament.name })) }]} />
      <DataTable columns={['Club', 'Tournament', 'Age', 'Group', 'Players', 'Setup', '']} empty="No club matches this filter." rows={rows.map((row) => {
        const playersOnTeam = playerCount.get(row.team.id) ?? 0;
        const ready = playersOnTeam > 0 && (coachCount.get(row.team.id) ?? 0) > 0 && Boolean(jerseyColor(row.team.homeJersey) && jerseyColor(row.team.awayJersey));
        const label = ready ? 'Setup complete' : playersOnTeam ? 'Setup incomplete' : 'Player Unregist';
        return { id: row.team.id, cells: [row.team.name, row.tournament.name, row.group.name, row.stage?.name ?? '—', playersOnTeam, <StatusPill key={row.team.id} label={label} tone={ready ? 'success' : 'danger'} />, <RowMenu items={[{ href: withParams('/teams', keep, { modal: 'team', id: row.team.id, panel: 'information' }), label: 'Detail' }, { href: withParams('/teams', keep, { modal: 'team', id: row.team.id, panel: 'setup' }), label: 'Setup' }, { href: withParams('/teams', keep, { modal: 'team', id: row.team.id, panel: 'players' }), label: 'Players' }, { href: withParams('/teams', keep, { confirm: row.team.id }), label: 'Delete' }]} />] };
      })} />
      <Pager page={window.page} pages={window.pages} start={window.start} end={window.end} total={total} href={(page) => withParams('/teams', keep, { page: String(page) })} />
    </div>
    {query.modal === 'team' && query.id && <TeamDrawer teamId={query.id} panel={query.panel || 'information'} closeHref={withParams('/teams', keep, { modal: null, id: null, panel: null })} hrefFor={(panel) => withParams('/teams', keep, { modal: 'team', id: query.id ?? '', panel })} />}
    {confirm && <Modal closeHref={withParams('/teams', keep, { confirm: null })} title="Delete team" subtitle={confirm.team.name}><p className="split-note">A team that is already on a match stays in place. Otherwise its players are removed with it.</p><BoundForm action={deleteTeamAction}><input name="teamId" type="hidden" value={confirm.team.id} /><div className="form-actions"><SubmitButton>Delete team</SubmitButton></div></BoundForm></Modal>}
  </section>;
}
