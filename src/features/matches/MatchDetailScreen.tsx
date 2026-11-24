import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Badge, PrimaryButton, Screen, TeamCrest } from '../../components/ui';
import { matchById, teamById } from '../../data/mockData';
import { colors, fonts, radius, spacing } from '../../design-system/theme';
import type { RootStackParamList } from '../../navigation/types';
import { getMatch } from '../../services/api/tournament';

export function MatchDetailScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'MatchDetail'>>();
  const matchQuery = useQuery({ queryKey: ['match', route.params.matchId], queryFn: () => getMatch(route.params.matchId), refetchInterval: (query) => query.state.data?.status === 'LIVE' ? 20_000 : false, refetchOnWindowFocus: true });
  const match = matchQuery.data ?? matchById(route.params.matchId);
  const home = teamById(match.homeTeamId);
  const away = teamById(match.awayTeamId);
  const date = new Date(match.startsAt);
  const statusLabel = match.status === 'LIVE' ? 'LIVE NOW' : match.status === 'COMPLETED' ? 'FULL TIME' : 'UPCOMING';
  return <Screen>
    <AppHeader title="Match Detail" onBack={() => navigation.goBack()} right={<Pressable accessibilityRole="button" accessibilityLabel="Refresh pertandingan" onPress={() => void matchQuery.refetch()}><Ionicons name="refresh" size={22} color={colors.brand} /></Pressable>} />
    <View style={styles.status}><Badge label={statusLabel} tone={match.status === 'LIVE' ? 'live' : 'muted'} /><Text style={styles.competition}>{match.competitionLabel}</Text></View>
    <View style={styles.scoreboard}>
      <Pressable onPress={() => navigation.navigate('TeamDetail', { teamId: home.id })} style={styles.scoreTeam}><TeamCrest team={home} size={74} /><Text style={styles.teamName}>{home.name}</Text></Pressable>
      <View style={styles.scoreArea}><Text style={styles.score}>{match.homeScore ?? '–'}<Text style={styles.dash}> - </Text>{match.awayScore ?? '–'}</Text><Text style={styles.phase}>{match.status === 'LIVE' ? 'Live · refreshes automatically' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</Text></View>
      <Pressable onPress={() => navigation.navigate('TeamDetail', { teamId: away.id })} style={styles.scoreTeam}><TeamCrest team={away} size={74} /><Text style={styles.teamName}>{away.name}</Text></Pressable>
    </View>
    <View style={styles.infoCard}><Info icon="calendar-outline" label="Date & time" value={`${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })} · ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}`} /><Info icon="location-outline" label="Venue" value={match.venue} /><Info icon="trophy-outline" label="Competition" value={match.competitionLabel} /></View>
    <Text style={styles.sectionTitle}>Match events</Text>
    {match.events?.map((event) => { const isHome = event.teamId === home.id; return <View key={event.id} style={[styles.event, isHome ? styles.eventHome : styles.eventAway]}><Text style={styles.minute}>{event.minute}′</Text><View style={styles.eventMiddle}><Ionicons name="football" size={17} color={colors.brand} /><Text style={styles.player}>{event.player.name}{event.player.jerseyNumber ? ` #${event.player.jerseyNumber}` : ''}</Text></View><Text style={styles.eventTeam}>{teamById(event.teamId).shortName}</Text></View>; })}
    {!match.events?.length ? <Text style={styles.noEvents}>Event timeline will be published after the match starts.</Text> : null}
    {matchQuery.isError ? <Text style={styles.refreshHint}>Showing the last known data. Tap refresh to try again.</Text> : null}
    <View style={styles.highlights}><View style={styles.flex}><Text style={styles.highlightTitle}>Match highlights</Text><Text style={styles.highlightText}>Watch the key moments from this fixture.</Text></View><PrimaryButton compact label="PLAY" icon="play" onPress={() => navigation.navigate('Content', { kind: 'highlights' })} /></View>
  </Screen>;
}

function Info({ icon, label, value }: { icon: 'calendar-outline' | 'location-outline' | 'trophy-outline'; label: string; value: string }) { return <View style={styles.info}><Ionicons name={icon} size={20} color={colors.brand} /><View><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View></View>; }

const styles = StyleSheet.create({
  flex: { flex: 1 }, status: { alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm }, competition: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13 }, scoreboard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: spacing.xxl }, scoreTeam: { flex: 1, alignItems: 'center', gap: spacing.sm }, teamName: { color: colors.text, fontFamily: fonts.bold, fontSize: 13, textAlign: 'center' }, scoreArea: { width: 116, alignItems: 'center' }, score: { color: colors.text, fontFamily: fonts.bold, fontSize: 34 }, dash: { color: colors.muted }, phase: { color: colors.brand, fontFamily: fonts.bold, fontSize: 11, marginTop: 5, textAlign: 'center' }, infoCard: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: spacing.md }, info: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, infoLabel: { color: colors.subtle, fontFamily: fonts.regular, fontSize: 11 }, infoValue: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13, marginTop: 3 }, sectionTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 17, marginTop: spacing.xxl, marginBottom: spacing.sm }, event: { minHeight: 48, paddingHorizontal: spacing.sm, alignItems: 'center', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }, eventHome: { backgroundColor: 'rgba(62,191,95,0.06)' }, eventAway: { backgroundColor: 'rgba(255,255,255,0.02)' }, minute: { width: 40, color: colors.brand, fontFamily: fonts.bold, fontSize: 13 }, eventMiddle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, player: { color: colors.text, fontFamily: fonts.medium, fontSize: 13 }, eventTeam: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11 }, noEvents: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, textAlign: 'center', marginVertical: spacing.lg }, refreshHint: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, textAlign: 'center', marginTop: spacing.sm }, highlights: { marginTop: spacing.xl, padding: spacing.md, borderRadius: radius.lg, backgroundColor: '#163C22', flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, highlightTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 }, highlightText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, marginTop: 4 },
});
