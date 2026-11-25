import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader, EmptyState, MatchCard, Screen, SegmentedTabs, TeamRow } from '../../components';
import { colors, fonts, radius, spacing } from '../../design-system/theme';
import type { Match, StandingRow } from '../../domain/models';
import type { RootStackParamList } from '../../navigation/types';
import { getStageMatches, getStages, getStandings } from '../../services/api/tournament';

export function GroupScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Group'>>();
  const [tab, setTab] = useState<'Table' | 'Matches'>('Table');
  const group = route.params?.group ?? 'Group';
  const stageId = route.params?.stageId ?? 'demo-stage';
  const ageGroupId = route.params?.ageGroupId;
  const standingsQuery = useQuery({ queryKey: ['stage', stageId, 'standings'], queryFn: () => getStandings(stageId) });
  const matchesQuery = useQuery({ queryKey: ['stage', stageId, 'matches'], queryFn: () => getStageMatches(stageId) });
  const stagesQuery = useQuery({ queryKey: ['stages', ageGroupId], queryFn: () => getStages(ageGroupId!), enabled: Boolean(ageGroupId) });
  const siblings = (stagesQuery.data ?? []).filter((stage) => stage.id !== stageId);
  return (
    <Screen>
      <AppHeader title={group.toUpperCase()} onBack={() => navigation.goBack()} />
      <SegmentedTabs options={['Table', 'Matches'] as const} value={tab} onChange={setTab} />
      {tab === 'Table' ? <Standings rows={standingsQuery.data ?? []} onTeam={(teamId) => navigation.navigate('TeamDetail', { teamId })} /> : <Fixtures matches={matchesQuery.data ?? []} onMatch={(matchId) => navigation.navigate('MatchDetail', { matchId })} />}
      {siblings.length ? <Text style={styles.moreTitle}>Grup lain</Text> : null}
      {siblings.map((stage) => <TeamRow key={stage.id} team={{ id: stage.id, name: stage.name, shortName: stage.name, age: '', group: '', accent: '#3EBF5F', initials: stage.name.slice(0, 2).toUpperCase() }} onPress={() => navigation.setParams({ group: stage.name, stageId: stage.id, ageGroupId })} />)}
    </Screen>
  );
}

function Standings({ rows, onTeam }: { rows: StandingRow[]; onTeam: (teamId: string) => void }) {
  if (!rows.length) return <EmptyState title="Klasemen kosong" message="Klasemen muncul setelah pertandingan pada grup ini dipublikasikan." />;
  return <View><View style={styles.tableHead}><Text style={[styles.column, styles.teamColumn]}>TEAM</Text><Text style={styles.column}>P</Text><Text style={styles.column}>GD</Text><Text style={styles.column}>PTS</Text></View>{rows.map((row) => <View key={row.teamId} style={styles.row}><Text style={styles.rank}>{row.position}</Text><View style={styles.teamCell}><TeamRow team={row.team} onPress={() => onTeam(row.team.id)} trailing={null} /></View><Text style={styles.value}>{row.played}</Text><Text style={[styles.value, row.goalDifference < 0 && styles.negative]}>{row.goalDifference}</Text><Text style={styles.points}>{row.points}</Text></View>)}<Text style={styles.hint}>Urutan resmi berasal dari server turnamen.</Text></View>;
}

function Fixtures({ matches: fixtureMatches, onMatch }: { matches: Match[]; onMatch: (matchId: string) => void }) {
  if (!fixtureMatches.length) return <EmptyState title="Belum ada jadwal" message="Pertandingan grup ini akan tampil setelah dipublikasikan." />;
  return <View style={styles.fixtureList}>{fixtureMatches.map((match) => <MatchCard key={match.id} match={match} onPress={() => onMatch(match.id)} />)}</View>;
}

const styles = StyleSheet.create({
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  column: { width: 42, color: colors.muted, fontFamily: fonts.bold, fontSize: 10, textAlign: 'center' },
  teamColumn: { flex: 1, textAlign: 'left' },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 0, marginTop: spacing.sm, paddingHorizontal: spacing.xs, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  rank: { width: 22, color: colors.subtle, fontFamily: fonts.medium, fontSize: 11 },
  teamCell: { flex: 1 },
  value: { width: 42, color: colors.text, fontFamily: fonts.semibold, fontSize: 13, textAlign: 'center' },
  negative: { color: '#FF6B70' },
  points: { width: 42, color: colors.text, fontFamily: fonts.bold, fontSize: 15, textAlign: 'center' },
  hint: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, textAlign: 'center', marginTop: spacing.sm },
  fixtureList: { gap: spacing.sm },
  moreTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 15, marginTop: spacing.xxl, marginBottom: spacing.sm },
});
