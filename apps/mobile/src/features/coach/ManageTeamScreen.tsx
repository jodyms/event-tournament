import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Badge, EmptyState, PrimaryButton, Screen, SegmentedTabs, Sheet, TeamCrest, TextField } from '../../components';
import { colors, fonts, radius, spacing } from '../../design-system/theme';
import type { Player, SubmissionStatus } from '../../domain/models';
import type { RootStackParamList } from '../../navigation/types';
import { getApiErrorMessage } from '../../services/api/client';
import { getCoachSetup, submitCoachNames, submitJerseys, submitPlayer } from '../../services/api/tournament';

type SheetKind = 'coaches' | 'jerseys' | 'player' | null;
type SetupSection = Exclude<SheetKind, null>;
type Setup = Awaited<ReturnType<typeof getCoachSetup>>;

const statusLabel: Record<SubmissionStatus, string> = { NOT_STARTED: 'Belum mulai', PENDING: 'Menunggu tinjauan', APPROVED: 'Disetujui', REJECTED: 'Perlu revisi' };

export function ManageTeamScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ManageTeam'>>();
  const teamId = route.params.teamId;
  const client = useQueryClient();
  const setupQuery = useQuery({ queryKey: ['coach', 'team', teamId, 'setup'], queryFn: () => getCoachSetup(teamId) });
  const [tab, setTab] = useState<'Detail' | 'Pemain'>('Detail');
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [submitted, setSubmitted] = useState<Partial<Record<SetupSection, SubmissionStatus>>>({});
  const setup = setupQuery.data;
  const markPending = (section: SetupSection) => {
    setSubmitted((current) => ({ ...current, [section]: 'PENDING' }));
    void client.invalidateQueries({ queryKey: ['coach', 'team', teamId, 'setup'] });
    void client.invalidateQueries({ queryKey: ['team', teamId] });
  };
  if (setupQuery.isLoading) return <Screen><AppHeader onBack={() => navigation.goBack()} /><EmptyState title="Memuat tim" message="Data pengaturan tim sedang diambil." /></Screen>;
  if (setupQuery.isError || !setup) return <Screen><AppHeader onBack={() => navigation.goBack()} /><EmptyState title="Tim tidak tersedia" message={getApiErrorMessage(setupQuery.error)} action={<PrimaryButton label="Coba lagi" onPress={() => void setupQuery.refetch()} />} /></Screen>;
  const team = setup.team;
  const statuses = {
    coaches: submitted.coaches ?? setup.setup.coachNames.status,
    jerseys: submitted.jerseys ?? setup.setup.jersey.status,
    player: submitted.player ?? setup.setup.players.status,
  };
  return (
    <Screen>
      <AppHeader onBack={() => navigation.goBack()} />
      <LinearGradient colors={[team.accent, '#152017', colors.canvas]} style={styles.hero}><TeamCrest team={team} size={72} /><Text style={styles.teamName}>{team.name}</Text><Text style={styles.group}>{team.age} · {team.group}</Text></LinearGradient>
      <SegmentedTabs options={['Detail', 'Pemain'] as const} value={tab} onChange={setTab} />
      {tab === 'Detail' ? <DetailTab statuses={statuses} setup={setup} onSheet={setSheet} /> : <PlayersTab players={setup.players} onAdd={() => setSheet('player')} />}
      {sheet === 'coaches' ? <CoachSheet teamId={team.id} draft={setup.draft.coachNames} onClose={() => setSheet(null)} onSubmitted={() => markPending('coaches')} /> : null}
      {sheet === 'jerseys' ? <JerseySheet teamId={team.id} draft={setup.draft} official={setup.officialJerseys} onClose={() => setSheet(null)} onSubmitted={() => markPending('jerseys')} /> : null}
      {sheet === 'player' ? <PlayerSheet onClose={() => setSheet(null)} teamId={team.id} players={setup.players} onSubmitted={() => markPending('player')} /> : null}
    </Screen>
  );
}

function DetailTab({ statuses, setup, onSheet }: { statuses: Record<SetupSection, SubmissionStatus>; setup: Setup; onSheet: (kind: SetupSection) => void }) {
  const approved = Object.values(statuses).filter((status) => status === 'APPROVED').length;
  const percentage = Math.round((approved / 3) * 100);
  return (
    <View style={styles.detailWrap}>
      <View style={styles.setupCard}>
        <View style={styles.setupTop}><View><Text style={styles.cardTitle}>Pengaturan tim</Text><Text style={styles.setupCopy}>{approved} dari 3 disetujui</Text></View><Badge label={`${percentage}%`} /></View>
        <View style={styles.progressTrack}><View style={[styles.progressBar, { width: `${percentage}%` }]} /></View>
        <TaskRow icon="shield-checkmark-outline" label="Konfirmasi nama pelatih" status={statuses.coaches} reason={setup.setup.coachNames.reason} onPress={() => onSheet('coaches')} />
        <TaskRow icon="shirt-outline" label="Warna jersey" status={statuses.jerseys} reason={setup.setup.jersey.reason} onPress={() => onSheet('jerseys')} />
        <TaskRow icon="people-outline" label="Daftarkan pemain" status={statuses.player} reason={setup.setup.players.reason} onPress={() => onSheet('player')} />
      </View>
      <View style={styles.overview}>
        <Text style={styles.cardTitle}>Ringkasan skuad</Text>
        <Metric label="Batas skuad" value={`${setup.squad.max}`} />
        <Metric label="Pemain disetujui" value={`${setup.squad.approved}`} />
        <Metric label="Menunggu tinjauan" value={`${setup.squad.pending}`} />
        <Metric label="Slot tersisa" value={`${setup.squad.remaining}`} />
      </View>
    </View>
  );
}

function TaskRow({ icon, label, status, reason, onPress }: { icon: 'shield-checkmark-outline' | 'shirt-outline' | 'people-outline'; label: string; status: SubmissionStatus; reason?: string; onPress: () => void }) {
  const tone = status === 'APPROVED' ? 'brand' : status === 'REJECTED' ? 'error' : 'muted';
  const iconByStatus = status === 'APPROVED' ? 'checkmark-circle' : status === 'PENDING' ? 'time-outline' : status === 'REJECTED' ? 'alert-circle-outline' : icon;
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.task, pressed && styles.pressed]}><View style={styles.taskIcon}><Ionicons name={iconByStatus} size={21} color={status === 'REJECTED' ? '#FF6B70' : colors.brand} /></View><View style={styles.taskCopy}><Text style={styles.taskText}>{label}</Text>{reason ? <Text style={styles.reason}>{reason}</Text> : null}</View><Badge label={statusLabel[status]} tone={tone} /><Ionicons name="chevron-forward" size={20} color={colors.muted} /></Pressable>;
}

function Metric({ label, value }: { label: string; value: string }) { return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>; }

function PlayersTab({ players, onAdd }: { players: Player[]; onAdd: () => void }) {
  return (
    <View style={styles.playersWrap}>
      <PrimaryButton label="Ajukan pemain" icon="add" onPress={onAdd} />
      {players.length ? <View style={styles.playerList}>{players.map((player) => <View key={player.id} style={styles.player}><View style={styles.playerNumber}><Text style={styles.numberText}>{player.jerseyNumber}</Text></View><View style={styles.flex}><Text style={styles.playerName}>{player.name}</Text><Text style={styles.playerPosition}>{player.position}</Text>{player.rejectionReason ? <Text style={styles.reason}>{player.rejectionReason}</Text> : null}</View><Badge label={player.status === 'REJECTED' ? 'Perlu revisi' : player.status === 'PENDING' ? 'Menunggu' : 'Disetujui'} tone={player.status === 'REJECTED' ? 'error' : player.status === 'PENDING' ? 'muted' : 'brand'} /></View>)}</View> : <EmptyState title="Belum ada pemain" message="Pendaftaran pemain dikirim untuk ditinjau admin." />}
    </View>
  );
}

function CoachSheet({ teamId, draft, onClose, onSubmitted }: { teamId: string; draft: string[]; onClose: () => void; onSubmitted: () => void }) {
  const [names, setNames] = useState(draft.join('\n'));
  const [error, setError] = useState('');
  const mutation = useMutation({ mutationFn: (values: string[]) => submitCoachNames(teamId, values), onSuccess: () => { onSubmitted(); onClose(); }, onError: (cause) => setError(getApiErrorMessage(cause)) });
  return <Sheet visible title="Nama pelatih" onClose={onClose}><View style={styles.sheetContent}><Text style={styles.sheetCopy}>Satu nama per baris. Pengiriman menunggu tinjauan admin.</Text><TextField multiline placeholder="mis. Jordan Coach" value={names} onChangeText={setNames} error={error} /><PrimaryButton disabled={mutation.isPending} label={mutation.isPending ? 'Mengirim…' : 'Kirim untuk ditinjau'} onPress={() => { const values = names.split('\n').map((name) => name.trim()).filter(Boolean); if (!values.length) return setError('Isi minimal satu nama pelatih.'); mutation.mutate(values); }} /></View></Sheet>;
}

function JerseySheet({ teamId, draft, official, onClose, onSubmitted }: { teamId: string; draft: { home: string; away: string }; official?: { home: string; away: string }; onClose: () => void; onSubmitted: () => void }) {
  const [home, setHome] = useState(draft.home);
  const [away, setAway] = useState(draft.away);
  const [error, setError] = useState('');
  const mutation = useMutation({ mutationFn: () => submitJerseys(teamId, { home: home.trim(), away: away.trim() }), onSuccess: () => { onSubmitted(); onClose(); }, onError: (cause) => setError(getApiErrorMessage(cause)) });
  return <Sheet visible title="Warna jersey" onClose={onClose}><View style={styles.sheetContent}><Text style={styles.sheetCopy}>{official ? `Warna resmi saat ini: kandang ${official.home}, tandang ${official.away}. ` : ''}Pengajuan berstatus menunggu sampai disetujui.</Text><TextField label="Jersey kandang" placeholder="mis. Hijau" value={home} onChangeText={setHome} /><TextField label="Jersey tandang" placeholder="mis. Putih" value={away} onChangeText={setAway} error={error} /><PrimaryButton disabled={mutation.isPending} label={mutation.isPending ? 'Mengirim…' : 'Kirim untuk ditinjau'} onPress={() => { if (!home.trim() || !away.trim()) return setError('Isi warna jersey kandang dan tandang.'); mutation.mutate(); }} /></View></Sheet>;
}

function PlayerSheet({ onClose, teamId, players, onSubmitted }: { onClose: () => void; teamId: string; players: Player[]; onSubmitted: () => void }) {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('Gelandang');
  const [number, setNumber] = useState('');
  const [error, setError] = useState('');
  const mutation = useMutation({ mutationFn: (player: { name: string; position: string; jerseyNumber: number }) => submitPlayer(teamId, player), onSuccess: () => { onSubmitted(); onClose(); }, onError: (cause) => setError(getApiErrorMessage(cause)) });
  const save = () => {
    const jerseyNumber = Number(number);
    if (!name.trim() || !position.trim() || !Number.isInteger(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99) return setError('Isi nama, posisi, dan nomor punggung 1–99.');
    if (players.some((player) => player.jerseyNumber === jerseyNumber)) return setError('Nomor punggung tersebut sudah digunakan.');
    mutation.mutate({ name: name.trim(), position: position.trim(), jerseyNumber });
  };
  return <Sheet visible title="Ajukan pemain" onClose={onClose}><View style={styles.sheetContent}><Text style={styles.sheetCopy}>Pendaftaran dikirim untuk ditinjau. Server yang memeriksa batas skuad dan nomor punggung.</Text><TextField label="Nama pemain" placeholder="Nama lengkap" value={name} onChangeText={setName} /><TextField label="Posisi" placeholder="mis. Gelandang" value={position} onChangeText={setPosition} /><TextField label="Nomor punggung" placeholder="1–99" keyboardType="number-pad" value={number} onChangeText={setNumber} error={error} /><PrimaryButton disabled={mutation.isPending} label={mutation.isPending ? 'Mengirim…' : 'Kirim pemain'} onPress={save} /></View></Sheet>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.72 },
  hero: { height: 206, marginTop: -8, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, overflow: 'hidden' },
  teamName: { color: colors.text, fontFamily: fonts.bold, fontSize: 25 },
  group: { color: '#D1D6D4', fontFamily: fonts.medium, fontSize: 13 },
  detailWrap: { gap: spacing.md },
  setupCard: { borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  setupTop: { padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  setupCopy: { color: colors.subtle, fontFamily: fonts.regular, fontSize: 11, marginTop: 5 },
  progressTrack: { height: 6, marginHorizontal: spacing.md, marginBottom: spacing.sm, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: colors.surfaceRaised },
  progressBar: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.brand },
  task: { minHeight: 72, paddingHorizontal: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  taskIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  taskCopy: { flex: 1 },
  taskText: { color: colors.text, fontFamily: fonts.medium, fontSize: 13 },
  reason: { color: '#FFB1B5', fontFamily: fonts.regular, fontSize: 10, marginTop: 3 },
  overview: { borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  metric: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  metricLabel: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13 },
  metricValue: { color: colors.text, fontFamily: fonts.bold, fontSize: 13 },
  playersWrap: { gap: spacing.lg },
  playerList: { gap: spacing.sm },
  player: { minHeight: 70, padding: spacing.sm, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  playerNumber: { width: 38, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.successSurface },
  numberText: { color: colors.brand, fontFamily: fonts.bold, fontSize: 15 },
  playerName: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
  playerPosition: { color: colors.subtle, fontFamily: fonts.regular, fontSize: 11, marginTop: 3 },
  sheetContent: { gap: spacing.md, paddingBottom: spacing.lg },
  sheetCopy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
});
