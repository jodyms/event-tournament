import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader, EmptyState, PrimaryButton, Screen, Sheet, TeamRow } from '../../components';
import { colors, fonts, radius, spacing } from '../../design-system/theme';
import type { RootStackParamList } from '../../navigation/types';
import { getApiErrorMessage } from '../../services/api/client';
import { getTeams } from '../../services/api/tournament';
import { useFavorites } from './useFavorites';

export function FavoritesScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [adding, setAdding] = useState(false);
  const favorites = useFavorites();
  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: getTeams, enabled: adding });
  const catalog = teamsQuery.data ?? [];
  return (
    <Screen>
      <AppHeader title="Favorite Team" onBack={() => navigation.goBack()} />
      <Text style={styles.copy}>Tim yang Anda ikuti tampil di sini.</Text>
      {favorites.isLoading ? <EmptyState title="Memuat favorit" message="Daftar tim yang Anda ikuti sedang diambil." /> : null}
      {favorites.isError ? <EmptyState title="Favorit gagal dimuat" message={getApiErrorMessage(favorites.error)} action={<PrimaryButton label="Coba lagi" onPress={() => void favorites.refetch()} />} /> : null}
      {!favorites.isLoading && !favorites.isError && favorites.teams.length ? <View style={styles.list}>{favorites.teams.map((team) => <TeamRow key={team.id} team={team} onPress={() => navigation.navigate('TeamDetail', { teamId: team.id })} trailing={<Pressable accessibilityLabel={`Hapus ${team.name} dari favorit`} onPress={() => void favorites.toggle(team)} style={styles.remove}><Ionicons name="close" color="#FF6B70" size={20} /></Pressable>} />)}</View> : null}
      {!favorites.isLoading && !favorites.isError && !favorites.teams.length ? <EmptyState title="Belum ada tim favorit" message="Tambahkan tim untuk melihat jadwal dan hasilnya di sini." /> : null}
      <PrimaryButton icon="add" label="Tambah tim favorit" onPress={() => setAdding(true)} />
      <Sheet visible={adding} title="Pilih tim" onClose={() => setAdding(false)}>
        <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetList} keyboardShouldPersistTaps="handled">
          {teamsQuery.isLoading ? <Text style={styles.status}>Memuat tim…</Text> : null}
          {teamsQuery.isError ? <EmptyState title="Tim gagal dimuat" message={getApiErrorMessage(teamsQuery.error)} action={<PrimaryButton label="Coba lagi" onPress={() => void teamsQuery.refetch()} />} /> : null}
          {favorites.mutationError ? <Text style={styles.error}>{getApiErrorMessage(favorites.mutationError)}</Text> : null}
          {!teamsQuery.isLoading && !teamsQuery.isError && catalog.length === 0 ? <Text style={styles.status}>Belum ada tim yang dipublikasikan.</Text> : null}
          {catalog.map((team) => <TeamRow key={team.id} team={team} onPress={() => { if (favorites.includes(team.id)) { setAdding(false); return; } void favorites.toggle(team).then((saved) => { if (saved) setAdding(false); }); }} trailing={favorites.includes(team.id) ? <Ionicons name="checkmark-circle" color={colors.brand} size={24} /> : undefined} />)}
        </ScrollView>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, marginTop: spacing.xs, marginBottom: spacing.xl },
  list: { gap: spacing.sm, flex: 1, marginBottom: spacing.lg },
  remove: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#321A21' },
  sheetScroll: { maxHeight: 480 },
  sheetList: { gap: spacing.sm, paddingBottom: spacing.lg },
  status: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, paddingVertical: spacing.md },
  error: { color: '#FF6B70', fontFamily: fonts.medium, fontSize: 13, marginBottom: spacing.sm },
});
