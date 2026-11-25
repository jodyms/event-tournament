import Link from 'next/link';
import { and, count, desc, eq, gte, lt } from 'drizzle-orm';
import { db } from '@/db/client';
import { coachNameSubmissions, matches, players, teams } from '@/db/schema';
import { jerseyColor } from '@/lib/domain/tournament-status';

export async function Dashboard() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const [[teamCount], [playerCount], [todayMatches], [liveCount], teamRows, approvedPlayers, approvedCoaches] = await Promise.all([
    db.select({ value: count() }).from(teams),
    db.select({ value: count() }).from(players).where(eq(players.approvalStatus, 'APPROVED')),
    db.select({ value: count() }).from(matches).where(and(gte(matches.startsAt, start), lt(matches.startsAt, end))),
    db.select({ value: count() }).from(matches).where(eq(matches.status, 'LIVE')),
    db.select().from(teams).orderBy(desc(teams.updatedAt)),
    db.select({ teamId: players.teamId, value: count() }).from(players).where(eq(players.approvalStatus, 'APPROVED')).groupBy(players.teamId),
    db.select({ teamId: coachNameSubmissions.teamId, value: count() }).from(coachNameSubmissions).where(eq(coachNameSubmissions.status, 'APPROVED')).groupBy(coachNameSubmissions.teamId),
  ]);
  const playerMap = new Map(approvedPlayers.map((row) => [row.teamId, Number(row.value)]));
  const coachMap = new Map(approvedCoaches.map((row) => [row.teamId, Number(row.value)]));
  const incomplete = teamRows.flatMap((team) => {
    const squad = playerMap.get(team.id) ?? 0;
    const coaches = coachMap.get(team.id) ?? 0;
    const jersey = Boolean(jerseyColor(team.homeJersey) && jerseyColor(team.awayJersey));
    if (squad > 0 && coaches > 0 && jersey) return [];
    return [{ team, label: squad === 0 ? 'Player Unregist' : 'Setup incomplete' }];
  }).slice(0, 6);
  return <section className="figma-dashboard"><div className="dashboard-actions"><Link className="dark-button" href="/reports">Export Data <span>⌄</span></Link></div><section className="figma-metrics"><Metric value={Number(teamCount?.value ?? 0)} label="Total Team" icon="♢" /><Metric value={Number(playerCount?.value ?? 0)} label="Total Player" icon="♧" /><Metric value={Number(todayMatches?.value ?? 0)} label="Matches today" icon="♕" /><Metric value={Number(liveCount?.value ?? 0)} label="Live Matches" icon="▣" /></section><article className="figma-panel incomplete-panel"><div className="panel-title figma-panel-title"><h2>Incomplete Club Configuration</h2></div><div className="table-wrap"><table className="figma-table"><thead><tr><th>No</th><th>Club Name <span className="sort-mark">↕</span></th><th>Setup Status</th><th aria-label="Open detail" /></tr></thead><tbody>{incomplete.map((row, index) => <tr key={row.team.id}><td>{index + 1}</td><td>{row.team.name}</td><td><span className="status danger">{row.label}</span></td><td><Link aria-label={`View ${row.team.name}`} className="row-link" href={`/teams?modal=team&id=${row.team.id}&panel=setup`}>↗</Link></td></tr>)}{!incomplete.length && <tr><td colSpan={4} className="empty-cell">Every club has a jersey, a coach, and an approved player.</td></tr>}</tbody></table></div></article></section>;
}

function Metric({ value, label, icon }: { value: number; label: string; icon: string }) { return <article className="figma-metric"><p><span>{icon}</span>{label}</p><strong>{value}</strong></article>; }
