import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { eq, inArray, like } from 'drizzle-orm';
import { calculateFootballStandings, type FinishedScore, timeRangesOverlap } from '../lib/domain/competition';
import { scoresFromGoals } from '../lib/domain/tournament-status';
import { db, pool } from './client';
import { assertRoundRobin, mulberry32, pitchSlot, roundRobin, youthGoals } from './demo-schedule';
import {
  ageGroups, auditLogs, certificateTemplates, certificates, coachNameSubmissions, coachTeamAssignments, favorites, jerseySubmissions,
  jobOutbox, matchEvents, matches, media, news, notifications, playerSubmissions, playerTeamHistory, players, pitches, roles, sports,
  stages, standings, teamStatistics, teams, tournamentCertificates, tournamentRules, tournaments, userRoles, users, venues,
} from './schema';
import { seedFoundation } from './seed';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
type Approval = 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
type PlayerLite = { id: string; teamId: string; name: string; jerseyNumber: number; approvalStatus: Approval };
type EventDraft = { eventType: string; teamId: string; playerId: string | null; minute: number; sortOrder: number };
type PlannedMatch = { key: string; row: typeof matches.$inferInsert; events: EventDraft[] };
type SeedTeam = { id: string; name: string; tournamentId: string; ageGroupId: string; stageId: string | null };

const DEMO_SLUGS = ['tyc-jakarta-2026', 'tyc-bandung-2025', 'tyc-surabaya-2027', 'festival-mini-soccer-depok-2026'];
const CLUBS = ['SSB Ragunan', 'ASIOP', 'Jakarta Football Academy', 'Persija Muda', 'Batavia FC', 'Tunas Kelapa Gading', 'Macan Kemayoran', 'Garuda Pondok Indah', 'Elang Cilandak', 'Bintang Tebet', 'Satria Menteng', 'Rajawali Rawamangun'];
const AGES = [
  { name: 'U-10', maxSquadSize: 16, sortOrder: 1 },
  { name: 'U-12', maxSquadSize: 18, sortOrder: 2 },
  { name: 'U-14', maxSquadSize: 20, sortOrder: 3 },
  { name: 'U-16', maxSquadSize: 22, sortOrder: 4 },
];
const KITS = ['#C8102E|#FFFFFF', '#0033A0|#FFD100', '#111111|#F5F5F5', '#F36F21|#1B1B1B', '#0B6B3A|#FFFFFF', '#6C2BD9|#F4E04D', '#0E4D92|#E10600', '#1F7A4D|#F2C14E', '#7A1F2B|#E8E8E8', '#14532D|#86EFAC', '#1E3A8A|#F8FAFC', '#B45309|#111827'];
const FORMATION = ['Kiper', 'Bek', 'Bek', 'Bek', 'Bek', 'Gelandang', 'Gelandang', 'Gelandang', 'Penyerang', 'Penyerang', 'Gelandang', 'Bek', 'Gelandang', 'Penyerang', 'Gelandang', 'Penyerang'];
const REFEREES = ['Joko Susilo', 'Hendra Wijaya', 'Agus Salim', 'Bambang Purnomo', 'Dedi Kurnia', 'Yudi Hartono', 'Rudi Setiawan', 'Eko Prasetyo'];
const GIVEN = ['Adi', 'Bagas', 'Dimas', 'Farhan', 'Galih', 'Hafiz', 'Ilham', 'Jaka', 'Raka', 'Luthfi', 'Maulana', 'Naufal', 'Omar', 'Pandu', 'Rizky', 'Satria', 'Taufik', 'Umar', 'Vino', 'Wahyu', 'Yoga', 'Zaki', 'Arka', 'Bayu', 'Candra', 'Darma', 'Eko', 'Fajar', 'Gilang', 'Hanif', 'Irfan', 'Rafa', 'Dafa', 'Elzan', 'Farel', 'Saka'];
const FAMILY = ['Pratama', 'Saputra', 'Wijaya', 'Nugroho', 'Santoso', 'Kurniawan', 'Hidayat', 'Ramadhan', 'Setiawan', 'Firmansyah', 'Mahendra', 'Kusuma', 'Wibowo', 'Hartono', 'Gunawan', 'Putra', 'Permana', 'Utomo', 'Prasetyo', 'Siregar', 'Nasution', 'Simanjuntak', 'Halim', 'Anggara', 'Budiman', 'Cahyono', 'Darmawan', 'Effendi', 'Fadillah', 'Hermawan'];
const LIVE_SCRIPTS = [
  { minute: 23, home: [14], away: [] as number[] },
  { minute: 31, home: [9], away: [27] },
  { minute: 18, home: [] as number[], away: [11] },
  { minute: 44, home: [6, 33], away: [21] },
];

const names = { n: 0 };
const refereeCursor = { n: 0 };

function nextName() {
  const name = `${GIVEN[names.n % GIVEN.length]} ${FAMILY[Math.floor(names.n / GIVEN.length) % FAMILY.length]}`;
  names.n += 1;
  return name;
}

function kit(index: number) {
  const [home, away] = (KITS[index % KITS.length] ?? '#111111|#FFFFFF').split('|');
  return { home: { color: home ?? '#111111' }, away: { color: away ?? '#FFFFFF' } };
}

function jakartaDate(dayOffset: number, hour: number, minute = 0) {
  const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, (day ?? 1) + dayOffset, hour - 7, minute, 0));
}

function fixedJakarta(isoDate: string, hour: number, minute = 0) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, day ?? 1, hour - 7, minute, 0));
}

function nextReferee() {
  const name = REFEREES[refereeCursor.n % REFEREES.length] ?? 'Joko Susilo';
  refereeCursor.n += 1;
  return name;
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === (entry.startsWith('file:') ? entry : pathToFileURL(entry).href);
}

async function inChunks<T>(rows: T[], size: number, write: (chunk: T[]) => Promise<void>) {
  for (let offset = 0; offset < rows.length; offset += size) {
    const chunk = rows.slice(offset, offset + size);
    if (chunk.length) await write(chunk);
  }
}

function approvedOutfield(squad: PlayerLite[]) {
  return squad.filter((player) => player.approvalStatus === 'APPROVED' && player.jerseyNumber !== 1);
}

function pickScorer(squad: PlayerLite[], rng: () => number) {
  const outfield = approvedOutfield(squad);
  if (!outfield.length) return null;
  const stars = outfield.filter((player) => player.jerseyNumber === 9 || player.jerseyNumber === 10 || player.jerseyNumber === 11);
  const bag = rng() < 0.6 && stars.length ? stars : outfield;
  return bag[Math.floor(rng() * bag.length)] ?? null;
}

function cardPlayer(squad: PlayerLite[], rng: () => number) {
  const defenders = approvedOutfield(squad).filter((player) => player.jerseyNumber >= 2 && player.jerseyNumber <= 5);
  const bag = defenders.length ? defenders : approvedOutfield(squad);
  if (!bag.length) return null;
  return bag[Math.floor(rng() * bag.length)] ?? null;
}

function orderEvents(events: EventDraft[]) {
  return events.sort((left, right) => left.minute - right.minute || left.eventType.localeCompare(right.eventType)).map((event, index) => ({ ...event, sortOrder: index }));
}

function goalDrafts(teamId: string, squad: PlayerLite[], minutes: number[], rng: () => number) {
  const drafts: EventDraft[] = [];
  for (const minute of minutes) {
    const scorer = pickScorer(squad, rng);
    if (!scorer) continue;
    drafts.push({ eventType: 'GOAL', teamId, playerId: scorer.id, minute, sortOrder: 0 });
  }
  return drafts;
}

function planMatch(input: {
  tournamentId: string; ageGroupId: string; stageId: string; homeTeamId: string; awayTeamId: string; pitchId: string; startsAt: Date;
  status: MatchStatus; playersByTeam: Map<string, PlayerLite[]>; rng: () => number; live?: { minute: number; home: number[]; away: number[] };
}): PlannedMatch {
  const home = input.playersByTeam.get(input.homeTeamId) ?? [];
  const away = input.playersByTeam.get(input.awayTeamId) ?? [];
  let events: EventDraft[] = [];
  let matchMinute = 0;
  if (input.status === 'FINISHED') {
    matchMinute = 50;
    const homeCount = youthGoals(input.rng);
    const awayCount = youthGoals(input.rng);
    const used = new Set<number>();
    const take = (count: number) => {
      const minutes: number[] = [];
      while (minutes.length < count) {
        const minute = 1 + Math.floor(input.rng() * 48);
        if (used.has(minute)) continue;
        used.add(minute);
        minutes.push(minute);
      }
      return minutes;
    };
    events = [...goalDrafts(input.homeTeamId, home, take(homeCount), input.rng), ...goalDrafts(input.awayTeamId, away, take(awayCount), input.rng)];
    if (input.rng() < 0.35) {
      const side = input.rng() < 0.5 ? home : away;
      const teamId = side === home ? input.homeTeamId : input.awayTeamId;
      const player = cardPlayer(side, input.rng);
      if (player) events.push({ eventType: 'YELLOW_CARD', teamId, playerId: player.id, minute: 8 + Math.floor(input.rng() * 35), sortOrder: 0 });
    }
  } else if (input.status === 'LIVE' && input.live) {
    matchMinute = input.live.minute;
    events = [...goalDrafts(input.homeTeamId, home, input.live.home, input.rng), ...goalDrafts(input.awayTeamId, away, input.live.away, input.rng)];
  }
  events = orderEvents(events);
  const score = scoresFromGoals(input.homeTeamId, input.awayTeamId, events.filter((event) => event.eventType === 'GOAL'));
  const key = `${input.homeTeamId}|${input.awayTeamId}|${input.startsAt.toISOString()}`;
  return {
    key,
    events,
    row: {
      tournamentId: input.tournamentId, ageGroupId: input.ageGroupId, stageId: input.stageId, homeTeamId: input.homeTeamId, awayTeamId: input.awayTeamId,
      pitchId: input.pitchId, startsAt: input.startsAt, status: input.status, homeScore: score.homeScore, awayScore: score.awayScore, matchMinute,
      refereeName: nextReferee(), scheduledDurationMinutes: 50, bufferMinutes: 10,
      version: input.status === 'FINISHED' ? 2 : 1, finalizedAt: input.status === 'FINISHED' ? new Date(input.startsAt.getTime() + 50 * 60_000) : null,
    },
  };
}

function assertPlayable(planned: PlannedMatch[]) {
  const open = planned.filter((match) => match.row.status === 'SCHEDULED' || match.row.status === 'LIVE');
  for (let left = 0; left < open.length; left += 1) {
    for (let right = left + 1; right < open.length; right += 1) {
      const a = open[left]?.row;
      const b = open[right]?.row;
      if (!a?.startsAt || !b?.startsAt) continue;
      const aEnd = new Date(a.startsAt.getTime() + ((a.scheduledDurationMinutes ?? 50) + (a.bufferMinutes ?? 10)) * 60_000);
      const bEnd = new Date(b.startsAt.getTime() + ((b.scheduledDurationMinutes ?? 50) + (b.bufferMinutes ?? 10)) * 60_000);
      const sharesPitch = Boolean(a.pitchId && a.pitchId === b.pitchId);
      const sharesTeam = [a.homeTeamId, a.awayTeamId].some((teamId) => teamId === b.homeTeamId || teamId === b.awayTeamId);
      if ((sharesPitch || sharesTeam) && timeRangesOverlap(a.startsAt, aEnd, b.startsAt, bEnd)) throw new Error(`Jadwal bentrok pada ${a.startsAt.toISOString()}.`);
    }
  }
  for (const match of planned) {
    if (match.row.status !== 'FINISHED' && match.row.status !== 'LIVE') continue;
    const score = scoresFromGoals(match.row.homeTeamId, match.row.awayTeamId, match.events.filter((event) => event.eventType === 'GOAL'));
    if (score.homeScore !== match.row.homeScore || score.awayScore !== match.row.awayScore) throw new Error('Skor tidak sama dengan jumlah gol.');
  }
}

async function clearDemo(tx: Tx) {
  const existing = await tx.select({ id: tournaments.id }).from(tournaments).where(inArray(tournaments.slug, DEMO_SLUGS));
  const tournamentIds = existing.map((row) => row.id);
  if (tournamentIds.length) {
    const teamIds = (await tx.select({ id: teams.id }).from(teams).where(inArray(teams.tournamentId, tournamentIds))).map((row) => row.id);
    const playerIds = teamIds.length ? (await tx.select({ id: players.id }).from(players).where(inArray(players.teamId, teamIds))).map((row) => row.id) : [];
    await tx.delete(certificates).where(inArray(certificates.tournamentId, tournamentIds));
    await tx.delete(media).where(inArray(media.tournamentId, tournamentIds));
    if (playerIds.length) {
      await tx.update(media).set({ highlightPlayerId: null }).where(inArray(media.highlightPlayerId, playerIds));
      await tx.delete(playerTeamHistory).where(inArray(playerTeamHistory.playerId, playerIds));
    }
    await tx.delete(news).where(inArray(news.tournamentId, tournamentIds));
    await tx.delete(matches).where(inArray(matches.tournamentId, tournamentIds));
    if (teamIds.length) {
      await tx.delete(playerTeamHistory).where(inArray(playerTeamHistory.toTeamId, teamIds));
      await tx.delete(playerTeamHistory).where(inArray(playerTeamHistory.fromTeamId, teamIds));
      await tx.delete(players).where(inArray(players.teamId, teamIds));
      await tx.delete(teams).where(inArray(teams.id, teamIds));
    }
    await tx.delete(tournaments).where(inArray(tournaments.id, tournamentIds));
  }
  await tx.delete(certificates).where(like(certificates.verificationCode, 'TYC-DEMO-%'));
  await tx.delete(certificateTemplates).where(like(certificateTemplates.name, 'TYC Demo%'));
  await tx.delete(auditLogs).where(like(auditLogs.action, 'seed.demo.%'));
  await tx.delete(jobOutbox).where(like(jobOutbox.type, 'seed.demo.%'));
}

async function ensureUser(tx: Tx, input: { email: string; displayName: string; passwordHash: string; status?: 'ACTIVE' | 'INACTIVE' }, roleIds: string[]) {
  await tx.insert(users).values({ email: input.email, displayName: input.displayName, passwordHash: input.passwordHash, status: input.status ?? 'ACTIVE' }).onConflictDoNothing();
  await tx.update(users).set({ displayName: input.displayName, passwordHash: input.passwordHash, status: input.status ?? 'ACTIVE', updatedAt: new Date() }).where(eq(users.email, input.email));
  const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (!user) throw new Error(`Akun ${input.email} gagal dibuat.`);
  for (const roleId of roleIds) await tx.insert(userRoles).values({ userId: user.id, roleId }).onConflictDoNothing();
  return user.id;
}

async function insertPlayers(tx: Tx, rows: (typeof players.$inferInsert)[]) {
  const created: PlayerLite[] = [];
  await inChunks(rows, 200, async (chunk) => {
    const inserted = await tx.insert(players).values(chunk).returning({ id: players.id, teamId: players.teamId, name: players.name, jerseyNumber: players.jerseyNumber, approvalStatus: players.approvalStatus });
    created.push(...inserted);
  });
  return created;
}

function squadRows(teamId: string, mode: 'full' | 'asiop' | 'empty' | 'eight' | 'bandung') {
  const rows: (typeof players.$inferInsert)[] = [];
  const push = (number: number, approvalStatus: Approval, status: 'ACTIVE' | 'INACTIVE' | 'TRANSFERRED' = 'ACTIVE') => {
    rows.push({ teamId, name: nextName(), position: FORMATION[(number - 1) % FORMATION.length] ?? 'Gelandang', jerseyNumber: number, approvalStatus, status });
  };
  if (mode === 'full') for (let number = 1; number <= 16; number += 1) push(number, 'APPROVED');
  if (mode === 'eight') for (let number = 1; number <= 8; number += 1) push(number, 'APPROVED');
  if (mode === 'bandung') for (let number = 1; number <= 14; number += 1) push(number, 'APPROVED', number === 14 ? 'INACTIVE' : 'ACTIVE');
  if (mode === 'asiop') {
    for (let number = 1; number <= 14; number += 1) push(number, 'APPROVED');
    push(15, 'PENDING');
    push(16, 'REJECTED');
  }
  return rows;
}

async function saveMatches(tx: Tx, planned: PlannedMatch[], actorId: string) {
  const ids = new Map<string, string>();
  await inChunks(planned, 80, async (chunk) => {
    const inserted = await tx.insert(matches).values(chunk.map((match) => match.row)).returning({ id: matches.id, homeTeamId: matches.homeTeamId, awayTeamId: matches.awayTeamId, startsAt: matches.startsAt });
    for (const row of inserted) ids.set(`${row.homeTeamId}|${row.awayTeamId}|${row.startsAt.toISOString()}`, row.id);
  });
  const eventRows: (typeof matchEvents.$inferInsert)[] = [];
  for (const match of planned) {
    const matchId = ids.get(match.key);
    if (!matchId) throw new Error('Pertandingan yang baru disimpan tidak ditemukan kembali.');
    for (const event of match.events) eventRows.push({ matchId, eventType: event.eventType, teamId: event.teamId, playerId: event.playerId, minute: event.minute, sortOrder: event.sortOrder, createdBy: actorId });
    match.key = matchId;
  }
  if (eventRows.length) await inChunks(eventRows, 200, async (chunk) => { await tx.insert(matchEvents).values(chunk); });
  return ids;
}

async function writeStandings(tx: Tx, stageId: string, teamIds: string[], finished: FinishedScore[]) {
  const calculated = calculateFootballStandings(finished);
  const seen = new Set(calculated.map((row) => row.teamId));
  const idle = teamIds.filter((teamId) => !seen.has(teamId)).map((teamId) => ({ teamId, position: 0, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 }));
  const table = [...calculated, ...idle].map((row, index) => ({ stageId, teamId: row.teamId, position: index + 1, played: row.played, wins: row.wins, draws: row.draws, losses: row.losses, goalsFor: row.goalsFor, goalsAgainst: row.goalsAgainst, goalDifference: row.goalDifference, points: row.points, calculatedAt: new Date() }));
  if (table.length) await tx.insert(standings).values(table);
  return table;
}

async function writeStatistics(tx: Tx, teamIds: string[], finished: { homeTeamId: string; awayTeamId: string; homeScore: number; awayScore: number }[]) {
  const rows = teamIds.map((teamId) => {
    const stats = finished.filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId).reduce((total, match) => {
      const home = match.homeTeamId === teamId;
      const goalsFor = home ? match.homeScore : match.awayScore;
      const goalsAgainst = home ? match.awayScore : match.homeScore;
      total.totalMatches += 1;
      total.goalsScored += goalsFor;
      total.goalsConceded += goalsAgainst;
      if (goalsFor > goalsAgainst) total.matchesWon += 1;
      else if (goalsFor === goalsAgainst) total.matchesDrawn += 1;
      else total.matchesLost += 1;
      return total;
    }, { totalMatches: 0, matchesWon: 0, matchesDrawn: 0, matchesLost: 0, goalsScored: 0, goalsConceded: 0 });
    return { teamId, ...stats, updatedAt: new Date() };
  });
  await inChunks(rows, 200, async (chunk) => { await tx.insert(teamStatistics).values(chunk); });
}

async function seedDemo(tx: Tx, adminId: string, passwordHash: string) {
  await clearDemo(tx);
  const roleRows = await tx.select().from(roles);
  const roleId = (code: string) => {
    const role = roleRows.find((row) => row.code === code);
    if (!role) throw new Error(`Peran ${code} belum ada. Jalankan npm run db:seed terlebih dahulu.`);
    return role.id;
  };
  const [football] = await tx.select().from(sports).where(eq(sports.code, 'FOOTBALL')).limit(1);
  if (!football) throw new Error('Olahraga Football belum ada.');
  const operatorId = await ensureUser(tx, { email: 'operator@tyc.local', displayName: 'Sari Wulandari', passwordHash }, [roleId('OPERATOR')]);
  const coachId = await ensureUser(tx, { email: 'coach@tyc.local', displayName: 'Andi Saputra', passwordHash }, [roleId('COACH'), roleId('USER')]);
  const fanId = await ensureUser(tx, { email: 'fan@tyc.local', displayName: 'Bima Pratama', passwordHash }, [roleId('USER')]);
  const extraCoaches = [
    ['coach.bambang@tyc.local', 'Bambang Wijaya'],
    ['coach.dewi@tyc.local', 'Dewi Lestari'],
    ['coach.rina@tyc.local', 'Rina Kartika'],
    ['coach.hendra@tyc.local', 'Hendra Kusuma'],
    ['coach.agus@tyc.local', 'Agus Salim'],
    ['coach.maya@tyc.local', 'Maya Anggraini'],
  ] as const;
  const extraCoachIds: string[] = [];
  for (const [email, displayName] of extraCoaches) extraCoachIds.push(await ensureUser(tx, { email, displayName, passwordHash }, [roleId('COACH')]));
  await ensureUser(tx, { email: 'arsip@tyc.local', displayName: 'Arsip Operator', passwordHash, status: 'INACTIVE' }, [roleId('OPERATOR')]);
  const demoUserIds = [operatorId, coachId, fanId, ...extraCoachIds];
  await tx.delete(notifications).where(inArray(notifications.userId, demoUserIds));

  const rng = mulberry32(20261125);
  const teamByName = new Map<string, SeedTeam>();
  const playersByTeam = new Map<string, PlayerLite[]>();
  const planned: PlannedMatch[] = [];
  let liveCursor = 0;

  const [jakarta] = await tx.insert(tournaments).values({
    sportId: football.id, name: 'Piala TYC Jakarta 2026', slug: 'tyc-jakarta-2026', status: 'PUBLISHED',
    startsAt: jakartaDate(-18, 8), endsAt: jakartaDate(21, 18),
    description: 'Turnamen sepak bola usia muda se-Jabodetabek. Babak grup berlangsung di lapangan latihan GBK, Stadion Soemantri Brodjonegoro, dan GOR Ciracas. Musim ini sedang berjalan: empat matchday grup sudah selesai dan matchday terakhir bergulir hari ini.',
  }).returning();
  if (!jakarta) throw new Error('Turnamen Jakarta gagal dibuat.');

  const jakartaPitches: string[] = [];
  const venuesJakarta = [
    { name: 'Lapangan Latihan GBK', address: 'Jl. Gelora, Tanah Abang, Jakarta Pusat', capacity: 800, mapUrl: 'https://maps.google.com/?q=Gelora+Bung+Karno+Jakarta', pitches: ['Pitch 1', 'Pitch 2', 'Pitch 3', 'Pitch 4'] },
    { name: 'Stadion Soemantri Brodjonegoro', address: 'Jl. Pemuda, Rawamangun, Jakarta Timur', capacity: 5000, mapUrl: 'https://maps.google.com/?q=Stadion+Soemantri+Brodjonegoro', pitches: ['Lapangan Utama', 'Lapangan 2'] },
    { name: 'GOR Ciracas', address: 'Jl. Raya Ciracas, Jakarta Timur', capacity: 1200, mapUrl: 'https://maps.google.com/?q=GOR+Ciracas', pitches: ['Court A', 'Court B'] },
  ];
  for (const venue of venuesJakarta) {
    const [created] = await tx.insert(venues).values({ tournamentId: jakarta.id, name: venue.name, address: venue.address, capacity: venue.capacity, mapUrl: venue.mapUrl, active: true }).returning();
    if (!created) throw new Error('Venue Jakarta gagal dibuat.');
    for (const name of venue.pitches) {
      const [pitch] = await tx.insert(pitches).values({ venueId: created.id, name, active: true }).returning();
      if (pitch) jakartaPitches.push(pitch.id);
    }
  }
  const [barnabas] = await tx.insert(venues).values({ tournamentId: jakarta.id, name: 'Lapangan Barnabas', address: 'Cempaka Putih, Jakarta Pusat', capacity: 200, active: false }).returning();
  if (barnabas) await tx.insert(pitches).values({ venueId: barnabas.id, name: 'Pitch Lama', active: false });
  await tx.insert(ageGroups).values({ tournamentId: jakarta.id, name: 'U-18', maxSquadSize: 23, sortOrder: 5, active: false });

  const groups: { ageName: string; ageGroupId: string; stageId: string; teamIds: string[] }[] = [];
  const semiStages: { ageGroupId: string; stageId: string; groupA: string; groupB: string }[] = [];
  let u12GroupA = '';
  const playerInserts: (typeof players.$inferInsert)[] = [];

  for (const age of AGES) {
    const [group] = await tx.insert(ageGroups).values({ tournamentId: jakarta.id, name: age.name, maxSquadSize: age.maxSquadSize, sortOrder: age.sortOrder, active: true }).returning();
    if (!group) throw new Error('Kelompok umur gagal dibuat.');
    const [groupA] = await tx.insert(stages).values({ ageGroupId: group.id, name: 'Grup A', type: 'GROUP', sortOrder: 0, published: true }).returning();
    const [groupB] = await tx.insert(stages).values({ ageGroupId: group.id, name: 'Grup B', type: 'GROUP', sortOrder: 1, published: true }).returning();
    const [semi] = await tx.insert(stages).values({ ageGroupId: group.id, name: 'Semifinal', type: 'KNOCKOUT', sortOrder: 2, published: true }).returning();
    await tx.insert(stages).values({ ageGroupId: group.id, name: 'Final', type: 'KNOCKOUT', sortOrder: 3, published: true });
    if (!groupA || !groupB || !semi) throw new Error('Stage Jakarta gagal dibuat.');
    if (age.name === 'U-12') u12GroupA = groupA.id;
    const buckets = { A: [] as string[], B: [] as string[] };
    for (let index = 0; index < CLUBS.length; index += 1) {
      const club = CLUBS[index] ?? 'SSB';
      const name = `${club} ${age.name}`;
      const stage = index < 6 ? groupA : groupB;
      const colors = kit(index);
      const bare = name === 'Satria Menteng U-16' || name === 'Rajawali Rawamangun U-16';
      const [team] = await tx.insert(teams).values({
        tournamentId: jakarta.id, ageGroupId: group.id, stageId: stage.id, name, active: true,
        ...(bare ? {} : { homeJersey: colors.home, awayJersey: colors.away }),
      }).returning();
      if (!team) throw new Error(`Tim ${name} gagal dibuat.`);
      teamByName.set(name, { id: team.id, name, tournamentId: jakarta.id, ageGroupId: group.id, stageId: stage.id });
      (index < 6 ? buckets.A : buckets.B).push(team.id);
      const mode = name === 'ASIOP U-12' ? 'asiop' : name === 'Rajawali Rawamangun U-16' ? 'empty' : 'full';
      if (mode !== 'empty') playerInserts.push(...squadRows(team.id, mode));
    }
    groups.push({ ageName: age.name, ageGroupId: group.id, stageId: groupA.id, teamIds: buckets.A }, { ageName: age.name, ageGroupId: group.id, stageId: groupB.id, teamIds: buckets.B });
    semiStages.push({ ageGroupId: group.id, stageId: semi.id, groupA: groupA.id, groupB: groupB.id });
  }

  const rajawali = teamByName.get('Rajawali Rawamangun U-16');
  if (rajawali) {
    for (let number = 1; number <= 6; number += 1) playerInserts.push({ teamId: rajawali.id, name: nextName(), position: FORMATION[number - 1] ?? 'Gelandang', jerseyNumber: number, approvalStatus: 'PENDING', status: 'ACTIVE' });
  }
  const createdPlayers = await insertPlayers(tx, playerInserts);
  for (const player of createdPlayers) {
    const list = playersByTeam.get(player.teamId) ?? [];
    list.push(player);
    playersByTeam.set(player.teamId, list);
  }

  const coachNameRows: (typeof coachNameSubmissions.$inferInsert)[] = [];
  for (const team of teamByName.values()) {
    if (team.name === 'Satria Menteng U-16' || team.name === 'Rajawali Rawamangun U-16') continue;
    coachNameRows.push({ teamId: team.id, submittedBy: coachId, coachName: nextName(), status: 'APPROVED', revision: 1, reviewedBy: adminId, reviewedAt: jakartaDate(-12, 9) });
  }
  const asiop = teamByName.get('ASIOP U-12');
  if (asiop) coachNameRows.push({ teamId: asiop.id, submittedBy: coachId, coachName: 'Andi Saputra', status: 'PENDING', revision: 2 });
  await tx.insert(coachNameSubmissions).values(coachNameRows);

  const pendingAsiop = (playersByTeam.get(asiop?.id ?? '') ?? []).find((player) => player.approvalStatus === 'PENDING');
  const rejectedAsiop = (playersByTeam.get(asiop?.id ?? '') ?? []).find((player) => player.approvalStatus === 'REJECTED');
  const submissionRows: (typeof playerSubmissions.$inferInsert)[] = [];
  if (asiop && pendingAsiop) submissionRows.push({ teamId: asiop.id, playerId: pendingAsiop.id, submittedBy: coachId, payload: { name: pendingAsiop.name, jerseyNumber: pendingAsiop.jerseyNumber, position: 'Penyerang' }, status: 'PENDING', revision: 1 });
  if (asiop && rejectedAsiop) submissionRows.push({ teamId: asiop.id, playerId: rejectedAsiop.id, submittedBy: coachId, payload: { name: rejectedAsiop.name, jerseyNumber: rejectedAsiop.jerseyNumber, position: 'Gelandang' }, status: 'REJECTED', revision: 1, reviewedBy: adminId, reviewedAt: jakartaDate(-6, 14), rejectionReason: 'Foto pemain buram dan tidak sesuai dengan data registrasi.' });
  const batavia = teamByName.get('Batavia FC U-10');
  if (batavia) submissionRows.push({ teamId: batavia.id, submittedBy: coachId, payload: { name: nextName(), jerseyNumber: 17, position: 'Penyerang' }, status: 'PENDING', revision: 1 });
  if (rajawali) for (const player of playersByTeam.get(rajawali.id) ?? []) submissionRows.push({ teamId: rajawali.id, playerId: player.id, submittedBy: coachId, payload: { name: player.name, jerseyNumber: player.jerseyNumber, position: FORMATION[(player.jerseyNumber - 1) % FORMATION.length] ?? 'Gelandang' }, status: 'PENDING', revision: 1 });
  if (submissionRows.length) await tx.insert(playerSubmissions).values(submissionRows);
  const elang = teamByName.get('Elang Cilandak U-10');
  if (asiop) await tx.insert(jerseySubmissions).values({ teamId: asiop.id, submittedBy: coachId, homeJersey: { color: '#0033A0' }, awayJersey: { color: '#FFD100' }, status: 'PENDING', revision: 2 });
  if (elang) await tx.insert(jerseySubmissions).values({ teamId: elang.id, submittedBy: coachId, homeJersey: { color: '#111111' }, awayJersey: { color: '#111111' }, status: 'REJECTED', revision: 1, reviewedBy: adminId, reviewedAt: jakartaDate(-5, 11), rejectionReason: 'Warna jersey kandang dan tandang sama, sehingga bentrok jika kedua tim memakainya.' });

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const liveAt = new Date(Math.max(dayStart.getTime() + 60_000, now.getTime() - 25 * 60_000));
  let scheduledA = new Date(liveAt.getTime() + 80 * 60_000);
  let scheduledB = new Date(scheduledA.getTime() + 2 * 60 * 60_000);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  if (scheduledB.getTime() >= dayEnd.getTime() - 10 * 60_000) {
    scheduledA = jakartaDate(1, 9);
    scheduledB = jakartaDate(1, 11);
  }
  const pastDays = [-16, -12, -8, -4];
  const rounds = groups.map((group) => {
    const pairs = roundRobin(group.teamIds);
    assertRoundRobin(group.teamIds, pairs);
    return { group, pairs };
  });
  const roundCount = rounds[0]?.pairs.length ?? 0;
  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const pairs = rounds.flatMap(({ group, pairs: roundPairs }) => (roundPairs[roundIndex] ?? []).map(([homeTeamId, awayTeamId]) => ({ ...group, homeTeamId, awayTeamId })));
    const today = roundIndex === roundCount - 1;
    pairs.forEach((pair, index) => {
      const slot = pitchSlot(index, jakartaPitches.length);
      const pitchId = jakartaPitches[today ? index % jakartaPitches.length : slot.pitchIndex];
      if (!pitchId) throw new Error('Pitch Jakarta tidak cukup.');
      let startsAt = jakartaDate(pastDays[roundIndex] ?? -4, [8, 10, 13][slot.slotIndex] ?? 8);
      let status: MatchStatus = 'FINISHED';
      let live: { minute: number; home: number[]; away: number[] } | undefined;
      if (today) {
        if (index < 4) {
          status = 'LIVE';
          startsAt = liveAt;
          live = LIVE_SCRIPTS[liveCursor % LIVE_SCRIPTS.length];
          liveCursor += 1;
        } else if (index < 6) {
          status = 'POSTPONED';
          startsAt = jakartaDate(0, 8);
        } else if (index < 8) {
          status = 'CANCELLED';
          startsAt = jakartaDate(0, 8, 30);
        } else if (index < 16) {
          status = 'SCHEDULED';
          startsAt = scheduledA;
        } else {
          status = 'SCHEDULED';
          startsAt = scheduledB;
        }
      }
      planned.push(planMatch({ tournamentId: jakarta.id, ageGroupId: pair.ageGroupId, stageId: pair.stageId, homeTeamId: pair.homeTeamId, awayTeamId: pair.awayTeamId, pitchId, startsAt, status, playersByTeam, rng, live }));
    });
  }

  const [bandung] = await tx.insert(tournaments).values({
    sportId: football.id, name: 'Piala TYC Bandung 2025', slug: 'tyc-bandung-2025', status: 'ARCHIVED',
    startsAt: fixedJakarta('2025-06-07', 8), endsAt: fixedJakarta('2025-06-15', 18), archivedAt: fixedJakarta('2025-06-20', 9),
    description: 'Edisi Bandung yang sudah diarsipkan. Delapan tim U-14 menyelesaikan grup penuh di Stadion Siliwangi, lalu juara grup dan runner-up bermain di final.',
  }).returning();
  if (!bandung) throw new Error('Turnamen Bandung gagal dibuat.');
  const [siliwangi] = await tx.insert(venues).values({ tournamentId: bandung.id, name: 'Stadion Siliwangi', address: 'Jl. Lombok, Bandung', capacity: 15000, mapUrl: 'https://maps.google.com/?q=Stadion+Siliwangi+Bandung', active: true }).returning();
  if (!siliwangi) throw new Error('Venue Bandung gagal dibuat.');
  const bandungPitches: string[] = [];
  for (const name of ['Lapangan Utama', 'Lapangan Annex']) {
    const [pitch] = await tx.insert(pitches).values({ venueId: siliwangi.id, name, active: true }).returning();
    if (pitch) bandungPitches.push(pitch.id);
  }
  const [bandungAge] = await tx.insert(ageGroups).values({ tournamentId: bandung.id, name: 'U-14', maxSquadSize: 20, sortOrder: 1, active: true }).returning();
  if (!bandungAge) throw new Error('Kelompok umur Bandung gagal dibuat.');
  const [bandungGroup] = await tx.insert(stages).values({ ageGroupId: bandungAge.id, name: 'Grup Tunggal', type: 'GROUP', sortOrder: 0, published: true }).returning();
  const [bandungFinalStage] = await tx.insert(stages).values({ ageGroupId: bandungAge.id, name: 'Final', type: 'KNOCKOUT', sortOrder: 1, published: true }).returning();
  if (!bandungGroup || !bandungFinalStage) throw new Error('Stage Bandung gagal dibuat.');
  const bandungNames = ['SSB Bandung Muda', 'Persib Academy', 'Daya Juang FC', 'Tunas Siliwangi', 'Prima Bandung', 'Laskar Buahbatu', 'Dago United', 'Cibeunying FC'];
  const bandungTeamIds: string[] = [];
  const bandungPlayerRows: (typeof players.$inferInsert)[] = [];
  for (let index = 0; index < bandungNames.length; index += 1) {
    const name = bandungNames[index] ?? `Bandung ${index}`;
    const colors = kit(index + 3);
    const [team] = await tx.insert(teams).values({ tournamentId: bandung.id, ageGroupId: bandungAge.id, stageId: bandungGroup.id, name, homeJersey: colors.home, awayJersey: colors.away, active: true }).returning();
    if (!team) throw new Error('Tim Bandung gagal dibuat.');
    teamByName.set(name, { id: team.id, name, tournamentId: bandung.id, ageGroupId: bandungAge.id, stageId: bandungGroup.id });
    bandungTeamIds.push(team.id);
    bandungPlayerRows.push(...squadRows(team.id, 'bandung'));
  }
  const bandungPlayers = await insertPlayers(tx, bandungPlayerRows);
  for (const player of bandungPlayers) {
    const list = playersByTeam.get(player.teamId) ?? [];
    list.push(player);
    playersByTeam.set(player.teamId, list);
  }
  await tx.insert(coachNameSubmissions).values(bandungTeamIds.map((teamId) => ({ teamId, submittedBy: adminId, coachName: nextName(), status: 'APPROVED' as const, revision: 1, reviewedBy: adminId, reviewedAt: fixedJakarta('2025-06-01', 10) })));
  const bandungRounds = roundRobin(bandungTeamIds);
  assertRoundRobin(bandungTeamIds, bandungRounds);
  const bandungDays = ['2025-06-07', '2025-06-08', '2025-06-09', '2025-06-10', '2025-06-11', '2025-06-12', '2025-06-13'];
  bandungRounds.forEach((round, roundIndex) => {
    round.forEach(([homeTeamId, awayTeamId], index) => {
      const slot = pitchSlot(index, bandungPitches.length);
      const pitchId = bandungPitches[slot.pitchIndex];
      const day = bandungDays[roundIndex];
      if (!pitchId || !day) throw new Error('Jadwal Bandung tidak lengkap.');
      planned.push(planMatch({ tournamentId: bandung.id, ageGroupId: bandungAge.id, stageId: bandungGroup.id, homeTeamId, awayTeamId, pitchId, startsAt: fixedJakarta(day, slot.slotIndex === 0 ? 8 : 10, 30), status: 'FINISHED', playersByTeam, rng: mulberry32(20250607 + roundIndex * 10 + index) }));
    });
  });

  const [surabaya] = await tx.insert(tournaments).values({
    sportId: football.id, name: 'Piala TYC Surabaya 2027', slug: 'tyc-surabaya-2027', status: 'DRAFT',
    startsAt: jakartaDate(80, 8), endsAt: jakartaDate(94, 18),
    description: 'Draf musim depan. Kelompok umur dan sebagian klub sudah didaftarkan, stage belum diterbitkan, dan antrean review pelatih masih terbuka.',
  }).returning();
  if (!surabaya) throw new Error('Turnamen Surabaya gagal dibuat.');
  const [bungTomo] = await tx.insert(venues).values({ tournamentId: surabaya.id, name: 'Stadion Gelora Bung Tomo', address: 'Jl. Abdul Wahab Siamin, Surabaya', capacity: 20000, mapUrl: 'https://maps.google.com/?q=Gelora+Bung+Tomo', active: true }).returning();
  if (!bungTomo) throw new Error('Venue Surabaya gagal dibuat.');
  await tx.insert(pitches).values([{ venueId: bungTomo.id, name: 'Pitch Barat', active: true }, { venueId: bungTomo.id, name: 'Pitch Timur', active: false }]);
  const [u11] = await tx.insert(ageGroups).values({ tournamentId: surabaya.id, name: 'U-11', maxSquadSize: 18, sortOrder: 1, active: true }).returning();
  const [u13] = await tx.insert(ageGroups).values({ tournamentId: surabaya.id, name: 'U-13', maxSquadSize: 20, sortOrder: 2, active: true }).returning();
  await tx.insert(ageGroups).values({ tournamentId: surabaya.id, name: 'U-17', maxSquadSize: 23, sortOrder: 3, active: false });
  if (!u11 || !u13) throw new Error('Kelompok umur Surabaya gagal dibuat.');
  const [surabayaStage] = await tx.insert(stages).values({ ageGroupId: u11.id, name: 'Grup A', type: 'GROUP', sortOrder: 0, published: false }).returning();
  await tx.insert(stages).values({ ageGroupId: u13.id, name: 'Grup A', type: 'GROUP', sortOrder: 0, published: false });
  if (!surabayaStage) throw new Error('Stage Surabaya gagal dibuat.');
  const surabayaPlan = [
    { name: 'SSB Bung Tomo', mode: 'complete' },
    { name: 'Persebaya Muda', mode: 'complete' },
    { name: 'Arek Suroboyo', mode: 'no-coach' },
    { name: 'Tambaksari FC', mode: 'partial' },
    { name: 'Darmo United', mode: 'empty' },
    { name: 'Kenjeran Youth', mode: 'inactive' },
  ] as const;
  const surabayaPlayerRows: (typeof players.$inferInsert)[] = [];
  const surabayaTeams = new Map<string, string>();
  for (let index = 0; index < surabayaPlan.length; index += 1) {
    const plan = surabayaPlan[index];
    if (!plan) continue;
    const colors = kit(index + 1);
    const [team] = await tx.insert(teams).values({
      tournamentId: surabaya.id, ageGroupId: u11.id, stageId: surabayaStage.id, name: plan.name, active: plan.mode !== 'inactive',
      ...(plan.mode === 'partial' || plan.mode === 'empty' || plan.mode === 'inactive' ? {} : { homeJersey: colors.home, awayJersey: colors.away }),
    }).returning();
    if (!team) throw new Error('Tim Surabaya gagal dibuat.');
    surabayaTeams.set(plan.name, team.id);
    teamByName.set(plan.name, { id: team.id, name: plan.name, tournamentId: surabaya.id, ageGroupId: u11.id, stageId: surabayaStage.id });
    if (plan.mode === 'complete' || plan.mode === 'no-coach') surabayaPlayerRows.push(...squadRows(team.id, 'eight'));
    if (plan.mode === 'partial') for (let number = 1; number <= 6; number += 1) surabayaPlayerRows.push({ teamId: team.id, name: nextName(), position: FORMATION[number - 1] ?? 'Bek', jerseyNumber: number, approvalStatus: 'APPROVED', status: 'ACTIVE' });
    if (plan.mode === 'empty') for (let number = 1; number <= 4; number += 1) surabayaPlayerRows.push({ teamId: team.id, name: nextName(), position: FORMATION[number - 1] ?? 'Bek', jerseyNumber: number, approvalStatus: 'PENDING', status: 'ACTIVE' });
    if (plan.mode === 'inactive') for (let number = 1; number <= 3; number += 1) surabayaPlayerRows.push({ teamId: team.id, name: nextName(), position: FORMATION[number - 1] ?? 'Bek', jerseyNumber: number, approvalStatus: 'PENDING', status: 'ACTIVE' });
  }
  const surabayaPlayers = await insertPlayers(tx, surabayaPlayerRows);
  for (const player of surabayaPlayers) {
    const list = playersByTeam.get(player.teamId) ?? [];
    list.push(player);
    playersByTeam.set(player.teamId, list);
  }
  const surabayaCoachRows: (typeof coachNameSubmissions.$inferInsert)[] = [];
  const surabayaJerseyRows: (typeof jerseySubmissions.$inferInsert)[] = [];
  const surabayaPlayerSubs: (typeof playerSubmissions.$inferInsert)[] = [];
  for (const plan of surabayaPlan) {
    const teamId = surabayaTeams.get(plan.name);
    if (!teamId) continue;
    if (plan.mode === 'complete') surabayaCoachRows.push({ teamId, submittedBy: coachId, coachName: nextName(), status: 'APPROVED', revision: 1, reviewedBy: adminId, reviewedAt: new Date() });
    else surabayaCoachRows.push({ teamId, submittedBy: coachId, coachName: nextName(), status: 'PENDING', revision: 1 });
    if (plan.mode !== 'complete' && plan.mode !== 'no-coach') surabayaJerseyRows.push({ teamId, submittedBy: coachId, homeJersey: { color: '#0B6B3A' }, awayJersey: { color: '#FFFFFF' }, status: plan.mode === 'inactive' ? 'REJECTED' : 'PENDING', revision: 1, ...(plan.mode === 'inactive' ? { reviewedBy: adminId, reviewedAt: new Date(), rejectionReason: 'Berkas desain jersey belum ditandatangani official klub.' } : {}) });
    if (plan.mode === 'partial') {
      surabayaPlayerSubs.push({ teamId, submittedBy: coachId, payload: { name: nextName(), jerseyNumber: 9, position: 'Penyerang' }, status: 'PENDING', revision: 1 });
      surabayaPlayerSubs.push({ teamId, submittedBy: coachId, payload: { name: nextName(), jerseyNumber: 4, position: 'Bek' }, status: 'REJECTED', revision: 1, reviewedBy: adminId, reviewedAt: new Date(), rejectionReason: 'Nomor punggung 4 sudah dipakai pemain yang disetujui.' });
    }
    if (plan.mode === 'empty' || plan.mode === 'inactive') {
      for (const player of playersByTeam.get(teamId) ?? []) surabayaPlayerSubs.push({ teamId, playerId: player.id, submittedBy: coachId, payload: { name: player.name, jerseyNumber: player.jerseyNumber, position: FORMATION[(player.jerseyNumber - 1) % FORMATION.length] ?? 'Bek' }, status: 'PENDING', revision: 1 });
    }
  }
  if (surabayaCoachRows.length) await tx.insert(coachNameSubmissions).values(surabayaCoachRows);
  if (surabayaJerseyRows.length) await tx.insert(jerseySubmissions).values(surabayaJerseyRows);
  if (surabayaPlayerSubs.length) await tx.insert(playerSubmissions).values(surabayaPlayerSubs);

  const [depok] = await tx.insert(tournaments).values({
    sportId: football.id, name: 'Festival Mini Soccer Depok 2026', slug: 'festival-mini-soccer-depok-2026', status: 'CANCELLED',
    startsAt: fixedJakarta('2026-03-14', 8), endsAt: fixedJakarta('2026-03-15', 17),
    description: 'Festival mini soccer yang dibatalkan karena lapangan tergenang setelah hujan deras. Data klub dipertahankan untuk jejak audit.',
  }).returning();
  if (!depok) throw new Error('Turnamen Depok gagal dibuat.');
  const [merpati] = await tx.insert(venues).values({ tournamentId: depok.id, name: 'Lapangan Merpati Depok', address: 'Jl. Margonda Raya, Depok', capacity: 400, mapUrl: 'https://maps.google.com/?q=Margonda+Depok', active: true }).returning();
  if (!merpati) throw new Error('Venue Depok gagal dibuat.');
  const [depokPitch] = await tx.insert(pitches).values({ venueId: merpati.id, name: 'Mini Pitch', active: true }).returning();
  const [depokAge] = await tx.insert(ageGroups).values({ tournamentId: depok.id, name: 'U-12', maxSquadSize: 12, sortOrder: 1, active: true }).returning();
  const [depokStage] = depokAge ? await tx.insert(stages).values({ ageGroupId: depokAge.id, name: 'Grup A', type: 'GROUP', sortOrder: 0, published: true }).returning() : [];
  if (!depokPitch || !depokAge || !depokStage) throw new Error('Struktur Depok gagal dibuat.');
  const depokNames = ['Depok Raya FC', 'Margonda United', 'Sawangan Muda', 'Beji Athletic'];
  const depokIds: string[] = [];
  const depokPlayers: (typeof players.$inferInsert)[] = [];
  for (let index = 0; index < depokNames.length; index += 1) {
    const name = depokNames[index] ?? `Depok ${index}`;
    const colors = kit(index);
    const [team] = await tx.insert(teams).values({ tournamentId: depok.id, ageGroupId: depokAge.id, stageId: depokStage.id, name, homeJersey: colors.home, awayJersey: colors.away, active: true }).returning();
    if (!team) throw new Error('Tim Depok gagal dibuat.');
    depokIds.push(team.id);
    teamByName.set(name, { id: team.id, name, tournamentId: depok.id, ageGroupId: depokAge.id, stageId: depokStage.id });
    depokPlayers.push(...squadRows(team.id, 'eight'));
  }
  const depokSquad = await insertPlayers(tx, depokPlayers);
  for (const player of depokSquad) {
    const list = playersByTeam.get(player.teamId) ?? [];
    list.push(player);
    playersByTeam.set(player.teamId, list);
  }
  await tx.insert(coachNameSubmissions).values(depokIds.map((teamId) => ({ teamId, submittedBy: adminId, coachName: nextName(), status: 'APPROVED' as const, revision: 1, reviewedBy: adminId, reviewedAt: fixedJakarta('2026-03-01', 9) })));
  if (depokIds[0] && depokIds[1]) planned.push(planMatch({ tournamentId: depok.id, ageGroupId: depokAge.id, stageId: depokStage.id, homeTeamId: depokIds[0], awayTeamId: depokIds[1], pitchId: depokPitch.id, startsAt: fixedJakarta('2026-03-14', 8), status: 'CANCELLED', playersByTeam, rng }));
  if (depokIds[2] && depokIds[3]) planned.push(planMatch({ tournamentId: depok.id, ageGroupId: depokAge.id, stageId: depokStage.id, homeTeamId: depokIds[2], awayTeamId: depokIds[3], pitchId: depokPitch.id, startsAt: fixedJakarta('2026-03-14', 10), status: 'CANCELLED', playersByTeam, rng }));

  assertPlayable(planned);
  await saveMatches(tx, planned, adminId);

  const finishedByStage = new Map<string, FinishedScore[]>();
  for (const match of planned) {
    if (match.row.status !== 'FINISHED' || !match.row.stageId) continue;
    const bucket = finishedByStage.get(match.row.stageId) ?? [];
    bucket.push({ homeTeamId: match.row.homeTeamId, awayTeamId: match.row.awayTeamId, homeScore: match.row.homeScore ?? 0, awayScore: match.row.awayScore ?? 0 });
    finishedByStage.set(match.row.stageId, bucket);
  }
  for (const group of groups) await writeStandings(tx, group.stageId, group.teamIds, finishedByStage.get(group.stageId) ?? []);
  const bandungTable = await writeStandings(tx, bandungGroup.id, bandungTeamIds, finishedByStage.get(bandungGroup.id) ?? []);
  const bandungOrdered = [...bandungTable].sort((left, right) => left.position - right.position);
  const finalHome = bandungOrdered[0]?.teamId;
  const finalAway = bandungOrdered[1]?.teamId;
  let bandungFinalId = '';
  if (finalHome && finalAway && bandungPitches[0]) {
    const finalMatch = planMatch({ tournamentId: bandung.id, ageGroupId: bandungAge.id, stageId: bandungFinalStage.id, homeTeamId: finalHome, awayTeamId: finalAway, pitchId: bandungPitches[0], startsAt: fixedJakarta('2025-06-15', 15, 30), status: 'FINISHED', playersByTeam, rng: mulberry32(20250615) });
    finalMatch.events = orderEvents([
      ...goalDrafts(finalHome, playersByTeam.get(finalHome) ?? [], [8, 27], mulberry32(1)),
      ...goalDrafts(finalAway, playersByTeam.get(finalAway) ?? [], [19], mulberry32(2)),
    ]);
    const score = scoresFromGoals(finalHome, finalAway, finalMatch.events.filter((event) => event.eventType === 'GOAL'));
    finalMatch.row.homeScore = score.homeScore;
    finalMatch.row.awayScore = score.awayScore;
    await saveMatches(tx, [finalMatch], adminId);
    bandungFinalId = finalMatch.key;
    await writeStandings(tx, bandungFinalStage.id, [finalHome, finalAway], [{ homeTeamId: finalHome, awayTeamId: finalAway, homeScore: score.homeScore, awayScore: score.awayScore }]);
    planned.push(finalMatch);
  }

  const semiMatches: PlannedMatch[] = [];
  for (const [index, semi] of semiStages.entries()) {
    const tableA = await tx.select().from(standings).where(eq(standings.stageId, semi.groupA));
    const tableB = await tx.select().from(standings).where(eq(standings.stageId, semi.groupB));
    const rank = (rows: typeof tableA, position: number) => rows.find((row) => row.position === position)?.teamId;
    const pairings = [[rank(tableA, 1), rank(tableB, 2)], [rank(tableB, 1), rank(tableA, 2)]];
    pairings.forEach(([homeTeamId, awayTeamId], pairIndex) => {
      if (!homeTeamId || !awayTeamId) return;
      const pitchId = jakartaPitches[(index * 2 + pairIndex) % jakartaPitches.length];
      if (!pitchId) return;
      semiMatches.push(planMatch({
        tournamentId: jakarta.id, ageGroupId: semi.ageGroupId, stageId: semi.stageId, homeTeamId, awayTeamId, pitchId,
        startsAt: jakartaDate(6, pairIndex === 0 ? 15 : 17, 30), status: 'SCHEDULED', playersByTeam, rng,
      }));
    });
  }
  assertPlayable([...planned.filter((match) => match.row.status === 'SCHEDULED' || match.row.status === 'LIVE'), ...semiMatches]);
  await saveMatches(tx, semiMatches, adminId);

  const statMatches = [...planned, ...semiMatches].filter((match) => match.row.status === 'FINISHED').map((match) => ({ homeTeamId: match.row.homeTeamId, awayTeamId: match.row.awayTeamId, homeScore: match.row.homeScore ?? 0, awayScore: match.row.awayScore ?? 0 }));
  await writeStatistics(tx, [...teamByName.values()].map((team) => team.id), statMatches);
  if (u12GroupA) {
    const groupRows = await tx.select().from(standings).where(eq(standings.stageId, u12GroupA));
    const row = groupRows.find((item) => item.position === 2);
    if (row) await tx.update(standings).set({ manualRankOverride: row.position, manualRankReason: 'Peringkat dikonfirmasi panitia setelah protes offside pada matchday 2. Posisi tidak diubah.' }).where(eq(standings.id, row.id));
  }

  const firstBandung = teamByName.get(bandungNames[0] ?? '');
  const secondBandung = teamByName.get(bandungNames[1] ?? '');
  const moved = secondBandung ? (playersByTeam.get(secondBandung.id) ?? []).find((player) => player.jerseyNumber === 13) : undefined;
  if (moved && firstBandung && secondBandung) {
    await tx.update(players).set({ status: 'TRANSFERRED', updatedAt: new Date() }).where(eq(players.id, moved.id));
    await tx.insert(playerTeamHistory).values({ playerId: moved.id, fromTeamId: firstBandung.id, toTeamId: secondBandung.id, changedBy: adminId, note: 'Pindah akademi pada jeda musim 2025.' });
  }

  const assignments: { coachUserId: string; teamId: string }[] = [];
  const ragunan = teamByName.get('SSB Ragunan U-12');
  if (ragunan) assignments.push({ coachUserId: coachId, teamId: ragunan.id });
  if (asiop) assignments.push({ coachUserId: coachId, teamId: asiop.id });
  const assignmentNames = ['Persija Muda U-12', 'Garuda Pondok Indah U-14', 'Elang Cilandak U-10', 'Batavia FC U-16', 'Macan Kemayoran U-14', 'Bintang Tebet U-12'];
  assignmentNames.forEach((name, index) => {
    const team = teamByName.get(name);
    const coachUserId = extraCoachIds[index];
    if (team && coachUserId) assignments.push({ coachUserId, teamId: team.id });
  });
  if (assignments.length) await tx.insert(coachTeamAssignments).values(assignments.map((assignment) => ({ ...assignment, active: true, assignedBy: adminId })));

  const favoriteNames = ['Persija Muda U-14', 'Garuda Pondok Indah U-10', 'Elang Cilandak U-16', 'Batavia FC U-12'];
  const favoriteIds = favoriteNames.flatMap((name) => {
    const team = teamByName.get(name);
    return team ? [team.id] : [];
  });
  if (favoriteIds.length) await tx.insert(favorites).values(favoriteIds.map((teamId) => ({ userId: fanId, teamId })));

  const articles: [string, 'Match' | 'Tournament' | 'Announcement', 'DRAFT' | 'PUBLISHED' | 'ARCHIVED', number, string][] = [
    ['Matchday terakhir grup Piala TYC Jakarta bergulir hari ini', 'Match', 'PUBLISHED', -0, 'Delapan grup menutup babak penyisihan hari ini di GBK, Rawamangun, dan Ciracas. Empat laga sedang berlangsung, sisanya menyusul sore dan malam. Klasemen resmi baru berubah setelah pertandingan berstatus selesai.'],
    ['SSB Ragunan dan ASIOP masih berebut puncak Grup A U-12', 'Match', 'PUBLISHED', -1, 'Dua akademi yang paling konsisten di U-12 masuk matchday terakhir dengan selisih tipis. Poin, selisih gol, lalu jumlah gol memasukkan menjadi urutan tie-break yang dipakai panitia.'],
    ['Lima pemain yang paling sering mencetak gol', 'Tournament', 'PUBLISHED', -2, 'Nomor punggung 9, 10, dan 11 mengisi sebagian besar daftar pencetak gol. Panitia mengingatkan orang tua bahwa statistik baru dihitung dari kejadian gol yang sudah direkam wasit.'],
    ['Semifinal U-10 sampai U-16 dijadwalkan pekan depan', 'Announcement', 'PUBLISHED', -1, 'Juara dan runner-up tiap grup bertemu silang. Final belum diisi karena menunggu pemenang semifinal. Cek venue pada kartu pertandingan sebelum berangkat.'],
    ['Skuad Batavia FC U-10 sudah penuh', 'Announcement', 'PUBLISHED', -3, 'Batas skuad U-10 adalah 16 pemain disetujui. Pengajuan pemain ke-17 tetap masuk antrean, tetapi persetujuan akan ditolak selama kuota belum dikosongkan.'],
    ['Rajawali Rawamangun U-16 belum melengkapi registrasi', 'Announcement', 'PUBLISHED', -4, 'Klub itu belum memiliki pemain disetujui, pelatih resmi, atau jersey. Laga mereka tetap terpasang di grup, dan hasilnya mengikuti gol yang benar-benar terjadi.'],
    ['Relawan garis pinggir menjaga rotasi lapangan', 'Tournament', 'PUBLISHED', -5, 'Setiap pitch punya jeda minimal sepuluh menit di luar durasi 50 menit. Jadwal disusun supaya satu tim dan satu pitch tidak punya dua laga yang waktunya bertabrakan.'],
    ['Perubahan kick-off di GOR Ciracas karena hujan', 'Match', 'PUBLISHED', -2, 'Dua laga pagi ditunda dan dua laga lain dibatalkan pada matchday terakhir. Status ditunda dan batal tidak mengubah klasemen.'],
    ['Cara membaca klasemen di aplikasi', 'Tournament', 'PUBLISHED', -6, 'Urutan resmi adalah poin, selisih gol, lalu gol memasukkan. Satu baris di Grup A U-12 ditandai override karena ada protes, tetapi posisinya tidak digeser.'],
    ['Piala TYC Bandung 2025 resmi diarsipkan', 'Tournament', 'PUBLISHED', -8, 'Final di Stadion Siliwangi sudah selesai dan sertifikat juara serta partisipan dapat dicek dengan kode verifikasi. Turnamen arsip tidak tampil di beranda mobile.'],
    ['Festival Mini Soccer Depok dibatalkan', 'Announcement', 'PUBLISHED', -7, 'Hujan deras membuat Lapangan Merpati tidak layak pakai. Kedua laga berstatus batal dan tidak menghasilkan poin.'],
    ['Panduan orang tua di hari pertandingan', 'Announcement', 'PUBLISHED', -3, 'Datang 45 menit lebih awal, bawa kartu identitas pemain, dan ikuti warna jersey yang sudah disetujui. Hanya pemain berstatus disetujui yang tampil di skuad publik.'],
    ['Highlight gol matchday pembukaan siap ditonton', 'Match', 'PUBLISHED', -9, 'Cuplikan dipilih dari laga yang sudah selesai. Video masih berupa tautan metadata sampai berkas diunggah ke penyimpanan turnamen.'],
    ['Konsep pengumuman tribun Surabaya', 'Announcement', 'DRAFT', -1, 'Draf ini belum untuk publik. Pembukaan tribun Gelora Bung Tomo masih menunggu konfirmasi kapasitas dan jam latihan.'],
    ['Catatan wasit sebelum diterbitkan', 'Match', 'DRAFT', -2, 'Draf disiplin kumulatif. Jangan diterbitkan sebelum koordinator wasit menandatangani rekap kartu.'],
    ['Kilas balik pembukaan musim Jakarta', 'Tournament', 'ARCHIVED', -15, 'Artikel pembukaan musim yang sudah diganti oleh laporan matchday. Versi ini tetap tersimpan sebagai arsip redaksi.'],
  ];
  const newsRows: (typeof news.$inferInsert)[] = articles.map(([title, category, status, day, body], index) => ({
    tournamentId: title.includes('Bandung') ? bandung.id : title.includes('Depok') ? depok.id : title.includes('Surabaya') ? surabaya.id : jakarta.id,
    title, category, body, slug: `tyc-demo-${index + 1}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)}`,
    status, createdBy: adminId,
    ...(status === 'PUBLISHED' || status === 'ARCHIVED' ? { publishedAt: jakartaDate(day, 9) } : {}),
  }));
  const insertedNews = await tx.insert(news).values(newsRows).returning({ id: news.id });
  const archived = insertedNews[15];
  const replacement = insertedNews[0];
  if (archived && replacement) await tx.update(news).set({ revisionOfId: archived.id }).where(eq(news.id, replacement.id));
  await tx.insert(news).values({ tournamentId: jakarta.id, title: 'Koreksi skor yang ditarik dari publikasi', slug: 'tyc-demo-koreksi-skor-ditarik', category: 'Match', body: 'Koreksi ini ditarik dari daftar publik karena sumber video belum lengkap.', status: 'PUBLISHED', publishedAt: jakartaDate(-2, 18), deletedAt: new Date(), createdBy: adminId });

  const [rulesV1] = await tx.insert(tournamentRules).values({ tournamentId: jakarta.id, title: 'Peraturan Pertandingan Piala TYC Jakarta 2026', version: 1, status: 'ARCHIVED', body: 'Versi awal. Durasi masih tertulis 2x20 menit dan diganti pada versi 2.', publishedAt: jakartaDate(-20, 8) }).returning();
  await tx.insert(tournamentRules).values({
    tournamentId: jakarta.id, revisionOfId: rulesV1?.id, title: 'Peraturan Pertandingan Piala TYC Jakarta 2026', version: 2, status: 'PUBLISHED', publishedAt: jakartaDate(-14, 8),
    body: 'Durasi pertandingan 2x25 menit. Skuad mengikuti batas kelompok umur. Poin: menang 3, seri 1, kalah 0. Urutan klasemen: poin, selisih gol, gol memasukkan. Kartu kuning dicatat wasit dan tidak otomatis mengubah skor. Hanya pemain yang disetujui yang boleh dimainkan. Pitch yang sama tidak boleh memiliki dua pertandingan aktif yang waktunya bertumpuk, termasuk jeda 10 menit.',
  });
  await tx.insert(tournamentRules).values({ tournamentId: bandung.id, title: 'Peraturan Piala TYC Bandung 2025', version: 1, status: 'PUBLISHED', publishedAt: fixedJakarta('2025-06-01', 8), body: 'Peraturan edisi Bandung. Babak grup satu grup delapan tim, final dimainkan juara dan runner-up grup.' });

  const noteRows: [string, string, string, 'QUEUED' | 'DELIVERED' | 'FAILED', boolean, string | null][] = [
    [fanId, 'Laga hari ini sudah live', 'Empat pertandingan matchday terakhir sedang berlangsung. Buka beranda untuk skornya.', 'DELIVERED', false, 'Persija Muda U-14'],
    [fanId, 'Kick-off sore tetap jalan', 'Gelombang berikutnya main di pitch yang sama setelah jeda lapangan.', 'QUEUED', false, 'Batavia FC U-12'],
    [fanId, 'Sertifikat Bandung tersedia', 'Sertifikat partisipan Piala TYC Bandung 2025 sudah bisa dicek dengan kode verifikasi.', 'DELIVERED', false, null],
    [fanId, 'Favoritmu menang kemarin', 'Garuda Pondok Indah menutup matchday sebelumnya dengan kemenangan.', 'DELIVERED', true, 'Garuda Pondok Indah U-10'],
    [fanId, 'Pengingat jadwal besok', 'Cek venue sebelum berangkat. Sebagian laga pindah ke GOR Ciracas.', 'DELIVERED', true, 'Elang Cilandak U-16'],
    [coachId, 'Pemain menunggu review', 'ASIOP U-12 punya pengajuan pemain, jersey, dan nama pelatih yang masih pending.', 'DELIVERED', false, 'ASIOP U-12'],
    [coachId, 'Skuad Ragunan lengkap', 'SSB Ragunan U-12 sudah disetujui dan siap matchday terakhir.', 'DELIVERED', true, 'SSB Ragunan U-12'],
    [coachId, 'Jersey Elang ditolak', 'Warna kandang dan tandang tidak boleh sama. Ajukan revisi.', 'FAILED', false, 'Elang Cilandak U-10'],
    [operatorId, 'Dua laga dibatalkan', 'Hujan di Ciracas membatalkan dua kick-off pagi. Klasemen tidak berubah.', 'DELIVERED', false, null],
    [operatorId, 'Antrean klub Surabaya', 'Empat klub draf masih menunggu review pelatih, jersey, atau pemain.', 'QUEUED', false, null],
    [operatorId, 'Ekspor klasemen siap', 'Laporan klasemen Jakarta masuk antrean pekerjaan.', 'DELIVERED', true, null],
  ];
  await tx.insert(notifications).values(noteRows.map(([userId, title, body, deliveryStatus, read, teamName]) => {
    const team = typeof teamName === 'string' ? teamByName.get(teamName) : undefined;
    return {
      userId, title, body, deliveryStatus,
      ...(team ? { teamId: team.id } : {}),
      ...(deliveryStatus === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
      ...(deliveryStatus === 'FAILED' ? { failureReason: 'Perangkat push penerima tidak terdaftar.' } : {}),
      ...(read ? { readAt: new Date() } : {}),
    };
  }));

  const [championTemplate] = await tx.insert(certificateTemplates).values({ name: 'TYC Demo Juara', description: 'Sertifikat juara edisi arsip Bandung.' }).returning();
  const [participantTemplate] = await tx.insert(certificateTemplates).values({ name: 'TYC Demo Partisipan', description: 'Sertifikat partisipan untuk pemain dan official.' }).returning();
  if (!championTemplate || !participantTemplate) throw new Error('Template sertifikat gagal dibuat.');
  await tx.insert(tournamentCertificates).values([
    { tournamentId: bandung.id, templateId: championTemplate.id, title: 'Juara Piala TYC Bandung 2025', kind: 'CHAMPION', teamId: finalHome, active: true },
    { tournamentId: bandung.id, templateId: participantTemplate.id, title: 'Partisipan Piala TYC Bandung 2025', kind: 'PARTICIPANT', active: true },
    { tournamentId: jakarta.id, templateId: participantTemplate.id, title: 'Partisipan Piala TYC Jakarta 2026', kind: 'PARTICIPANT', active: true },
  ]);
  const championName = finalHome ? (playersByTeam.get(finalHome) ?? []).find((player) => player.jerseyNumber === 9)?.name ?? 'Pemain Juara' : 'Pemain Juara';
  const certificateRows: (typeof certificates.$inferInsert)[] = [
    { recipientName: championName, tournamentId: bandung.id, ageGroupId: bandungAge.id, teamId: finalHome, matchId: bandungFinalId || null, available: true, verificationCode: 'TYC-DEMO-BANDUNG-JUARA', filePath: 'certificates/TYC-DEMO-BANDUNG-JUARA.pdf', createdBy: adminId },
    { recipientName: 'Bima Pratama', tournamentId: bandung.id, ageGroupId: bandungAge.id, teamId: finalHome, matchId: bandungFinalId || null, available: true, verificationCode: 'TYC-DEMO-BANDUNG-FAN', filePath: 'certificates/TYC-DEMO-BANDUNG-FAN.pdf', createdBy: fanId },
  ];
  bandungTeamIds.slice(0, 4).forEach((teamId, index) => {
    const player = (playersByTeam.get(teamId) ?? [])[0];
    if (!player) return;
    certificateRows.push({ recipientName: player.name, tournamentId: bandung.id, ageGroupId: bandungAge.id, teamId, available: true, verificationCode: `TYC-DEMO-BANDUNG-P0${index + 1}`, filePath: `certificates/TYC-DEMO-BANDUNG-P0${index + 1}.pdf`, createdBy: adminId });
  });
  await tx.insert(certificates).values(certificateRows);

  const highlightMatches = planned.filter((match) => match.row.status === 'FINISHED' && match.row.tournamentId === jakarta.id).slice(0, 4);
  const highlightRows: (typeof media.$inferInsert)[] = highlightMatches.map((match, index) => {
    const scorer = match.events.find((event) => event.eventType === 'GOAL' && event.playerId);
    return { tournamentId: jakarta.id, matchId: match.key, highlightPlayerId: scorer?.playerId, type: 'HIGHLIGHT', title: `Cuplikan gol matchday ${index + 1}`, path: `highlights/tyc-jakarta-md${index + 1}.mp4`, externalUrl: `https://video.tyc.local/jakarta-2026/md${index + 1}`, mimeType: 'video/mp4', sortOrder: index, status: 'PUBLISHED' as const, createdBy: adminId };
  });
  highlightRows.push(
    { tournamentId: jakarta.id, type: 'PHOTO', title: 'Suasana pembukaan di GBK', path: 'photos/tyc-jakarta-opening.jpg', mimeType: 'image/jpeg', sortOrder: 0, status: 'PUBLISHED', createdBy: adminId },
    { tournamentId: surabaya.id, type: 'PHOTO', title: 'Denah tribun Gelora Bung Tomo', path: 'photos/tyc-surabaya-draft.jpg', mimeType: 'image/jpeg', sortOrder: 0, status: 'DRAFT', createdBy: adminId },
    { tournamentId: bandung.id, matchId: bandungFinalId || null, type: 'HIGHLIGHT', title: 'Final Piala TYC Bandung 2025', path: 'highlights/tyc-bandung-final.mp4', externalUrl: 'https://video.tyc.local/bandung-2025/final', mimeType: 'video/mp4', sortOrder: 0, status: 'PUBLISHED', createdBy: adminId },
  );
  await tx.insert(media).values(highlightRows);

  await tx.insert(auditLogs).values([
    { actorId: adminId, action: 'seed.demo.tournament.publish', entityType: 'tournament', entityId: jakarta.id, after: { status: 'PUBLISHED', slug: 'tyc-jakarta-2026' } },
    { actorId: adminId, action: 'seed.demo.tournament.archive', entityType: 'tournament', entityId: bandung.id, after: { status: 'ARCHIVED' } },
    { actorId: adminId, action: 'seed.demo.tournament.cancel', entityType: 'tournament', entityId: depok.id, reason: 'Lapangan tergenang.', after: { status: 'CANCELLED' } },
    { actorId: operatorId, action: 'seed.demo.match.finalize', entityType: 'match', after: { status: 'FINISHED' }, reason: 'Skor matchday grup dikunci wasit.' },
    { actorId: adminId, action: 'seed.demo.standing.confirm', entityType: 'standing', reason: 'Peringkat dikonfirmasi panitia setelah protes offside pada matchday 2. Posisi tidak diubah.' },
    { actorId: adminId, action: 'seed.demo.player_submission.reject', entityType: 'player_submission', reason: 'Foto pemain buram dan tidak sesuai dengan data registrasi.' },
  ]);
  await tx.insert(jobOutbox).values([
    { type: 'seed.demo.match.finished', payload: { tournamentId: jakarta.id }, processedAt: new Date(), attempts: 1 },
    { type: 'seed.demo.notification.compose', payload: { userId: fanId }, processedAt: new Date(), attempts: 1 },
    { type: 'seed.demo.export.standings', payload: { tournamentSlug: 'tyc-jakarta-2026' }, attempts: 0 },
  ]);

  return {
    teams: teamByName.size,
    players: [...playersByTeam.values()].reduce((total, squad) => total + squad.length, 0),
    matches: planned.length + semiMatches.length,
    live: [...planned, ...semiMatches].filter((match) => match.row.status === 'LIVE').length,
    news: newsRows.length + 1,
    coachTeam: 'SSB Ragunan U-12',
    reviewTeam: 'ASIOP U-12',
  };
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL harus diisi di apps/web/.env sebelum menjalankan db:seed:demo.');
  const { adminId, email } = await seedFoundation();
  const password = process.env.SEED_DEMO_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(password, 12);
  const summary = await db.transaction((tx) => seedDemo(tx, adminId, passwordHash));
  const passwordNote = process.env.SEED_DEMO_PASSWORD ? 'SEED_DEMO_PASSWORD' : process.env.SEED_ADMIN_PASSWORD ? 'SEED_ADMIN_PASSWORD' : 'ChangeMe123!';
  console.log(`Data demo siap. ${summary.teams} tim, ${summary.players} pemain, ${summary.matches} pertandingan (${summary.live} live), ${summary.news} berita.`);
  console.log(`Admin ${email}. Operator operator@tyc.local. Fan fan@tyc.local. Pelatih coach@tyc.local (${summary.coachTeam} dan ${summary.reviewTeam}).`);
  console.log(passwordNote === 'ChangeMe123!' ? 'Kata sandi akun demo: ChangeMe123!' : `Kata sandi akun demo mengikuti ${passwordNote}.`);
  console.log('Menjalankan ulang npm run db:seed:demo mengganti turnamen demo dan notifikasi akun demo. Akun lain tidak dihapus.');
}

if (isDirectRun()) {
  main().then(() => pool.end()).catch(async (error) => { console.error(error); await pool.end(); process.exitCode = 1; });
}
