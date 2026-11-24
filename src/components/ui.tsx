import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchById, teamById } from '../data/mockData';
import { colors, fonts, radius, spacing } from '../design-system/theme';
import type { Match, Team } from '../domain/models';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function Screen({ children, scroll = true, style }: PropsWithChildren<{ scroll?: boolean; style?: StyleProp<ViewStyle> }>) {
  const content = scroll ? (
    <ScrollView contentContainerStyle={[styles.screenContent, style]} showsVerticalScrollIndicator={false}>{children}</ScrollView>
  ) : (
    <View style={[styles.screenContent, styles.flex, style]}>{children}</View>
  );
  return <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>{content}</SafeAreaView>;
}

export function AppHeader({ title, onBack, onMenu, right }: { title?: string; onBack?: () => void; onMenu?: () => void; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSlot}>
        {onBack ? <IconButton icon="chevron-back" label="Kembali" onPress={onBack} /> : null}
        {onMenu ? <IconButton icon="menu" label="Buka menu" onPress={onMenu} plain /> : null}
      </View>
      {title ? <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text> : <View style={styles.flex} />}
      <View style={[styles.headerSlot, styles.headerRight]}>{right}</View>
    </View>
  );
}

export function IconButton({ icon, onPress, label, plain = false }: { icon: IconName; onPress: () => void; label: string; plain?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={onPress} style={({ pressed }) => [styles.iconButton, plain && styles.iconButtonPlain, pressed && styles.pressed]}>
      <Ionicons name={icon} size={24} color={colors.text} />
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress, icon, disabled = false, compact = false }: { label: string; onPress: () => void; icon?: IconName; disabled?: boolean; compact?: boolean }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primaryButton, compact && styles.compactButton, (pressed || disabled) && styles.buttonDim]}>
      {icon ? <Ionicons name={icon} color={colors.text} size={19} /> : null}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function TextField({ label, error, ...props }: ComponentProps<typeof TextInput> & { label?: string; error?: string }) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        accessibilityLabel={label ?? props.placeholder}
        placeholderTextColor={colors.muted}
        selectionColor={colors.brand}
        {...props}
        style={[styles.input, props.multiline && styles.inputMultiline, props.style]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function Badge({ label, tone = 'brand' }: { label: string; tone?: 'brand' | 'live' | 'muted' | 'error' }) {
  const palette = {
    brand: [colors.successSurface, colors.brand],
    live: [colors.live, colors.canvas],
    muted: [colors.surfaceRaised, colors.muted],
    error: ['#3B171C', '#FF6B70'],
  }[tone];
  return <View style={[styles.badge, { backgroundColor: palette[0] }]}><Text style={[styles.badgeText, { color: palette[1] }]}>{label}</Text></View>;
}

export function TeamCrest({ team, size = 44 }: { team: Team; size?: number }) {
  return (
    <View accessibilityLabel={`Logo ${team.name}`} style={[styles.crestOuter, { width: size, height: size, borderColor: team.accent }]}>
      <LinearGradient colors={[team.accent, '#15151F']} style={styles.crestGradient}>
        <Text style={[styles.crestText, { fontSize: Math.max(10, size * 0.26) }]}>{team.initials}</Text>
      </LinearGradient>
    </View>
  );
}

export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? <Pressable onPress={onAction} hitSlop={8}><Text style={styles.sectionAction}>{actionLabel}</Text></Pressable> : null}
    </View>
  );
}

function Score({ match }: { match: Match }) {
  if (match.status === 'UPCOMING') return <Text style={styles.versus}>VS</Text>;
  return <Text style={styles.score}>{match.homeScore ?? '-'} - {match.awayScore ?? '-'}</Text>;
}

export function MatchCard({ match, onPress, compact = false }: { match: Match; onPress: () => void; compact?: boolean }) {
  const home = teamById(match.homeTeamId);
  const away = teamById(match.awayTeamId);
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

export function SegmentedTabs<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (value: T) => void }) {
  return (
    <View accessibilityRole="tablist" style={styles.tabs}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} key={option} onPress={() => onChange(option)} style={[styles.tab, active && styles.tabActive]}>
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function EmptyState({ icon = 'football-outline', title, message, action }: { icon?: IconName; title: string; message: string; action?: ReactNode }) {
  return <View style={styles.empty}><Ionicons name={icon} size={40} color={colors.subtle} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyMessage}>{message}</Text>{action}</View>;
}

export function Sheet({ visible, title, onClose, children }: PropsWithChildren<{ visible: boolean; title: string; onClose: () => void }>) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityLabel="Tutup" onPress={onClose} style={styles.modalBackdrop} />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{title}</Text><IconButton icon="close" label="Tutup" onPress={onClose} plain /></View>
          {children}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export function matchFromId(id: string) { return matchById(id); }

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  screenContent: { paddingHorizontal: spacing.md, paddingBottom: 120, backgroundColor: colors.canvas },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  headerSlot: { minWidth: 48, flexDirection: 'row', alignItems: 'center' },
  headerRight: { justifyContent: 'flex-end' },
  headerTitle: { flex: 1, color: colors.text, fontFamily: fonts.bold, fontSize: 18, textAlign: 'center' },
  iconButton: { width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  iconButtonPlain: { backgroundColor: 'transparent', borderColor: 'transparent' },
  pressed: { opacity: 0.72 },
  primaryButton: { minHeight: 50, paddingHorizontal: spacing.lg, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs, backgroundColor: colors.brand },
  compactButton: { minHeight: 38, alignSelf: 'flex-start', paddingHorizontal: spacing.md },
  primaryButtonText: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  buttonDim: { opacity: 0.55 },
  fieldWrap: { gap: spacing.xs },
  fieldLabel: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13 },
  input: { minHeight: 54, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderInput, backgroundColor: colors.input, color: colors.text, fontFamily: fonts.regular, fontSize: 15, paddingHorizontal: spacing.md },
  inputMultiline: { minHeight: 94, paddingTop: spacing.md, textAlignVertical: 'top' },
  fieldError: { color: colors.error, fontFamily: fonts.regular, fontSize: 12 },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontFamily: fonts.bold, fontSize: 10 },
  crestOuter: { borderRadius: radius.pill, borderWidth: 2, padding: 2, overflow: 'hidden' },
  crestGradient: { flex: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  crestText: { color: colors.text, fontFamily: fonts.bold },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm, paddingHorizontal: spacing.xxs },
  sectionTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 16 },
  sectionAction: { color: colors.live, backgroundColor: '#163C22', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7, fontFamily: fonts.semibold, fontSize: 11 },
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
  tabs: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: colors.muted, marginVertical: spacing.lg },
  tab: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -2 },
  tabActive: { borderBottomColor: colors.brand },
  tabText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 14 },
  tabTextActive: { color: colors.text, fontFamily: fonts.bold },
  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.sm },
  emptyTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, textAlign: 'center' },
  emptyMessage: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.68)' },
  sheet: { maxHeight: '88%', backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  sheetHandle: { width: 48, height: 4, borderRadius: radius.pill, alignSelf: 'center', marginTop: spacing.sm, backgroundColor: colors.borderInput },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: spacing.sm },
  sheetTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
});
