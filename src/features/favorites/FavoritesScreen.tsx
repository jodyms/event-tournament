import { useState } from 'react';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, EmptyState, PrimaryButton, Screen, Sheet, TeamRow } from '../../components/ui';
import { teams } from '../../data/mockData';
import { colors, fonts, radius, spacing } from '../../design-system/theme';
import type { RootStackParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';

export function FavoritesScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [adding, setAdding] = useState(false);
  const favoriteTeamIds = useAppStore((state) => state.favoriteTeamIds);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const favoriteTeams = teams.filter((team) => favoriteTeamIds.includes(team.id));
  return <Screen><AppHeader title="Favorite Team" onBack={() => navigation.goBack()} /><Text style={styles.copy}>Keep the teams you care about close.</Text>{favoriteTeams.length ? <View style={styles.list}>{favoriteTeams.map((team) => <TeamRow key={team.id} team={team} onPress={() => navigation.navigate('TeamDetail', { teamId: team.id })} trailing={<Pressable accessibilityLabel={`Hapus ${team.name} dari favorit`} onPress={() => toggleFavorite(team.id)} style={styles.remove}><Ionicons name="close" color="#FF6B70" size={20} /></Pressable>} />)}</View> : <EmptyState title="No favorite teams" message="Add a team to see its fixtures and results here." /> }<PrimaryButton icon="add" label="Add favorite team" onPress={() => setAdding(true)} /><Sheet visible={adding} title="Choose a team" onClose={() => setAdding(false)}><View style={styles.sheetList}>{teams.map((team) => <TeamRow key={team.id} team={team} onPress={() => { if (!favoriteTeamIds.includes(team.id)) toggleFavorite(team.id); setAdding(false); }} trailing={favoriteTeamIds.includes(team.id) ? <Ionicons name="checkmark-circle" color={colors.brand} size={24} /> : undefined} />)}</View></Sheet></Screen>;
}

const styles = StyleSheet.create({
  copy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, marginTop: spacing.xs, marginBottom: spacing.xl },
  list: { gap: spacing.sm, flex: 1, marginBottom: spacing.lg },
  remove: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#321A21' },
  sheetList: { gap: spacing.sm, paddingBottom: spacing.lg },
});
