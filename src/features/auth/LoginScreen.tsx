import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, TextField } from '../../components/ui';
import { colors, fonts, radius, spacing } from '../../design-system/theme';
import { useAppStore } from '../../store/appStore';
import { loginSchema, type LoginValues } from './schemas';

export function LoginScreen() {
  const login = useAppStore((state) => state.login);
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit, setError, formState: { errors } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'coach@kickzone.app', password: 'password' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setSubmitting(true);
    try {
      if (password === 'invalid') {
        setError('password', { message: 'Email atau password tidak cocok' });
        return;
      }
      await login(email);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={['#B8D1DA', '#4B6E67', '#063829']} style={styles.hero}>
            <Ionicons name="football" size={104} color="rgba(255,255,255,0.88)" />
            <Text style={styles.heroEyebrow}>TYC FOOTBALL</Text>
            <Text style={styles.heroTitle}>Play. Follow. Belong.</Text>
          </LinearGradient>
          <View style={styles.formCard}>
            <View style={styles.brandMark}><Ionicons name="football-outline" size={28} color={colors.brand} /></View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Login untuk mengikuti turnamen dan mengelola tim Anda.</Text>
            <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (
              <TextField autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Email" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.email?.message} />
            )} />
            <Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => (
              <TextField secureTextEntry autoComplete="password" placeholder="Password" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.password?.message} />
            )} />
            <PrimaryButton label={submitting ? 'Logging in…' : 'Login'} disabled={submitting} onPress={onSubmit} />
            <Text style={styles.demo}>Demo: gunakan email valid dan password apa saja (min. 6 karakter).</Text>
            <View style={styles.legalRow}>
              <Text style={styles.legal}>I agree to </Text><Pressable accessibilityRole="link"><Text style={styles.link}>Terms of Service</Text></Pressable><Text style={styles.legal}> and </Text><Pressable accessibilityRole="link"><Text style={styles.link}>Privacy Policy</Text></Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  content: { flexGrow: 1, justifyContent: 'flex-end', backgroundColor: colors.canvas },
  hero: { minHeight: 330, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderBottomLeftRadius: 80, borderBottomRightRadius: 80 },
  heroEyebrow: { color: colors.live, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 2 },
  heroTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 23 },
  formCard: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  brandMark: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.successSurface, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 24, textAlign: 'center' },
  subtitle: { color: colors.muted, fontFamily: fonts.regular, lineHeight: 20, textAlign: 'center', marginBottom: spacing.xs },
  demo: { color: colors.subtle, fontFamily: fonts.regular, fontSize: 11, textAlign: 'center' },
  legalRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  legal: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12 },
  link: { color: colors.brand, fontFamily: fonts.regular, fontSize: 12 },
});
