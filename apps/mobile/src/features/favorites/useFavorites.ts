import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Team } from '../../domain/models';
import { isDemoMode } from '../../services/api/mode';
import { getFavoriteTeams, setFavorite } from '../../services/api/tournament';

export function useFavorites() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['favorites'], queryFn: getFavoriteTeams });
  const teams = query.data ?? [];
  const mutation = useMutation({
    mutationFn: ({ team, favorite }: { team: Team; favorite: boolean }) => setFavorite(team.id, favorite),
    onMutate: async ({ team, favorite }) => {
      await client.cancelQueries({ queryKey: ['favorites'] });
      const previous = client.getQueryData<Team[]>(['favorites']);
      client.setQueryData<Team[]>(['favorites'], (current = []) => favorite ? (current.some((item) => item.id === team.id) ? current : [...current, team]) : current.filter((item) => item.id !== team.id));
      return { previous };
    },
    onError: (_error, _variables, context) => { if (context?.previous) client.setQueryData(['favorites'], context.previous); },
    onSettled: () => { if (!isDemoMode()) void client.invalidateQueries({ queryKey: ['favorites'] }); },
  });
  return {
    teams,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    mutationError: mutation.error,
    refetch: () => query.refetch(),
    toggle: (team: Team) => mutation.mutateAsync({ team, favorite: !teams.some((item) => item.id === team.id) }).then(() => true, () => false),
    includes: (teamId: string) => teams.some((team) => team.id === teamId),
  };
}
