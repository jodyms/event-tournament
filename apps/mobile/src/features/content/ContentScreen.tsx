import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Badge, EmptyState, PrimaryButton, Screen } from '../../components';
import { colors, fonts, radius, spacing } from '../../design-system/theme';
import type { RootStackParamList } from '../../navigation/types';
import { getApiErrorMessage } from '../../services/api/client';
import { getHighlights, getMyCertificate, getNotifications, getRules, getVenues, markNotificationRead } from '../../services/api/tournament';

export function ContentScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Content'>>();
  const body = {
    highlights: <Highlights navigation={navigation} />,
    rules: <Rules />,
    pitch: <Venue />,
    notifications: <Notifications navigation={navigation} />,
    certificate: <Certificate />,
  }[route.params.kind];
  const title = { highlights: 'Highlight', rules: 'Peraturan', pitch: 'Venue', notifications: 'Notifikasi', certificate: 'Sertifikat' }[route.params.kind];
  return <Screen><AppHeader title={title} onBack={() => navigation.goBack()} />{body}</Screen>;
}

function QueryMessage({ query }: { query: { isLoading: boolean; isError: boolean; error: unknown; refetch: () => Promise<unknown> } }) {
  if (query.isLoading) return <EmptyState title="Memuat" message="Data sedang diambil." />;
  if (query.isError) return <EmptyState title="Gagal memuat" message={getApiErrorMessage(query.error)} action={<PrimaryButton label="Coba lagi" onPress={() => void query.refetch()} />} />;
  return null;
}

function Highlights({ navigation }: { navigation: NavigationProp<RootStackParamList> }) {
  const query = useQuery({ queryKey: ['highlights'], queryFn: getHighlights });
  const items = query.data ?? [];
  return <View style={styles.stack}><Text style={styles.lead}>Highlight yang sudah dipublikasikan</Text><QueryMessage query={query} />{!query.isLoading && !query.isError && !items.length ? <EmptyState title="Belum ada highlight" message="Video muncul setelah panitia memublikasikannya." /> : null}{items.map((item) => <Pressable key={item.id} style={styles.card} onPress={() => { if (item.externalUrl) void Linking.openURL(item.externalUrl); else if (item.matchId) navigation.navigate('MatchDetail', { matchId: item.matchId }); }}><View style={styles.poster}><Ionicons name="play" size={30} color={colors.text} /></View><View style={styles.flex}><Badge label="Terbit" tone="brand" /><Text style={styles.title}>{item.title}</Text></View>{item.externalUrl || item.matchId ? <Ionicons name="chevron-forward" size={20} color={colors.muted} /> : null}</Pressable>)}</View>;
}

function Rules() {
  const query = useQuery({ queryKey: ['rules'], queryFn: getRules });
  const rules = query.data ?? [];
  return <View style={styles.stack}><QueryMessage query={query} />{!query.isLoading && !query.isError && !rules.length ? <EmptyState title="Peraturan belum terbit" message="Hanya versi yang dipublikasikan yang ditampilkan di sini." /> : null}{rules.map((rule) => <View key={rule.id} style={styles.block}><View style={styles.hero}><Ionicons name="document-text-outline" size={48} color={colors.brand} /></View><Badge label={`Versi ${rule.version}`} tone="brand" /><Text style={styles.title}>{rule.title}</Text>{rule.publishedAt ? <Text style={styles.copy}>{formatDate(rule.publishedAt)}</Text> : null}<Text style={styles.paragraph}>{rule.body}</Text>{rule.body.startsWith('http') ? <PrimaryButton label="Buka dokumen" icon="document-text-outline" onPress={() => void Linking.openURL(rule.body)} /> : null}</View>)}</View>;
}

function Venue() {
  const query = useQuery({ queryKey: ['venues'], queryFn: getVenues });
  const venues = query.data ?? [];
  return <View style={styles.stack}><QueryMessage query={query} />{!query.isLoading && !query.isError && !venues.length ? <EmptyState icon="location-outline" title="Venue belum tersedia" message="Lokasi muncul setelah turnamen dipublikasikan." /> : null}{venues.map((venue) => <View key={venue.id} style={styles.block}><View style={styles.hero}><Ionicons name="location-outline" size={48} color={colors.brand} /></View><Text style={styles.title}>{venue.name}</Text><Detail label="Alamat" value={venue.address ?? 'Belum diisi'} /><Detail label="Kapasitas" value={venue.capacity == null ? 'Belum diisi' : String(venue.capacity)} />{venue.mapUrl ? <PrimaryButton label="Buka peta" icon="map-outline" onPress={() => void Linking.openURL(venue.mapUrl!)} /> : <Text style={styles.paragraph}>Peta tersedia jika panitia mengunggah lokasi.</Text>}</View>)}</View>;
}

function Certificate() {
  const query = useQuery({ queryKey: ['certificate', 'me'], queryFn: getMyCertificate });
  const certificate = query.data;
  if (query.isLoading || query.isError) return <QueryMessage query={query} />;
  if (!certificate) return <EmptyState icon="ribbon-outline" title="Sertifikat belum tersedia" message="Sertifikat muncul setelah panitia menandai kelayakan Anda." />;
  return <View style={styles.stack}><View style={styles.hero}><Ionicons name="ribbon-outline" size={48} color={colors.brand} /></View><Text style={styles.title}>{certificate.recipientName}</Text><Text style={styles.copy}>{certificate.tournamentName}</Text><Detail label="Kode verifikasi" value={certificate.verificationCode} /></View>;
}

function Notifications({ navigation }: { navigation: NavigationProp<RootStackParamList> }) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['notifications'], queryFn: getNotifications });
  const markRead = useMutation({ mutationFn: markNotificationRead, onSuccess: () => { void client.invalidateQueries({ queryKey: ['notifications'] }); void client.invalidateQueries({ queryKey: ['home'] }); } });
  const items = query.data ?? [];
  return <View style={styles.stack}><QueryMessage query={query} />{!query.isLoading && !query.isError && !items.length ? <EmptyState title="Tidak ada notifikasi" message="Pembaruan pertandingan dan tim akan muncul di sini." /> : null}{items.map((item) => <Pressable key={item.id} style={styles.card} onPress={() => { if (!item.read) markRead.mutate(item.id); if (item.teamId) navigation.navigate('ManageTeam', { teamId: item.teamId }); }}><View style={styles.notificationIcon}><Ionicons name={item.read ? 'notifications-outline' : 'alert-circle-outline'} size={22} color={colors.brand} /></View><View style={styles.flex}><Text style={styles.title}>{item.title}</Text><Text style={styles.copy}>{item.body}</Text></View>{item.teamId ? <Ionicons name="chevron-forward" size={20} color={colors.muted} /> : null}</Pressable>)}</View>;
}

function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detail}><Text style={styles.copy}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>; }

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: spacing.md, marginTop: spacing.md },
  block: { gap: spacing.sm },
  hero: { height: 150, borderRadius: radius.lg, backgroundColor: colors.successSurface, alignItems: 'center', justifyContent: 'center' },
  card: { minHeight: 86, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  poster: { width: 70, alignSelf: 'stretch', borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: '#254529' },
  notificationIcon: { width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.successSurface },
  lead: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, marginTop: 4 },
  copy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  paragraph: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  detail: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  detailValue: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14, marginTop: 3 },
});
