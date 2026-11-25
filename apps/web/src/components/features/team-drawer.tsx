import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { addPlayerAction, reviewTeamSetupAction, saveTeamSetupAction } from '@/app/actions/teams';
import { db } from '@/db/client';
import { ageGroups, coachNameSubmissions, jerseySubmissions, playerSubmissions, players, sports, stages, teams, tournaments } from '@/db/schema';
import { jerseyColor } from '@/lib/domain/tournament-status';
import { BoundForm, SubmitButton } from '@/components/ui/bound-form';
import { Modal } from '@/components/ui/modal';

export async function TeamDrawer({ teamId, panel, closeHref, hrefFor }: { teamId: string; panel: string; closeHref: string; hrefFor: (panel: string) => string }) {
  const [row] = await db.select({ team: teams, tournament: tournaments, sport: sports, group: ageGroups, stage: stages }).from(teams).innerJoin(tournaments, eq(teams.tournamentId, tournaments.id)).innerJoin(sports, eq(tournaments.sportId, sports.id)).innerJoin(ageGroups, eq(teams.ageGroupId, ageGroups.id)).leftJoin(stages, eq(teams.stageId, stages.id)).where(eq(teams.id, teamId)).limit(1);
  if (!row) return null;
  const [coaches, squad, pendingPlayers, pendingJerseys] = await Promise.all([
    db.select().from(coachNameSubmissions).where(eq(coachNameSubmissions.teamId, teamId)).orderBy(asc(coachNameSubmissions.createdAt)),
    db.select().from(players).where(eq(players.teamId, teamId)).orderBy(asc(players.jerseyNumber)),
    db.select().from(playerSubmissions).where(eq(playerSubmissions.teamId, teamId)),
    db.select().from(jerseySubmissions).where(eq(jerseySubmissions.teamId, teamId)),
  ]);
  const current = panel === 'setup' || panel === 'players' ? panel : 'information';
  const approved = coaches.filter((coach) => coach.status === 'APPROVED');
  const pending = coaches.some((coach) => coach.status === 'PENDING') || pendingPlayers.some((item) => item.status === 'PENDING') || pendingJerseys.some((item) => item.status === 'PENDING');
  const back = hrefFor('players');
  return <Modal closeHref={closeHref} side subtitle={row.tournament.name} title={row.team.name}><nav className="panel-switch"><Link className={current === 'information' ? 'active' : ''} href={hrefFor('information')}>Information</Link><Link className={current === 'setup' ? 'active' : ''} href={hrefFor('setup')}>Setup</Link><Link className={current === 'players' ? 'active' : ''} href={hrefFor('players')}>Players</Link></nav>
    {current === 'information' && <div className="stack-form"><dl className="stack-form"><div><dt>Sport</dt><dd>{row.sport.name}</dd></div><div><dt>Age category</dt><dd>{row.group.name}</dd></div><div><dt>Group</dt><dd>{row.stage?.name ?? 'Not assigned'}</dd></div><div><dt>Home / away jersey</dt><dd>{jerseyColor(row.team.homeJersey) || '—'} / {jerseyColor(row.team.awayJersey) || '—'}</dd></div><div><dt>Approved coaches</dt><dd>{approved.map((coach) => coach.coachName).join(', ') || 'None'}</dd></div>{row.team.crestUrl && <img alt="" className="preview-banner" src={row.team.crestUrl} />}</dl><div className="form-actions"><Link className="dark-button" href={`/teams/${row.team.id}/edit`}>Edit team</Link></div></div>}
    {current === 'setup' && <div className="stack-form"><BoundForm action={saveTeamSetupAction}><input name="teamId" type="hidden" value={row.team.id} /><label>Home jersey<input name="homeJersey" defaultValue={jerseyColor(row.team.homeJersey)} placeholder="#0047AB" /></label><label>Away jersey<input name="awayJersey" defaultValue={jerseyColor(row.team.awayJersey)} placeholder="#FFFFFF" /></label><label>Max squad<input name="maxSquadSize" type="number" min={1} defaultValue={row.group.maxSquadSize} /></label><label>Head coach<input name="coach1" defaultValue={approved[0]?.coachName ?? ''} /></label><label>Assistant coach<input name="coach2" defaultValue={approved[1]?.coachName ?? ''} /></label><div className="form-actions"><SubmitButton>Save setup</SubmitButton></div></BoundForm>{pending && <BoundForm action={reviewTeamSetupAction}><input name="teamId" type="hidden" value={row.team.id} /><input name="panel" type="hidden" value="setup" /><label>Rejection reason<input name="reason" placeholder="Required only when rejecting" /></label><div className="form-actions"><SubmitButton name="decision" value="APPROVED">Approve pending</SubmitButton><SubmitButton name="decision" value="REJECTED" variant="secondary">Reject pending</SubmitButton></div></BoundForm>}</div>}
    {current === 'players' && <div className="stack-form">{squad.map((player) => <div className="member-row" key={player.id}><span>{player.jerseyNumber} · {player.name}</span><span className="split-note">{player.approvalStatus}</span></div>)}{!squad.length && <p className="split-note">No player on this team yet.</p>}<BoundForm action={addPlayerAction}><input name="teamId" type="hidden" value={row.team.id} /><input name="back" type="hidden" value={back} /><label>Player name<input name="name" required /></label><label>Jersey number<input name="jerseyNumber" required type="number" min={1} max={99} /></label><label>Position<input name="position" placeholder="Forward" /></label><label>Photo<input name="photo" type="file" accept="image/png,image/jpeg,image/gif" /></label><div className="form-actions"><SubmitButton>Add player</SubmitButton></div></BoundForm></div>}
  </Modal>;
}
