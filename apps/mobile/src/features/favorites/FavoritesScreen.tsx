import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, EmptyState, PrimaryButton, Screen, Sheet, TeamRow } from '../../components';
import { colors, fonts, radius, spacing } from '../../design-system/theme';
import type { RootStackParamList } from '../../navigation/types';
import { getTeams } from '../../services/api/tournament';
import { useFavorites } from './useFavorites';

export function FavoritesScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [adding, setAdding] = useState(false);
  const favorites = useFavorites();
  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: getTeams, enabled: adding });
  const catalog = teamsQuery.data ?? [];
  return <Screen><AppHeader title="Favorite Team" onBack={() => navigation.goBack()} /><Text style={styles.copy}>Tim yang Anda ikuti tampil di sini.</Text>{favorites.teams.length ? <View style={styles.list}>{favorites.teams.map((team) => <TeamRow key={team.id} team={team} onPress={() => navigation.navigate('TeamDetail', { teamId: team.id })} trailing={<Pressable accessibilityLabel={`Hapus ${team.name} dari favorit`} onPress={() => favorites.toggle(team)} style={styles.remove}><Ionicons name="close" color="#FF6B70" size={20} /></Pressable>} />)}</View> : <EmptyState title="Belum ada tim favorit" message="Tambahkan tim untuk melihat jadwal dan hasilnya di sini." />}<PrimaryButton icon="add" label="Tambah tim favorit" onPress={() => setAdding(true)} /><Sheet visible={adding} title="Pilih tim" onClose={() => setAdding(false)}><View style={styles.sheetList}>{catalog.map((team) => <TeamRow key={team.id} team={team} onPress={() => { if (!favorites.includes(team.id)) favorites.toggle(team); setAdding(false); }} trailing={favorites.includes(team.id) ? <Ionicons name="checkmark-circle" color={colors.brand} size={24} /> : undefined} />)}</View></Sheet></Screen>;
}

const styles = StyleSheet.create({
  copy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, marginTop: spacing.xs, marginBottom: spacing.xl },
  list: { gap: spacing.sm, flex: 1, marginBottom: spacing.lg },
  remove: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#321A21' },
  sheetList: { gap: spacing.sm, paddingBottom: spacing.lg },
});
