import Link from 'next/link';
import { and, asc, count, eq, ilike, type SQL } from 'drizzle-orm';
import { addPlayerAction, transferPlayerAction } from '@/app/actions/teams';
import { BoundForm, SubmitButton } from '@/components/ui/bound-form';
import { DataTable, RowMenu, StatusPill } from '@/components/ui/data-table';
import { ListFilters } from '@/components/ui/list-filters';
import { Modal } from '@/components/ui/modal';
import { Pager } from '@/components/ui/pager';
import { db } from '@/db/client';
import { players, teams } from '@/db/schema';
import { pageWindow, withParams } from '@/lib/domain/tournament-status';

const approvalTone: Record<string, string> = { APPROVED: 'success', PENDING: 'warning', REJECTED: 'danger', NOT_STARTED: 'info' };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const clauses = [query.q ? ilike(players.name, `%${query.q}%`) : undefined, query.teamId ? eq(players.teamId, query.teamId) : undefined, query.approval && ['APPROVED', 'PENDING', 'REJECTED', 'NOT_STARTED'].includes(query.approval) ? eq(players.approvalStatus, query.approval as 'APPROVED') : undefined].filter((clause): clause is SQL => Boolean(clause));
  const where = clauses.length ? and(...clauses) : undefined;
  const [totalRow] = await db.select({ value: count() }).from(players).where(where);
  const total = Number(totalRow?.value ?? 0);
  const window = pageWindow(query.page, total);
  const [rows, clubRows] = await Promise.all([
    db.select({ player: players, team: teams }).from(players).innerJoin(teams, eq(players.teamId, teams.id)).where(where).orderBy(asc(players.name)).limit(window.size).offset(window.start),
    db.select().from(teams).orderBy(asc(teams.name)),
  ]);
  const keep = { q: query.q, teamId: query.teamId, approval: query.approval };
  const selected = query.modal === 'player' ? rows.find((row) => row.player.id === query.id) : undefined;
  const close = withParams('/players', keep, { modal: null, id: null });
  return <section>
    <header className="figma-heading"><div><h1>Players</h1><p>Approved players are visible to the mobile app.</p></div><Link className="dark-button" href={withParams('/players', keep, { modal: 'add-player' })}>Add player</Link></header>
    <div className="figma-panel module-panel">
      <ListFilters action="/players" query={query.q} placeholder="Search player" filters={[{ name: 'teamId', label: 'All teams', value: query.teamId, options: clubRows.map((team) => ({ value: team.id, label: team.name })) }, { name: 'approval', label: 'All status', value: query.approval, options: [{ value: 'APPROVED', label: 'Approved' }, { value: 'PENDING', label: 'Pending' }, { value: 'REJECTED', label: 'Rejected' }, { value: 'NOT_STARTED', label: 'Not started' }] }]} />
      <DataTable columns={['Player', 'Team', 'Jersey', 'Position', 'Status', '']} empty="No player matches this filter." rows={rows.map((row) => { const detailHref = withParams('/players', keep, { modal: 'player', id: row.player.id }); return { id: row.player.id, cells: [<Link className="row-link" href={detailHref} key={row.player.id}>{row.player.name}</Link>, row.team.name, row.player.jerseyNumber, row.player.position || '—', <StatusPill key={row.player.id} label={row.player.approvalStatus} tone={approvalTone[row.player.approvalStatus] ?? 'info'} />, <RowMenu items={[{ href: detailHref, label: 'Detail' }]} />] }; })} />
      <Pager page={window.page} pages={window.pages} start={window.start} end={window.end} total={total} href={(page) => withParams('/players', keep, { page: String(page) })} />
    </div>
    {query.modal === 'add-player' && <Modal closeHref={close} title="Add player"><BoundForm action={addPlayerAction}><input name="back" type="hidden" value={close} /><label>Team<select name="teamId" required defaultValue={query.teamId ?? ''}><option value="">Select</option>{clubRows.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label>Name<input name="name" required /></label><label>Jersey number<input name="jerseyNumber" required type="number" min={1} max={99} /></label><label>Position<input name="position" /></label><label>Photo<input name="photo" type="file" accept="image/png,image/jpeg,image/gif" /></label><div className="form-actions"><SubmitButton>Save player</SubmitButton></div></BoundForm></Modal>}
    {selected && <Modal closeHref={close} side title={selected.player.name} subtitle={selected.team.name}>{selected.player.photoUrl && <img alt="" className="preview-banner" src={selected.player.photoUrl} />}<p className="split-note">Jersey {selected.player.jerseyNumber} · {selected.player.position || 'No position'} · {selected.player.approvalStatus}</p><BoundForm action={transferPlayerAction}><input name="playerId" type="hidden" value={selected.player.id} /><input name="back" type="hidden" value={withParams('/players', keep, { modal: 'player', id: selected.player.id })} /><label>Transfer to<select name="teamId" required defaultValue=""><option value="">Select</option>{clubRows.filter((team) => team.id !== selected.player.teamId).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label>Jersey number on the new team<input name="jerseyNumber" type="number" min={1} max={99} defaultValue={selected.player.jerseyNumber} /></label><div className="form-actions"><SubmitButton>Transfer</SubmitButton></div></BoundForm></Modal>}
  </section>;
}
