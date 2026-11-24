import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Badge, EmptyState, PrimaryButton, Screen } from '../../components/ui';
import { colors, fonts, radius, spacing } from '../../design-system/theme';
import type { RootStackParamList } from '../../navigation/types';

export function ContentScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Content'>>();
  const body = {
    highlights: <Highlights />,
    rules: <Rules />,
    pitch: <Venue />,
    notifications: <Notifications navigation={navigation} />,
    certificate: <Certificate />,
  }[route.params.kind];
  const title = { highlights: 'Highlights', rules: 'Tournament Rules', pitch: 'Venue', notifications: 'Notifications', certificate: 'Certificate' }[route.params.kind];
  return <Screen><AppHeader title={title} onBack={() => navigation.goBack()} />{body}</Screen>;
}

function Highlights() { return <View style={styles.stack}><Text style={styles.lead}>Published tournament highlights</Text>{['Opening weekend recap', 'Top goals of the group stage'].map((title, index) => <Pressable key={title} style={styles.card}><View style={styles.poster}><Ionicons name="play" size={30} color={colors.text} /></View><View style={styles.flex}><Badge label="Published" tone="brand" /><Text style={styles.title}>{title}</Text><Text style={styles.copy}>Available from the official tournament media feed.</Text></View><Ionicons name={index === 0 ? 'chevron-forward' : 'lock-closed-outline'} size={20} color={colors.muted} /></Pressable>)}</View>; }
function Rules() { return <View style={styles.stack}><View style={styles.hero}><Ionicons name="document-text-outline" size={48} color={colors.brand} /></View><Badge label="Published" tone="brand" /><Text style={styles.title}>Tournament Rules</Text><Text style={styles.copy}>Version 1.2 · Last updated 18 July 2026</Text><Text style={styles.paragraph}>Official rules are provided by the tournament organiser. Only the latest published version is shown here.</Text><PrimaryButton label="Open rules document" icon="document-text-outline" onPress={() => {}} /></View>; }
function Venue() { return <View style={styles.stack}><View style={styles.hero}><Ionicons name="location-outline" size={48} color={colors.brand} /></View><Text style={styles.title}>Stadium Pitch 1</Text><Text style={styles.copy}>Tournament venue</Text><Detail label="Address" value="Tournament Sports Complex, Main Gate" /><Detail label="Capacity" value="500" /><Text style={styles.paragraph}>Map directions are available only when the organiser publishes a location.</Text></View>; }
function Certificate() { return <EmptyState icon="ribbon-outline" title="Certificate unavailable" message="Certificates appear only after the tournament confirms eligibility." />; }
function Notifications({ navigation }: { navigation: NavigationProp<RootStackParamList> }) { const items = [{ title: 'Match rescheduled', body: 'Football FC vs Kickball FC has a new kick-off time.', target: { screen: 'MatchDetail' as const, matchId: 'm1' } }, { title: 'Player registration needs revision', body: 'A player submission requires changes before it can be approved.', target: { screen: 'ManageTeam' as const, teamId: 'kickball' } }]; return <View style={styles.stack}>{items.map((item) => <Pressable key={item.title} style={styles.card} onPress={() => item.target.screen === 'MatchDetail' ? navigation.navigate('MatchDetail', { matchId: item.target.matchId }) : navigation.navigate('ManageTeam', { teamId: item.target.teamId })}><View style={styles.notificationIcon}><Ionicons name={item.target.screen === 'MatchDetail' ? 'calendar-outline' : 'alert-circle-outline'} size={22} color={colors.brand} /></View><View style={styles.flex}><Text style={styles.title}>{item.title}</Text><Text style={styles.copy}>{item.body}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.muted} /></Pressable>)}</View>; }
function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detail}><Text style={styles.copy}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>; }

const styles = StyleSheet.create({ flex: { flex: 1 }, stack: { gap: spacing.md, marginTop: spacing.md }, hero: { height: 150, borderRadius: radius.lg, backgroundColor: colors.successSurface, alignItems: 'center', justifyContent: 'center' }, card: { minHeight: 86, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, poster: { width: 70, alignSelf: 'stretch', borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: '#254529' }, notificationIcon: { width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.successSurface }, lead: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14 }, title: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, marginTop: 4 }, copy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 }, paragraph: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 }, detail: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, detailValue: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14, marginTop: 3 } });
