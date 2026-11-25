import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radius, spacing } from '../design-system/theme';
import type { Match, Team } from '../domain/models';
import { Badge, type IconName } from './controls';

export function TeamCrest({ team, size = 44 }: { team: Team; size?: number }) {
  return (
    <View accessibilityLabel={`Logo ${team.name}`} style={[styles.crestOuter, { width: size, height: size, borderColor: team.accent }]}>
      <LinearGradient colors={[team.accent, '#15151F']} style={styles.crestGradient}>
        <Text style={[styles.crestText, { fontSize: Math.max(10, size * 0.26) }]}>{team.initials}</Text>
      </LinearGradient>
    </View>
  );
}

function Score({ match }: { match: Match }) {
  if (match.status === 'UPCOMING') return <Text style={styles.versus}>VS</Text>;
  return <Text style={styles.score}>{match.homeScore ?? '-'} - {match.awayScore ?? '-'}</Text>;
}

export function MatchCard({ match, onPress, compact = false }: { match: Match; onPress: () => void; compact?: boolean }) {
  const home = match.homeTeam;
  const away = match.awayTeam;
  const time = new Date(match.startsAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${home.name} melawan ${away.name}`} onPress={onPress} style={({ pressed }) => [styles.matchCard, compact && styles.matchCardCompact, pressed && styles.pressed]}>
      <View style={styles.matchMeta}>
        <Text numberOfLines={1} style={styles.matchCompetition}>{match.competitionLabel}</Text>
        <Badge label={match.status === 'LIVE' ? '● LIVE' : match.status === 'UPCOMING' ? time : 'FT'} tone={match.status === 'LIVE' ? 'error' : 'muted'} />
      </View>
      <View style={styles.matchTeams}>
        <View style={styles.matchTeam}><TeamCrest team={home} size={compact ? 38 : 46} /><Text numberOfLines={1} style={styles.teamLabel}>{home.shortName}</Text></View>
        <Score match={match} />
        <View style={styles.matchTeam}><TeamCrest team={away} size={compact ? 38 : 46} /><Text numberOfLines={1} style={styles.teamLabel}>{away.shortName}</Text></View>
      </View>
      <Text style={styles.venue} numberOfLines={1}><Ionicons name="location-outline" size={12} /> {match.venue}</Text>
    </Pressable>
  );
}

export function TeamRow({ team, onPress, trailing }: { team: Team; onPress: () => void; trailing?: ReactNode }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.teamRow, pressed && styles.pressed]}>
      <Text style={styles.teamAge}>{team.age}</Text>
      <TeamCrest team={team} size={38} />
      <View style={styles.flex}><Text style={styles.teamName}>{team.name}</Text><Text style={styles.teamSub}>{team.group}</Text></View>
      {trailing ?? <Ionicons name="chevron-forward" color={colors.brand} size={24} />}
    </Pressable>
  );
}

export function EmptyState({ icon = 'football-outline', title, message, action }: { icon?: IconName; title: string; message: string; action?: ReactNode }) {
  return <View style={styles.empty}><Ionicons name={icon} size={40} color={colors.subtle} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyMessage}>{message}</Text>{action}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.72 },
  crestOuter: { borderRadius: radius.pill, borderWidth: 2, padding: 2, overflow: 'hidden' },
  crestGradient: { flex: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  crestText: { color: colors.text, fontFamily: fonts.bold },
  matchCard: { minWidth: 230, borderRadius: radius.lg, padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  matchCardCompact: { minWidth: 200 },
  matchMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  matchCompetition: { flex: 1, color: colors.muted, fontFamily: fonts.regular, fontSize: 11 },
  matchTeams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  matchTeam: { width: 70, alignItems: 'center', gap: 6 },
  teamLabel: { color: colors.text, fontFamily: fonts.semibold, fontSize: 11, textAlign: 'center' },
  score: { color: colors.text, fontFamily: fonts.bold, fontSize: 25 },
  versus: { color: colors.subtle, fontFamily: fonts.bold, fontSize: 18 },
  venue: { color: colors.subtle, fontFamily: fonts.regular, fontSize: 10, textAlign: 'center' },
  teamRow: { minHeight: 64, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  teamAge: { width: 28, color: colors.subtle, fontFamily: fonts.medium, fontSize: 11 },
  teamName: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
  teamSub: { color: colors.subtle, fontFamily: fonts.regular, fontSize: 11, marginTop: 3 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.sm },
  emptyTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, textAlign: 'center' },
  emptyMessage: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
