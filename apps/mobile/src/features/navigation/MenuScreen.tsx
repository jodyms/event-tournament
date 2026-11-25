import { useState } from 'react';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Screen } from '../../components';
import { colors, fonts, radius, spacing } from '../../design-system/theme';
import type { RootStackParamList } from '../../navigation/types';
import { isDemoMode } from '../../services/api/mode';
import { useAppStore } from '../../store/appStore';

export function MenuScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const session = useAppStore((state) => state.session);
  const logout = useAppStore((state) => state.logout);
  const canCoach = session?.user.roles.includes('COACH');
  const [confirming, setConfirming] = useState(false);
  return (
    <Screen>
      <AppHeader title="Menu" onBack={() => navigation.goBack()} />
      <View style={styles.profile}><View style={styles.avatar}><Text style={styles.avatarText}>{session?.user.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</Text></View><View><Text style={styles.name}>{session?.user.name}</Text><Text style={styles.email}>{session?.user.email}</Text></View></View>
      <View style={styles.menu}>{<MenuItem icon="heart-outline" label="Favorite Team" onPress={() => navigation.navigate('Favorites')} />}{canCoach ? <MenuItem icon="football-outline" label="Coach Dashboard" onPress={() => navigation.navigate('CoachDashboard')} /> : null}<MenuItem icon="notifications-outline" label="Notifications" onPress={() => navigation.navigate('Content', { kind: 'notifications' })} /><MenuItem icon="log-out-outline" label="Logout" destructive onPress={() => setConfirming(true)} /></View>
      <Text style={styles.version}>{isDemoMode() ? 'Kickzone · v1.0.0 (demo)' : 'Kickzone · v1.0.0'}</Text>
      <Modal visible={confirming} transparent animationType="fade" onRequestClose={() => setConfirming(false)}>
        <View style={styles.confirmRoot}>
          <Pressable accessibilityLabel="Batal" onPress={() => setConfirming(false)} style={styles.confirmBackdrop} />
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Keluar dari akun?</Text>
            <Text style={styles.confirmCopy}>Sesi di perangkat ini akan diakhiri.</Text>
            <View style={styles.confirmActions}>
              <Pressable accessibilityRole="button" onPress={() => setConfirming(false)} style={styles.confirmCancel}><Text style={styles.confirmCancelText}>Batal</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => { setConfirming(false); void logout(); }} style={styles.confirmLeave}><Text style={styles.confirmLeaveText}>Keluar</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function MenuItem({ icon, label, onPress, destructive = false }: { icon: 'heart-outline' | 'football-outline' | 'notifications-outline' | 'log-out-outline'; label: string; onPress: () => void; destructive?: boolean }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.item, pressed && styles.pressed]}><Ionicons name={icon} size={22} color={destructive ? '#FF6B70' : colors.brand} /><Text style={[styles.itemText, destructive && styles.destructive]}>{label}</Text><Ionicons name="chevron-forward" size={21} color={colors.muted} /></Pressable>; }

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginTop: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  avatarText: { color: colors.canvas, fontFamily: fonts.bold, fontSize: 15 },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  email: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, marginTop: 3 },
  menu: { marginTop: spacing.xl, gap: spacing.sm },
  item: { minHeight: 60, paddingHorizontal: spacing.md, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  itemText: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
  destructive: { color: '#FF6B70' },
  pressed: { opacity: 0.72 },
  version: { color: colors.subtle, fontFamily: fonts.regular, fontSize: 11, textAlign: 'center', marginTop: 'auto', paddingTop: spacing.xxl },
  confirmRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  confirmBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.68)' },
  confirmCard: { width: '100%', maxWidth: 360, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm },
  confirmTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 18 },
  confirmCopy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  confirmCancel: { minHeight: 42, paddingHorizontal: spacing.md, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  confirmCancelText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
  confirmLeave: { minHeight: 42, paddingHorizontal: spacing.lg, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF6B70' },
  confirmLeaveText: { color: colors.canvas, fontFamily: fonts.bold, fontSize: 14 },
});
