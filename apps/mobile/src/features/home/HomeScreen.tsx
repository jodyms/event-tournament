import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Badge, EmptyState, IconButton, MatchCard, PrimaryButton, Screen, SectionHeader } from '../../components';
import { colors, fonts, radius, spacing } from '../../design-system/theme';
import type { RootStackParamList } from '../../navigation/types';
import { isDemoMode } from '../../services/api/mode';
import { getHome } from '../../services/api/tournament';

const quickActions = [
  { label: 'Matches', icon: 'football-outline' as const, route: 'Competition' as const },
  { label: 'Teams', icon: 'shield-outline' as const, route: 'TeamDetail' as const },
  { label: 'Highlights', icon: 'play-circle-outline' as const, route: 'Content' as const },
];

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  const homeQuery = useQuery({ queryKey: ['home'], queryFn: getHome, refetchInterval: (query) => {
    const current = query.state.data;
    const live = current?.hero?.status === 'LIVE' || current?.matchesToday.some((match) => match.status === 'LIVE');
    return foreground && live ? (current?.pollIntervalSeconds ?? 30) * 1000 : false;
  } });
  const home = homeQuery.data;
  const hero = home?.hero;
  const matches = home?.matchesToday ?? [];
  const articles = home?.news ?? [];
  const heroTitle = hero ? `${hero.homeTeam.shortName} ${hero.homeScore ?? 0} – ${hero.awayTeam.shortName} ${hero.awayScore ?? 0}` : 'Belum ada pertandingan hari ini';
  return (
    <Screen>
      <AppHeader onMenu={() => navigation.navigate('Menu')} right={<IconButton icon="notifications-outline" label="Notifikasi" onPress={() => navigation.navigate('Content', { kind: 'notifications' })} />} />
      {isDemoMode() ? <Text style={styles.demo}>Data demo. Isi EXPO_PUBLIC_API_URL untuk data resmi.</Text> : null}
      <LinearGradient colors={['#68826E', '#254529', '#12180F']} style={styles.hero}>
        <View style={styles.heroBall}><Ionicons name="football" size={92} color="rgba(255,255,255,0.72)" /></View>
        <Badge label={hero?.status === 'LIVE' ? '● LIVE' : 'JADWAL'} tone={hero?.status === 'LIVE' ? 'live' : 'muted'} />
        <View style={styles.heroBottom}>
          <Text style={styles.heroCategory}>{hero?.competitionLabel ?? 'TYC'}</Text>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <View style={styles.heroActions}>
            <PrimaryButton compact icon="play" label="LIHAT" disabled={!hero} onPress={() => { if (hero) navigation.navigate('MatchDetail', { matchId: hero.id }); }} />
          </View>
        </View>
      </LinearGradient>
      {home?.certificateAvailable ? <Pressable onPress={() => navigation.navigate('Content', { kind: 'certificate' })} style={({ pressed }) => [styles.certificate, pressed && styles.pressed]}>
        <Ionicons name="ribbon-outline" size={22} color={colors.live} /><Text style={styles.certificateText}>Certificate</Text>
      </Pressable> : null}
      <SectionHeader title="MATCHES TODAY" actionLabel="View All" onAction={() => navigation.navigate('Competition')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
        {matches.length ? matches.slice(0, 3).map((match) => <MatchCard key={match.id} compact match={match} onPress={() => navigation.navigate('MatchDetail', { matchId: match.id })} />) : <EmptyState title="Tidak ada pertandingan" message="Jadwal hari ini akan muncul di sini." />}
      </ScrollView>
      <View style={styles.quickGrid}>
        {quickActions.map((item) => (
          <Pressable key={item.label} onPress={() => item.route === 'Competition' ? navigation.navigate('Competition') : item.route === 'TeamDetail' ? navigation.navigate('Favorites') : navigation.navigate('Content', { kind: 'highlights' })} style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}>
            <View style={styles.quickIcon}><Ionicons name={item.icon} size={30} color={colors.text} /></View><Text style={styles.quickLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <SectionHeader title="FOOTBALL NEWS" actionLabel="See All" onAction={() => navigation.navigate('MainTabs', { screen: 'News' })} />
      {articles.slice(0, 2).map((article) => (
        <View key={article.id} style={styles.newsCard}>
          <View style={[styles.newsArt, { backgroundColor: article.accent }]}><Ionicons name="newspaper-outline" size={28} color={colors.text} /></View>
          <View style={styles.newsBody}><Badge label={article.category} /><Text numberOfLines={2} style={styles.newsTitle}>{article.title}</Text><Text style={styles.newsMeta}>{article.readMinutes} min read</Text></View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
  hero: { minHeight: 218, borderRadius: radius.lg, padding: spacing.md, overflow: 'hidden', justifyContent: 'space-between' },
  heroBall: { position: 'absolute', right: 34, top: 34, opacity: 0.8 },
  heroBottom: { gap: spacing.xs, marginTop: 64 },
  heroCategory: { color: '#C9D0CC', fontFamily: fonts.regular, fontSize: 11 },
  heroTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 21, lineHeight: 28 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  demo: { color: colors.live, fontFamily: fonts.medium, fontSize: 12, marginBottom: spacing.sm },
  certificate: { minHeight: 48, marginTop: spacing.lg, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs, backgroundColor: colors.brand },
  certificateText: { color: colors.text, fontFamily: fonts.bold, fontSize: 16 },
  horizontalList: { gap: spacing.sm, paddingRight: spacing.md },
  quickGrid: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  quickCard: { flex: 1, minHeight: 106, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  quickIcon: { width: 48, height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  quickLabel: { color: colors.text, fontFamily: fonts.semibold, fontSize: 12 },
  newsCard: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, marginBottom: spacing.sm },
  newsArt: { width: 90, height: 86, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  newsBody: { flex: 1, gap: spacing.xs },
  newsTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  newsMeta: { color: colors.subtle, fontFamily: fonts.regular, fontSize: 10 },
});
