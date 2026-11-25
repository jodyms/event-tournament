import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Badge, EmptyState, PrimaryButton, Screen } from '../../components';
import { colors, fonts, radius, spacing } from '../../design-system/theme';
import { getApiErrorMessage } from '../../services/api/client';
import { getNews, getNewsArticle } from '../../services/api/tournament';

export function NewsScreen() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listQuery = useQuery({ queryKey: ['news'], queryFn: getNews });
  const articleQuery = useQuery({ queryKey: ['news', selectedId], queryFn: () => getNewsArticle(selectedId!), enabled: Boolean(selectedId) });
  if (selectedId) {
    const article = articleQuery.data;
    return (
      <Screen>
        <AppHeader title="Berita" onBack={() => setSelectedId(null)} />
        {articleQuery.isLoading ? <EmptyState title="Memuat berita" message="Artikel sedang diambil." /> : null}
        {articleQuery.isError ? <EmptyState title="Berita tidak tersedia" message={getApiErrorMessage(articleQuery.error)} action={<PrimaryButton label="Coba lagi" onPress={() => void articleQuery.refetch()} />} /> : null}
        {article ? <View style={styles.article}><View style={[styles.art, { backgroundColor: article.accent }]}><Ionicons name="newspaper-outline" size={44} color="rgba(255,255,255,0.85)" /></View><Badge label={article.category} /><Text style={styles.title}>{article.title}</Text><Text style={styles.meta}>{article.readMinutes} menit baca</Text><Text style={styles.paragraph}>{article.body}</Text></View> : null}
      </Screen>
    );
  }
  const articles = listQuery.data ?? [];
  return (
    <Screen>
      <AppHeader title="Berita" />
      <Text style={styles.lead}>Kabar dari turnamen</Text>
      {listQuery.isLoading ? <EmptyState title="Memuat berita" message="Daftar berita sedang diambil." /> : null}
      {listQuery.isError ? <EmptyState title="Berita tidak tersedia" message={getApiErrorMessage(listQuery.error)} action={<PrimaryButton label="Coba lagi" onPress={() => void listQuery.refetch()} />} /> : null}
      {!listQuery.isLoading && !listQuery.isError && !articles.length ? <EmptyState title="Belum ada berita" message="Artikel muncul setelah dipublikasikan." /> : null}
      {articles.map((article) => (
        <Pressable key={article.id} onPress={() => setSelectedId(article.id)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
          <View style={[styles.art, { backgroundColor: article.accent }]}><Ionicons name="newspaper-outline" size={44} color="rgba(255,255,255,0.85)" /></View>
          <View style={styles.body}><Badge label={article.category} /><Text style={styles.title}>{article.title}</Text><Text style={styles.meta}>{article.readMinutes} menit baca</Text></View>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
  lead: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, marginBottom: spacing.lg },
  card: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  art: { height: 138, alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.md, gap: spacing.xs },
  article: { gap: spacing.sm },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 17, lineHeight: 23 },
  meta: { color: colors.subtle, fontFamily: fonts.regular, fontSize: 11 },
  paragraph: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22 },
});
