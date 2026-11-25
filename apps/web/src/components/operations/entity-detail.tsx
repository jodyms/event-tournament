import Link from 'next/link';
import { eq, inArray } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { ageGroups, matches, media, news, players, stages, teams, tournamentRules, tournaments, venues } from '@/db/schema';
import { requirePermission } from '@/lib/auth/session';

const permissions: Record<string, string> = { tournaments: 'tournament.read', teams: 'team.read', players: 'player.review', matches: 'match.schedule', 'age-groups': 'tournament.write', stages: 'tournament.write', venues: 'tournament.write', news: 'content.publish', highlights: 'content.publish', rules: 'content.publish' };

export async function EntityDetail({ section, id }: { section: string; id: string }) {
  await requirePermission(permissions[section] ?? 'tournament.read');
  if (section === 'tournaments') return <TournamentDetail id={id} />;
  const row = await findRow(section, id);
  if (!row) notFound();
  return <section><div className="page-heading figma-heading"><div><h1>{label(section)}</h1><p>Review the current operational values for this record.</p></div><Link className="secondary-button" href={`/${section}`}>Back to {label(section)}</Link></div><article className="figma-panel detail-panel"><dl>{Object.entries(row).map(([key, value]) => <div key={key}><dt>{humanize(key)}</dt><dd>{format(value)}</dd></div>)}</dl></article></section>;
}

async function TournamentDetail({ id }: { id: string }) {
  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
  if (!tournament) notFound();
  const categories = await db.select().from(ageGroups).where(eq(ageGroups.tournamentId, id));
  const categoryIds = categories.map((category) => category.id);
  const [stageRows, teamRows, matchRows] = categoryIds.length ? await Promise.all([
    db.select().from(stages).where(inArray(stages.ageGroupId, categoryIds)),
    db.select().from(teams).where(eq(teams.tournamentId, id)),
    db.select().from(matches).where(eq(matches.tournamentId, id)),
  ]) : [[], [], []];
  const status = tournament.status === 'PUBLISHED' && tournament.startsAt <= new Date() && tournament.endsAt >= new Date() ? 'On Going' : tournament.status === 'PUBLISHED' ? 'Published' : 'Draft';
  const ageName = new Map(categories.map((category) => [category.id, category.name]));
  const stageTeams = new Map<string, number>();
  teamRows.forEach((team) => { if (team.stageId) stageTeams.set(team.stageId, (stageTeams.get(team.stageId) ?? 0) + 1); });
  return <section className="tournament-detail"><div className="breadcrumb"><Link href="/tournaments">TOURNAMENTS</Link><span>›</span><strong>DETAIL {tournament.name.toUpperCase()}</strong></div><div className="tournament-title"><div><h1>{tournament.name}</h1><span className={`status ${status === 'On Going' ? 'info' : status === 'Draft' ? 'warning' : 'success'}`}>{status}</span></div></div><nav className="tournament-tabs" aria-label="Tournament operations"><a className="active" href="#groups">Group Stage</a><Link href="/teams">Manage Team</Link><Link href="/matches">Manage Match</Link><Link href="/highlights">Manage Highlights</Link><Link href="/rules">Certificate</Link></nav><div className="tournament-detail-grid"><article className="figma-panel tournament-groups" id="groups"><div className="figma-panel-title"><div><h2>Group Stage</h2><p>Establish the groups for your tournament.</p></div><Link className="subtle-link" href="/stages">Manage groups</Link></div><div className="table-wrap"><table className="figma-table"><thead><tr><th>Group Name</th><th>Age Category</th><th>Stage Type</th><th>Team Participants</th><th /></tr></thead><tbody>{stageRows.map((stage) => <tr key={stage.id}><td>{stage.name}</td><td>{ageName.get(stage.ageGroupId) ?? '—'}</td><td>{stage.type === 'KNOCKOUT' ? 'Playoff Stage' : 'Group Stage'}</td><td>{stageTeams.get(stage.id) ?? 0} Teams</td><td><Link className="row-link" href="/stages">↗</Link></td></tr>)}{!stageRows.length && <tr><td className="empty-cell" colSpan={5}>No stages have been added to this tournament.</td></tr>}</tbody></table></div></article><aside className="figma-panel tournament-summary"><dl><div><dt>Tournament Name</dt><dd>{tournament.name}</dd></div><div><dt>Status</dt><dd><span className={`status ${status === 'On Going' ? 'info' : status === 'Draft' ? 'warning' : 'success'}`}>{status}</span></dd></div><div><dt>Start Date</dt><dd>{tournament.startsAt.toLocaleDateString()}</dd></div><div><dt>End Date</dt><dd>{tournament.endsAt.toLocaleDateString()}</dd></div><div><dt>Participants</dt><dd>{teamRows.length} Teams · {matchRows.length} Matches</dd></div><div><dt>Banner / Logo</dt><dd><div className="tournament-banner">{tournament.bannerUrl ? <img alt={`${tournament.name} banner`} src={tournament.bannerUrl} /> : <><span>TYC</span><strong>{tournament.name}</strong></>}</div></dd></div></dl></aside></div></section>;
}

async function findRow(section: string, id: string): Promise<Record<string, unknown> | undefined> {
  const table = { tournaments, teams, players, matches, 'age-groups': ageGroups, stages, venues, news, highlights: media, rules: tournamentRules }[section];
  if (!table) return undefined;
  const rows = await db.select().from(table).where(eq(table.id, id)).limit(1);
  return rows[0] as Record<string, unknown> | undefined;
}
function label(section: string) { return section.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function humanize(key: string) { return key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()); }
function format(value: unknown) { if (value === null || value === undefined || value === '') return '—'; if (value instanceof Date) return value.toLocaleString(); return typeof value === 'object' ? JSON.stringify(value) : String(value); }
