import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, MatchCard, PrimaryButton, Screen, SectionHeader } from '../../components/ui';
import { colors, fonts, spacing } from '../../design-system/theme';
import type { RootStackParamList } from '../../navigation/types';
import { getSchedule } from '../../services/api/tournament';

export function ScheduleScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [filter, setFilter] = useState<'Today' | 'Upcoming' | 'Results'>('Today');
  const scheduleQuery = useQuery({ queryKey: ['schedule'], queryFn: getSchedule });
  const filteredMatches = useMemo(() => (scheduleQuery.data ?? []).filter((match) => filter === 'Today' ? match.status === 'LIVE' : filter === 'Upcoming' ? match.status === 'UPCOMING' : match.status === 'COMPLETED'), [filter, scheduleQuery.data]);
  return <Screen><AppHeader title="Schedule" /><Text style={styles.copy}>Official fixtures and results. Pull down to refresh after a reschedule.</Text><PrimaryButton label="Browse competition" icon="trophy-outline" onPress={() => navigation.navigate('Competition')} /><View style={styles.filters}>{(['Today', 'Upcoming', 'Results'] as const).map((option) => <Pressable key={option} onPress={() => setFilter(option)} style={[styles.filter, filter === option && styles.filterActive]}><Text style={[styles.filterText, filter === option && styles.filterTextActive]}>{option}</Text></Pressable>)}</View><SectionHeader title={filter.toUpperCase()} /> <View style={styles.list}>{filteredMatches.map((match) => <MatchCard key={match.id} match={match} onPress={() => navigation.navigate('MatchDetail', { matchId: match.id })} />)}</View></Screen>;
}
const styles = StyleSheet.create({ copy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, marginTop: spacing.xs, marginBottom: spacing.xl }, filters: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.lg }, filter: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 99, backgroundColor: colors.surfaceRaised }, filterActive: { backgroundColor: colors.brand }, filterText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 12 }, filterTextActive: { color: colors.canvas }, list: { gap: spacing.sm } });
