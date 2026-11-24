import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Sheet, Screen } from '../../components/ui';
import { colors, fonts, radius, spacing } from '../../design-system/theme';
import type { RootStackParamList } from '../../navigation/types';
import { getAgeGroups, getStages } from '../../services/api/tournament';

export function CompetitionScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const ageGroupsQuery = useQuery({ queryKey: ['ageGroups', 'current'], queryFn: () => getAgeGroups() });
  const ageGroups = ageGroupsQuery.data ?? [];
  const [ageGroupId, setAgeGroupId] = useState<string | null>(null);
  const selectedAge = ageGroups.find((item) => item.id === ageGroupId) ?? ageGroups[0];
  const stagesQuery = useQuery({ queryKey: ['stages', selectedAge?.id], queryFn: () => getStages(selectedAge!.id), enabled: Boolean(selectedAge) });
  const stages = stagesQuery.data ?? [];
  const [stageId, setStageId] = useState<string | null>(null);
  const selectedStage = stages.find((item) => item.id === stageId) ?? stages[0];
  const [selecting, setSelecting] = useState<'age' | 'group' | null>(null);
  const age = selectedAge?.name ?? 'Loading age groups…';
  const group = selectedStage?.name ?? 'Loading groups…';
  return (
    <Screen>
      <AppHeader title="Competition" onBack={() => navigation.goBack()} />
      <Text style={styles.title}>Find your competition</Text>
      <Text style={styles.copy}>Choose an age division, then select a group or knockout stage.</Text>
      <View style={styles.flow}>
        <SelectionCard label="AGE GROUP" value={age} icon="people-outline" onPress={() => setSelecting('age')} />
        <View style={styles.connector}><Ionicons name="arrow-down" color={colors.brand} size={20} /></View>
        <SelectionCard label="STAGE / GROUP" value={group} icon="trophy-outline" onPress={() => setSelecting('group')} />
      </View>
      <Pressable disabled={!selectedAge || !selectedStage} onPress={() => navigation.navigate('Group', { age, group, stageId: selectedStage?.id })} style={({ pressed }) => [styles.openGroup, pressed && styles.pressed]}>
        <View style={styles.openIcon}><Ionicons name="stats-chart-outline" size={28} color={colors.brand} /></View>
        <View style={styles.flex}><Text style={styles.openTitle}>Open standings & matches</Text><Text style={styles.openText}>View the table and fixtures for {group}.</Text></View>
        <Ionicons name="arrow-forward" size={24} color={colors.brand} />
      </Pressable>
      <View style={styles.note}><Ionicons name="information-circle-outline" color={colors.muted} size={18} /><Text style={styles.noteText}>Standings are updated from the official competition feed.</Text></View>
      <Sheet visible={selecting !== null} title={selecting === 'age' ? 'Select age group' : 'Select stage / group'} onClose={() => setSelecting(null)}>
        <View style={styles.sheetList}>
          {(selecting === 'age' ? ageGroups : stages).map((item) => (
            <Pressable key={item.id} onPress={() => { if (selecting === 'age') { setAgeGroupId(item.id); setStageId(null); } else setStageId(item.id); setSelecting(null); }} style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
              <Text style={styles.optionText}>{item.name}</Text><Ionicons name={(selecting === 'age' ? selectedAge?.id === item.id : selectedStage?.id === item.id) ? 'checkmark-circle' : 'chevron-forward'} color={(selecting === 'age' ? selectedAge?.id === item.id : selectedStage?.id === item.id) ? colors.brand : colors.muted} size={23} />
            </Pressable>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

function SelectionCard({ label, value, icon, onPress }: { label: string; value: string; icon: 'people-outline' | 'trophy-outline'; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.selection, pressed && styles.pressed]}><View style={styles.selectionIcon}><Ionicons name={icon} size={25} color={colors.brand} /></View><View style={styles.flex}><Text style={styles.selectionLabel}>{label}</Text><Text style={styles.selectionValue}>{value}</Text></View><Ionicons name="chevron-down" size={22} color={colors.muted} /></Pressable>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.72 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 24, marginTop: spacing.xl },
  copy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, marginTop: spacing.xs },
  flow: { marginTop: spacing.xxl },
  connector: { height: 44, alignItems: 'center', justifyContent: 'center' },
  selection: { minHeight: 88, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  selectionIcon: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.successSurface, alignItems: 'center', justifyContent: 'center' },
  selectionLabel: { color: colors.subtle, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.8 },
  selectionValue: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, marginTop: 4 },
  openGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, marginTop: spacing.xxl, borderRadius: radius.lg, backgroundColor: '#10261A', borderWidth: 1, borderColor: '#1D7040' },
  openIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  openTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  openText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, marginTop: 4 },
  note: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xl, paddingHorizontal: spacing.xs },
  noteText: { flex: 1, color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  sheetList: { gap: spacing.sm, paddingBottom: spacing.lg },
  option: { minHeight: 58, borderRadius: radius.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceRaised },
  optionText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
});
