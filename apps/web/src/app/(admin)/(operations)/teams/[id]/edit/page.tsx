import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq, or } from 'drizzle-orm';
import { updateAdminTeamAction } from '@/app/actions/teams';
import { BoundForm, SubmitButton } from '@/components/ui/bound-form';
import { TeamCreateFields, type TeamTournamentOption } from '@/components/features/team-create-fields';
import { db } from '@/db/client';
import { ageGroups, matches, sports, stages, teams, tournaments } from '@/db/schema';
import { tournamentLabel, withParams } from '@/lib/domain/tournament-status';

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const query = await searchParams;
  const [team] = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
  if (!team) notFound();
  const [tournamentRows, groupRows, stageRows, used] = await Promise.all([
    db.select({ tournament: tournaments, sport: sports }).from(tournaments).innerJoin(sports, eq(tournaments.sportId, sports.id)).orderBy(asc(tournaments.name)),
    db.select().from(ageGroups).orderBy(asc(ageGroups.sortOrder), asc(ageGroups.name)),
    db.select().from(stages).orderBy(asc(stages.sortOrder), asc(stages.name)),
    db.select({ id: matches.id }).from(matches).where(or(eq(matches.homeTeamId, id), eq(matches.awayTeamId, id))).limit(1),
  ]);
  const options: TeamTournamentOption[] = tournamentRows.map(({ tournament, sport }) => ({
    id: tournament.id,
    name: tournament.name,
    status: tournamentLabel(tournament.status, tournament.startsAt, tournament.endsAt).label,
    sport: sport.name,
    setupHref: `/tournaments/${tournament.id}/setup?step=categories`,
    groups: groupRows.filter((group) => group.tournamentId === tournament.id).map((group) => ({
      id: group.id,
      name: group.name,
      stages: stageRows.filter((stage) => stage.ageGroupId === group.id).map((stage) => ({ id: stage.id, name: stage.name })),
    })),
  }));
  const back = withParams('/teams', { q: query.q, tournamentId: query.tournamentId }, {});
  return <section>
    <header className="figma-heading"><div><p className="breadcrumb"><Link href={back}>Teams</Link><span>/</span><strong>Edit</strong></p><h1>Edit team</h1><p>Update the club name, tournament, age category, group, or logo.</p></div></header>
    <div className="wizard-card"><BoundForm action={updateAdminTeamAction}><input name="teamId" type="hidden" value={team.id} /><TeamCreateFields tournaments={options} initialTournamentId={team.tournamentId} initialAgeGroupId={team.ageGroupId} initialStageId={team.stageId ?? ''} initialName={team.name} structureLocked={Boolean(used.length)} />{team.crestUrl && <img alt="" className="preview-banner" src={team.crestUrl} />}<label>Logo<input name="logo" type="file" accept="image/png,image/jpeg,image/gif" /></label><p className="split-note">Leave the file empty to keep the current logo.</p><div className="form-actions"><Link className="secondary-button" href={back}>Cancel</Link><SubmitButton>Save team</SubmitButton></div></BoundForm></div>
  </section>;
}
