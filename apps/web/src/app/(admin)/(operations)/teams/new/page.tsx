import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { createFigmaTeamAction } from '@/app/figma-actions';
import { BoundForm, SubmitButton } from '@/components/bound-form';
import { TeamCreateFields, type TeamTournamentOption } from '@/components/team-create-fields';
import { db } from '@/db/client';
import { ageGroups, sports, stages, tournaments } from '@/db/schema';
import { tournamentLabel } from '@/lib/tournament-status';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const [tournamentRows, groupRows, stageRows] = await Promise.all([
    db.select({ tournament: tournaments, sport: sports }).from(tournaments).innerJoin(sports, eq(tournaments.sportId, sports.id)).orderBy(asc(tournaments.name)),
    db.select().from(ageGroups).orderBy(asc(ageGroups.sortOrder), asc(ageGroups.name)),
    db.select().from(stages).orderBy(asc(stages.sortOrder), asc(stages.name)),
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
  return <section>
    <header className="figma-heading"><div><p className="breadcrumb"><Link href="/teams">Teams</Link><span>/</span><strong>New</strong></p><h1>Add new team</h1><p>Draft tournaments are included. Add an age category first, then save the club. A group can be chosen later.</p></div></header>
    <div className="wizard-card">{options.length ? <BoundForm action={createFigmaTeamAction}><TeamCreateFields tournaments={options} initialTournamentId={query.tournamentId} /><label>Logo<input name="logo" type="file" accept="image/png,image/jpeg,image/gif" /></label><div className="form-actions"><Link className="secondary-button" href="/teams">Cancel</Link><SubmitButton>Save team</SubmitButton></div></BoundForm> : <p className="split-note">Create a tournament first. It stays a draft until you publish it, and a team can be added after an age category exists. <Link href="/tournaments/new">New tournament</Link></p>}</div>
  </section>;
}
