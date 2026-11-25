import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../design-system/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function IconButton({ icon, onPress, label, plain = false }: { icon: IconName; onPress: () => void; label: string; plain?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={onPress} style={({ pressed }) => [styles.iconButton, plain && styles.iconButtonPlain, pressed && styles.pressed]}>
      <Ionicons name={icon} size={24} color={colors.text} />
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress, icon, disabled = false, compact = false }: { label: string; onPress: () => void; icon?: IconName; disabled?: boolean; compact?: boolean }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primaryButton, compact && styles.compactButton, (pressed || disabled) && styles.buttonDim]}>
      {icon ? <Ionicons name={icon} color={colors.text} size={19} /> : null}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function TextField({ label, error, ...props }: ComponentProps<typeof TextInput> & { label?: string; error?: string }) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        accessibilityLabel={label ?? props.placeholder}
        placeholderTextColor={colors.muted}
        selectionColor={colors.brand}
        {...props}
        style={[styles.input, props.multiline && styles.inputMultiline, props.style]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function Badge({ label, tone = 'brand' }: { label: string; tone?: 'brand' | 'live' | 'muted' | 'error' }) {
  const palette = {
    brand: [colors.successSurface, colors.brand],
    live: [colors.live, colors.canvas],
    muted: [colors.surfaceRaised, colors.muted],
    error: ['#3B171C', '#FF6B70'],
  }[tone];
  return <View style={[styles.badge, { backgroundColor: palette[0] }]}><Text style={[styles.badgeText, { color: palette[1] }]}>{label}</Text></View>;
}

export function SegmentedTabs<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (value: T) => void }) {
  return (
    <View accessibilityRole="tablist" style={styles.tabs}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} key={option} onPress={() => onChange(option)} style={[styles.tab, active && styles.tabActive]}>
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
  iconButton: { width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  iconButtonPlain: { backgroundColor: 'transparent', borderColor: 'transparent' },
  primaryButton: { minHeight: 50, paddingHorizontal: spacing.lg, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs, backgroundColor: colors.brand },
  compactButton: { minHeight: 38, alignSelf: 'flex-start', paddingHorizontal: spacing.md },
  primaryButtonText: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  buttonDim: { opacity: 0.55 },
  fieldWrap: { gap: spacing.xs },
  fieldLabel: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13 },
  input: { minHeight: 54, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderInput, backgroundColor: colors.input, color: colors.text, fontFamily: fonts.regular, fontSize: 15, paddingHorizontal: spacing.md },
  inputMultiline: { minHeight: 94, paddingTop: spacing.md, textAlignVertical: 'top' },
  fieldError: { color: colors.error, fontFamily: fonts.regular, fontSize: 12 },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontFamily: fonts.bold, fontSize: 10 },
  tabs: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: colors.muted, marginVertical: spacing.lg },
  tab: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -2 },
  tabActive: { borderBottomColor: colors.brand },
  tabText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 14 },
  tabTextActive: { color: colors.text, fontFamily: fonts.bold },
});
