import { TournamentBoard } from '@/components/features/tournament-board';

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  return <TournamentBoard tournamentId={id} query={await searchParams} />;
}
