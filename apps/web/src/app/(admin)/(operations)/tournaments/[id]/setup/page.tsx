import { TournamentSetup } from '@/components/tournament-setup';

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const query = await searchParams;
  return <TournamentSetup tournamentId={id} step={query.step || 'details'} query={query} />;
}
