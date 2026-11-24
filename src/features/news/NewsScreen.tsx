import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader, Badge, Screen } from '../../components/ui';
import { news } from '../../data/mockData';
import { colors, fonts, radius, spacing } from '../../design-system/theme';

export function NewsScreen() {
  return (
    <Screen>
      <AppHeader title="News" />
      <Text style={styles.lead}>Stories from around the tournament</Text>
      {news.map((article, index) => (
        <View key={article.id} style={styles.card}>
          <View style={[styles.art, { backgroundColor: article.accent }]}><Ionicons name={index === 0 ? 'football' : 'newspaper-outline'} size={44} color="rgba(255,255,255,0.85)" /></View>
          <View style={styles.body}><Badge label={article.category} /><Text style={styles.title}>{article.title}</Text><Text style={styles.meta}>{article.readMinutes} min read · Today</Text></View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, marginBottom: spacing.lg },
  card: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  art: { height: 138, alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.md, gap: spacing.xs },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 17, lineHeight: 23 },
  meta: { color: colors.subtle, fontFamily: fonts.regular, fontSize: 11 },
});
