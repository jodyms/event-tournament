import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, EmptyState, Screen, TeamRow } from '../../components';
import { colors, fonts, radius, spacing } from '../../design-system/theme';
import type { RootStackParamList } from '../../navigation/types';
import { getCoachTeams } from '../../services/api/tournament';

export function CoachDashboardScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const teamsQuery = useQuery({ queryKey: ['coach', 'teams'], queryFn: getCoachTeams });
  const coachTeams = teamsQuery.data ?? [];
  return <Screen><AppHeader title="Coach Dashboard" onBack={() => navigation.goBack()} /><Text style={styles.section}>Pilih tim untuk dikelola</Text>{coachTeams.length ? <View style={styles.list}>{coachTeams.map((team) => <TeamRow key={team.id} team={team} onPress={() => navigation.navigate('ManageTeam', { teamId: team.id })} />)}</View> : <EmptyState title="Belum ada penugasan" message="Tim muncul di sini setelah operator menugaskan Anda sebagai coach." />}<Text style={styles.section}>Informasi turnamen</Text><View style={styles.list}><InfoRow label="Peraturan turnamen" icon="document-text-outline" onPress={() => navigation.navigate('Content', { kind: 'rules' })} /><InfoRow label="Venue" icon="map-outline" onPress={() => navigation.navigate('Content', { kind: 'pitch' })} /></View></Screen>;
}

function InfoRow({ label, icon, onPress }: { label: string; icon: 'document-text-outline' | 'map-outline'; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.infoRow, pressed && styles.pressed]}><View style={styles.infoIcon}><Ionicons name={icon} size={21} color={colors.brand} /></View><Text style={styles.infoText}>{label}</Text><Ionicons name="chevron-forward" color={colors.brand} size={24} /></Pressable>; }

const styles = StyleSheet.create({ section: { color: colors.text, fontFamily: fonts.bold, fontSize: 15, marginTop: spacing.lg, marginBottom: spacing.sm }, list: { gap: spacing.sm }, infoRow: { minHeight: 64, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, infoIcon: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.successSurface, alignItems: 'center', justifyContent: 'center' }, infoText: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 14 }, pressed: { opacity: 0.72 } });
