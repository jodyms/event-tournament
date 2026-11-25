import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { saveHighlightAction, saveTournamentCertificateAction } from '@/app/actions/content';
import { createTournamentMatchAction, overrideTournamentStandingAction, saveMatchScoreAction } from '@/app/actions/matches';
import { updateTournamentStatusAction } from '@/app/actions/tournaments';
import { db } from '@/db/client';
import { ageGroups, certificateTemplates, matchEvents, matches, media, pitches, players, sports, stages, standings, teams, tournamentCertificates, tournaments, venues } from '@/db/schema';
import { jerseyColor, matchLabel, shortDate, tournamentLabel, withParams } from '@/lib/domain/tournament-status';
import { BoundForm, SubmitButton } from '@/components/ui/bound-form';
import { CertificatePreview } from '@/components/features/certificate-preview';
import { DataTable, RowMenu, StatusPill } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';
import { RowEditor } from '@/components/ui/row-editor';

const tabs = [['groups', 'Group Stage'], ['teams', 'All Team'], ['matches', 'Match'], ['highlights', 'Match Highlight'], ['certificates', 'Certificate']] as const;

export async function TournamentBoard({ tournamentId, query }: { tournamentId: string; query: Record<string, string | undefined> }) {
  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
  if (!tournament) notFound();
  const tab = tabs.some(([id]) => id === query.tab) ? query.tab! : 'groups';
  const path = `/tournaments/${tournament.id}`;
  const status = tournamentLabel(tournament.status, tournament.startsAt, tournament.endsAt);
  const close = withParams(path, query, { modal: null, team: null, match: null, certificate: null });
  return <section>
    <p className="breadcrumb"><Link href="/tournaments">Tournaments</Link><span>/</span><strong>{tournament.name}</strong></p>
    <header className="tournament-title"><div><h1>{tournament.name}</h1><StatusPill label={status.label} tone={status.tone} /></div><BoundForm action={updateTournamentStatusAction} className="status-form"><input name="id" type="hidden" value={tournament.id} /><input name="tab" type="hidden" value={tab} /><label>Status<select name="status" defaultValue={tournament.status}><option value="DRAFT">Draft</option><option value="PUBLISHED">On Going</option><option value="ARCHIVED">Finished</option><option value="CANCELLED">Canceled</option></select></label><SubmitButton>Update status</SubmitButton></BoundForm></header>
    <p className="split-note">On Going follows the start and end dates, so the list can show Scheduled or Finished. Finished stays closed. Draft and Canceled stay as chosen.</p>
    <nav className="tournament-tabs">{tabs.map(([id, label]) => <Link className={tab === id ? 'active' : ''} href={`${path}?tab=${id}`} key={id}>{label}</Link>)}</nav>
    {tab === 'groups' && <Groups tournament={tournament} query={query} path={path} />}
    {tab === 'teams' && <ClubList tournamentId={tournament.id} />}
    {tab === 'matches' && <MatchList tournamentId={tournament.id} query={query} path={path} />}
    {tab === 'highlights' && <HighlightList tournamentId={tournament.id} query={query} path={path} />}
    {tab === 'certificates' && <CertificateList tournamentId={tournament.id} query={query} path={path} />}
    {query.modal && <BoardModal tournament={tournament} query={query} close={close} />}
  </section>;
}

async function Groups({ tournament, query, path }: { tournament: typeof tournaments.$inferSelect; query: Record<string, string | undefined>; path: string }) {
  const [sport] = await db.select().from(sports).where(eq(sports.id, tournament.sportId)).limit(1);
  const stageRows = await db.select({ stage: stages, group: ageGroups }).from(stages).innerJoin(ageGroups, eq(stages.ageGroupId, ageGroups.id)).where(eq(ageGroups.tournamentId, tournament.id)).orderBy(asc(stages.sortOrder));
  const selected = query.stage && stageRows.some((row) => row.stage.id === query.stage) ? query.stage : stageRows[0]?.stage.id;
  const table = selected ? await db.select({ standing: standings, team: teams }).from(standings).innerJoin(teams, eq(standings.teamId, teams.id)).where(eq(standings.stageId, selected)).orderBy(asc(standings.position)) : [];
  const members = selected ? await db.select().from(teams).where(eq(teams.stageId, selected)).orderBy(asc(teams.name)) : [];
  const stored = new Map(table.map((row) => [row.team.id, row.standing]));
  const source = members.length ? members : table.map((row) => row.team);
  const rows = source.map((team, index) => ({ team, standing: stored.get(team.id), position: stored.get(team.id)?.position ?? index + 1 }));
  return <div className="tournament-detail-grid"><article className="figma-panel tournament-groups"><div className="figma-panel-title"><div><h2>Group standing</h2><p>{stageRows.find((row) => row.stage.id === selected)?.stage.name ?? 'Add a stage in setup'}</p></div><div>{stageRows.map((row) => <Link key={row.stage.id} href={withParams(path, query, { stage: row.stage.id, modal: null })}>{row.stage.name}</Link>)}{selected && <Link href={withParams(path, query, { modal: 'group-matches', stage: selected })}>Matches</Link>}</div></div><DataTable columns={['Pos', 'Team', 'Match', 'Win', 'Lose', 'GD', 'PTS', '']} empty="Add teams to this group from the tournament setup." rows={rows.map((row) => ({ id: row.team.id, cells: [row.position, row.team.name, row.standing?.played ?? 0, row.standing?.wins ?? 0, row.standing?.losses ?? 0, row.standing?.goalDifference ?? 0, row.standing?.points ?? 0, row.standing ? <RowMenu items={[{ href: withParams(path, query, { modal: 'standings', stage: selected ?? '', team: row.team.id }), label: 'Edit standing' }]} /> : '—'] }))} /></article><aside className="figma-panel tournament-summary"><div className={tournament.bannerUrl ? '' : 'tournament-banner'}>{tournament.bannerUrl ? <img className="preview-banner" alt="" src={tournament.bannerUrl} /> : <strong>{tournament.name}</strong>}</div><dl><div><dt>Sport</dt><dd>{sport?.name ?? 'Football'}</dd></div><div><dt>Dates</dt><dd>{shortDate(tournament.startsAt)} – {shortDate(tournament.endsAt)}</dd></div><div><dt>Description</dt><dd>{tournament.description || 'No description yet.'}</dd></div></dl><Link href={`/tournaments/${tournament.id}/setup?step=details`}>Edit setup</Link></aside></div>;
}

async function ClubList({ tournamentId }: { tournamentId: string }) {
  const rows = await db.select({ team: teams, group: ageGroups, stage: stages }).from(teams).innerJoin(ageGroups, eq(teams.ageGroupId, ageGroups.id)).leftJoin(stages, eq(teams.stageId, stages.id)).where(eq(teams.tournamentId, tournamentId)).orderBy(asc(teams.name));
  const counts = new Map<string, number>();
  if (rows.length) {
    const squad = await db.select({ teamId: players.teamId }).from(players).where(and(eq(players.approvalStatus, 'APPROVED'), inArray(players.teamId, rows.map((row) => row.team.id))));
    for (const player of squad) counts.set(player.teamId, (counts.get(player.teamId) ?? 0) + 1);
  }
  return <div className="stack-form"><div className="form-actions"><Link className="dark-button" href={`/teams/new?tournamentId=${tournamentId}`}>Add team</Link></div><DataTable columns={['Club', 'Age', 'Group', 'Jersey', 'Players', '']} empty="No team has been added to this tournament. A draft tournament can still receive one." rows={rows.map((row) => ({ id: row.team.id, cells: [row.team.name, row.group.name, row.stage?.name ?? '—', jerseyColor(row.team.homeJersey) || '—', counts.get(row.team.id) ?? 0, <RowMenu items={[{ href: `/teams?modal=team&id=${row.team.id}&panel=information`, label: 'Team detail' }, { href: `/teams?modal=team&id=${row.team.id}&panel=players`, label: 'Players' }]} />] }))} /></div>;
}

async function MatchList({ tournamentId, query, path }: { tournamentId: string; query: Record<string, string | undefined>; path: string }) {
  const allowed = ['SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED'] as const;
  const status = allowed.find((item) => item === query.status);
  const fixtureRows = await db.select().from(matches).where(status ? and(eq(matches.tournamentId, tournamentId), eq(matches.status, status)) : eq(matches.tournamentId, tournamentId)).orderBy(desc(matches.startsAt));
  const clubRows = await db.select().from(teams).where(eq(teams.tournamentId, tournamentId));
  const names = new Map(clubRows.map((team) => [team.id, team.name]));
  const stageRows = await db.select({ stage: stages, group: ageGroups }).from(stages).innerJoin(ageGroups, eq(stages.ageGroupId, ageGroups.id)).where(eq(ageGroups.tournamentId, tournamentId));
  const stageNames = new Map(stageRows.map((row) => [row.stage.id, row.stage.name]));
  return <div className="stack-form"><div className="form-actions"><Link className="dark-button" href={withParams(path, query, { modal: 'create-match' })}>Create match</Link></div><DataTable columns={['Date', 'Group', 'Home', 'Score', 'Away', 'Status', '']} empty="No match has been scheduled." rows={fixtureRows.map((match) => { const label = matchLabel(match.status); return { id: match.id, cells: [shortDate(match.startsAt), stageNames.get(match.stageId) ?? '—', names.get(match.homeTeamId) ?? 'Home', `${match.homeScore} - ${match.awayScore}`, names.get(match.awayTeamId) ?? 'Away', <StatusPill label={label.label} tone={label.tone} />, <RowMenu items={[{ href: withParams(path, query, { modal: 'score', match: match.id }), label: 'Score' }]} />] }; })} /></div>;
}

async function HighlightList({ tournamentId, query, path }: { tournamentId: string; query: Record<string, string | undefined>; path: string }) {
  const rows = await db.select().from(media).where(and(eq(media.tournamentId, tournamentId), eq(media.type, 'HIGHLIGHT'))).orderBy(desc(media.createdAt));
  return <div className="stack-form"><div className="form-actions"><Link className="dark-button" href={withParams(path, query, { modal: 'highlight' })}>Add highlight</Link></div><DataTable columns={['Title', 'Link', 'Status']} empty="No highlight yet." rows={rows.map((row) => ({ id: row.id, cells: [row.title, <a href={row.externalUrl || row.path} key={row.id}>{row.externalUrl || row.path}</a>, row.status] }))} /></div>;
}

async function CertificateList({ tournamentId, query, path }: { tournamentId: string; query: Record<string, string | undefined>; path: string }) {
  const rows = await db.select({ certificate: tournamentCertificates, template: certificateTemplates, team: teams }).from(tournamentCertificates).innerJoin(certificateTemplates, eq(tournamentCertificates.templateId, certificateTemplates.id)).leftJoin(teams, eq(tournamentCertificates.teamId, teams.id)).where(eq(tournamentCertificates.tournamentId, tournamentId)).orderBy(desc(tournamentCertificates.createdAt));
  return <div className="stack-form"><div className="form-actions"><Link className="dark-button" href={withParams(path, query, { modal: 'certificate', certificate: null })}>Create certificate</Link></div><DataTable columns={['Title', 'Kind', 'Team', 'Template', 'Active', '']} empty="No certificate has been issued for this tournament." rows={rows.map((row) => { const previewHref = withParams(path, query, { modal: 'certificate-preview', certificate: row.certificate.id }); return { id: row.certificate.id, cells: [<Link className="row-link" href={previewHref} key={row.certificate.id}>{row.certificate.title}</Link>, row.certificate.kind === 'CHAMPION' ? 'Champion' : 'Participant', row.team?.name ?? 'All teams', row.template.name, row.certificate.active ? 'Active' : 'Inactive', <RowMenu items={[{ href: previewHref, label: 'Preview' }]} />] }; })} /></div>;
}

async function BoardModal({ tournament, query, close }: { tournament: typeof tournaments.$inferSelect; query: Record<string, string | undefined>; close: string }) {
  if (query.modal === 'standings' && query.stage && query.team) {
    const [row] = await db.select({ standing: standings, team: teams }).from(standings).innerJoin(teams, eq(standings.teamId, teams.id)).where(and(eq(standings.stageId, query.stage), eq(standings.teamId, query.team))).limit(1);
    if (!row) return null;
    return <Modal closeHref={close} title="Edit standing" subtitle={row.team.name}><BoundForm action={overrideTournamentStandingAction}><input name="tournamentId" type="hidden" value={tournament.id} /><input name="stageId" type="hidden" value={query.stage} /><input name="teamId" type="hidden" value={query.team} /><p className="split-note">Match {row.standing.played} · Win {row.standing.wins} · Lose {row.standing.losses} · GD {row.standing.goalDifference} · PTS {row.standing.points}</p><label>Position<input name="position" type="number" min={1} required defaultValue={row.standing.position} /></label><label>Reason<textarea name="reason" required defaultValue={row.standing.manualRankReason ?? ''} /></label><div className="form-actions"><SubmitButton>Save standing</SubmitButton></div></BoundForm></Modal>;
  }
  if (query.modal === 'group-matches' && query.stage) {
    const fixtureRows = await db.select().from(matches).where(eq(matches.stageId, query.stage)).orderBy(asc(matches.startsAt));
    const clubRows = await db.select().from(teams).where(eq(teams.stageId, query.stage));
    const names = new Map(clubRows.map((team) => [team.id, team.name]));
    return <Modal closeHref={close} title="Group matches"><DataTable columns={['Date', 'Match', 'Score', 'Status']} empty="No match in this group." rows={fixtureRows.map((match) => ({ id: match.id, cells: [shortDate(match.startsAt), `${names.get(match.homeTeamId) ?? 'Home'} vs ${names.get(match.awayTeamId) ?? 'Away'}`, `${match.homeScore} - ${match.awayScore}`, matchLabel(match.status).label] }))} /></Modal>;
  }
  if (query.modal === 'create-match') {
    const [stageRows, clubRows, pitchRows] = await Promise.all([
      db.select({ stage: stages, group: ageGroups }).from(stages).innerJoin(ageGroups, eq(stages.ageGroupId, ageGroups.id)).where(eq(ageGroups.tournamentId, tournament.id)).orderBy(asc(stages.name)),
      db.select().from(teams).where(eq(teams.tournamentId, tournament.id)).orderBy(asc(teams.name)),
      db.select({ pitch: pitches, venue: venues }).from(pitches).innerJoin(venues, eq(pitches.venueId, venues.id)).where(eq(venues.tournamentId, tournament.id)),
    ]);
    return <Modal closeHref={close} title="Create match"><BoundForm action={createTournamentMatchAction}><input name="tournamentId" type="hidden" value={tournament.id} /><label>Group<select name="stageId" required defaultValue=""><option value="">Select</option>{stageRows.map((row) => <option key={row.stage.id} value={row.stage.id}>{row.group.name} · {row.stage.name}</option>)}</select></label><label>Home<select name="homeTeamId" required defaultValue=""><option value="">Select</option>{clubRows.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label>Away<select name="awayTeamId" required defaultValue=""><option value="">Select</option>{clubRows.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label>Pitch<select name="pitchId" defaultValue=""><option value="">No pitch</option>{pitchRows.map((row) => <option key={row.pitch.id} value={row.pitch.id}>{row.venue.name}</option>)}</select></label><label>Kickoff<input name="startsAt" required type="datetime-local" /></label><label>Duration (minutes)<input name="duration" type="number" defaultValue="60" /></label><label>Buffer (minutes)<input name="buffer" type="number" defaultValue="10" /></label><label>Status<select name="status" defaultValue="SCHEDULED"><option value="SCHEDULED">Schedule</option><option value="LIVE">Live</option><option value="POSTPONED">Postponed</option><option value="CANCELLED">Canceled</option></select></label><div className="form-actions"><SubmitButton>Save match</SubmitButton></div></BoundForm></Modal>;
  }
  if (query.modal === 'score' && query.match) {
    const [match] = await db.select().from(matches).where(and(eq(matches.id, query.match), eq(matches.tournamentId, tournament.id))).limit(1);
    if (!match) return null;
    const [clubRows, squad, events] = await Promise.all([
      db.select().from(teams).where(inArray(teams.id, [match.homeTeamId, match.awayTeamId])),
      db.select().from(players).where(inArray(players.teamId, [match.homeTeamId, match.awayTeamId])).orderBy(asc(players.jerseyNumber)),
      db.select().from(matchEvents).where(and(eq(matchEvents.matchId, match.id), eq(matchEvents.eventType, 'GOAL'))).orderBy(asc(matchEvents.sortOrder)),
    ]);
    const teamOptions = clubRows.map((team) => ({ value: team.id, label: team.name }));
    const playerOptions = squad.map((player) => ({ value: player.id, label: `${player.jerseyNumber} ${player.name}` }));
    return <Modal closeHref={close} title="Score match" subtitle={`${match.homeScore} - ${match.awayScore}`}><BoundForm action={saveMatchScoreAction}><input name="tournamentId" type="hidden" value={tournament.id} /><input name="matchId" type="hidden" value={match.id} /><RowEditor addLabel="Add goal" fields={[{ name: 'goalTeamId', label: 'Team', options: teamOptions }, { name: 'goalPlayerId', label: 'Player', options: playerOptions }, { name: 'goalMinute', label: 'Minute', placeholder: '12 or 00:12' }]} initial={events.map((event) => ({ goalTeamId: event.teamId ?? '', goalPlayerId: event.playerId ?? '', goalMinute: String(event.minute) }))} /><label className="check-row"><input name="finished" type="checkbox" /> Mark match finished</label><div className="form-actions"><SubmitButton>Save score</SubmitButton></div></BoundForm></Modal>;
  }
  if (query.modal === 'highlight') {
    const [fixtureRows, squad] = await Promise.all([
      db.select().from(matches).where(eq(matches.tournamentId, tournament.id)).orderBy(desc(matches.startsAt)),
      db.select({ player: players, team: teams }).from(players).innerJoin(teams, eq(players.teamId, teams.id)).where(eq(teams.tournamentId, tournament.id)).orderBy(asc(players.name)),
    ]);
    return <Modal closeHref={close} title="Add highlight"><BoundForm action={saveHighlightAction}><input name="tournamentId" type="hidden" value={tournament.id} /><label>Title<input name="title" required /></label><label>Match<select name="matchId" required defaultValue=""><option value="">Select</option>{fixtureRows.map((match) => <option key={match.id} value={match.id}>{shortDate(match.startsAt)} · {match.homeScore}-{match.awayScore}</option>)}</select></label><label>Player<select name="playerId" defaultValue=""><option value="">No featured player</option>{squad.map((row) => <option key={row.player.id} value={row.player.id}>{row.team.name} · {row.player.name}</option>)}</select></label><label>Video URL<input name="url" required type="url" placeholder="https://" /></label><div className="form-actions"><SubmitButton>Publish highlight</SubmitButton></div></BoundForm></Modal>;
  }
  if (query.modal === 'certificate-preview' && query.certificate && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query.certificate)) {
    const [row] = await db.select({ certificate: tournamentCertificates, template: certificateTemplates, team: teams }).from(tournamentCertificates).innerJoin(certificateTemplates, eq(tournamentCertificates.templateId, certificateTemplates.id)).leftJoin(teams, eq(tournamentCertificates.teamId, teams.id)).where(and(eq(tournamentCertificates.id, query.certificate), eq(tournamentCertificates.tournamentId, tournament.id))).limit(1);
    if (!row) return null;
    return <Modal closeHref={close} title="Certificate preview" subtitle={row.certificate.title}><CertificatePreview title={row.certificate.title} kind={row.certificate.kind === 'CHAMPION' ? 'Champion' : 'Participant'} recipientName={row.team?.name ?? 'Sample Player'} tournamentName={tournament.name} teamName={row.team?.name ?? 'All teams'} date={shortDate(tournament.endsAt)} verificationCode="PREVIEW" logoPath={row.template.logoPath} layoutPath={row.template.layoutPath} /><p className="split-note">Sample text uses this tournament, team, and template. A generated file replaces the recipient and verification code.</p></Modal>;
  }
  if (query.modal === 'certificate') {
    const [templates, clubRows] = await Promise.all([
      db.select().from(certificateTemplates).orderBy(asc(certificateTemplates.name)),
      db.select().from(teams).where(eq(teams.tournamentId, tournament.id)).orderBy(asc(teams.name)),
    ]);
    return <Modal closeHref={close} title="Create certificate">{templates.length ? <BoundForm action={saveTournamentCertificateAction}><input name="tournamentId" type="hidden" value={tournament.id} /><label>Title<input name="title" required /></label><label>Template<select name="templateId" required defaultValue=""><option value="">Select</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label><label>Kind<select name="kind" defaultValue="PARTICIPANT"><option value="PARTICIPANT">Participant</option><option value="CHAMPION">Champion</option></select></label><label>Team<select name="teamId" defaultValue=""><option value="">All teams</option>{clubRows.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label className="check-row"><input name="active" type="checkbox" defaultChecked /> Active</label><div className="form-actions"><SubmitButton>Save certificate</SubmitButton></div></BoundForm> : <p className="split-note">Create a template first. <Link href="/certificate-templates?modal=template">Open Template Certificate</Link></p>}</Modal>;
  }
  return null;
}
