import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, spacing } from '../design-system/theme';
import { IconButton } from './controls';

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

export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? <Pressable onPress={onAction} hitSlop={8}><Text style={styles.sectionAction}>{actionLabel}</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  screenContent: { paddingHorizontal: spacing.md, paddingBottom: 120, backgroundColor: colors.canvas },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  headerSlot: { minWidth: 48, flexDirection: 'row', alignItems: 'center' },
  headerRight: { justifyContent: 'flex-end' },
  headerTitle: { flex: 1, color: colors.text, fontFamily: fonts.bold, fontSize: 18, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm, paddingHorizontal: spacing.xxs },
  sectionTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 16 },
  sectionAction: { color: colors.live, backgroundColor: '#163C22', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7, fontFamily: fonts.semibold, fontSize: 11 },
});
