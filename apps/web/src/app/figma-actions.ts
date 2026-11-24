'use server';

import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { ageGroups, certificates, coachNameSubmissions, jerseySubmissions, matchEvents, matches, media, news, notifications, pitches, playerSubmissions, playerTeamHistory, players, sports, stages, teams, tournamentCertificates, tournamentRules, tournaments, venues, certificateTemplates } from '@/db/schema';
import { requirePermission } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { matchService, scheduleService, standingsService, submissionService, teamService } from '@/lib/services';
import { cleanHtml, parseClockMinutes, scoresFromGoals, slugify } from '@/lib/tournament-status';
import { saveUpload, uploadFile } from '@/lib/uploads';
import type { ActionState } from './actions';

const read = (form: FormData, name: string) => String(form.get(name) ?? '').trim();
const many = (form: FormData, name: string) => form.getAll(name).map((value) => String(value).trim());
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const touch = (...paths: string[]) => paths.forEach((path) => revalidatePath(path));

function errorText(error: unknown) {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && !seen.has(current) && parts.length < 6) {
    seen.add(current);
    if (typeof current === 'string') parts.push(current);
    else if (current instanceof Error) parts.push(`${current.name} ${current.message}`);
    else parts.push(String(current));
    if (typeof current === 'object') {
      if ('constraint' in current && current.constraint) parts.push(String(current.constraint));
      current = 'cause' in current ? current.cause : undefined;
    } else current = undefined;
  }
  return parts.join(' ');
}
function failure(error: unknown): ActionState {
  if (error instanceof AppError) return { error: error.message, fields: error.fields };
  const text = errorText(error);
  if (text.includes('player_team_jersey')) return { error: 'That jersey number is already used on this team.' };
  if (text.includes('team_tournament_name')) return { error: 'A team with this name already exists in the tournament.' };
  if (text.includes('age_group_tournament_name')) return { error: 'That age category name is already used in this tournament.' };
  return { error: 'Unable to complete the request. Please review the form and try again.' };
}

async function audit(actorId: string, action: string, entityType: string, entityId: string, after: Record<string, unknown>) {
  const { auditLogs } = await import('@/db/schema');
  await db.insert(auditLogs).values({ actorId, action, entityType, entityId, after });
}
function day(value: string, end = false) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) throw new AppError('VALIDATION_ERROR', 'Start and end dates are required.');
  return new Date(`${value.slice(0, 10)}T${end ? '23:59:59' : '00:00:00'}`);
}
async function footballSportId() {
  const [sport] = await db.select().from(sports).where(eq(sports.code, 'FOOTBALL')).limit(1);
  if (!sport) throw new AppError('SPORT_MISSING', 'Seed the Football sport before creating a tournament.');
  return sport.id;
}
async function uniqueSlug(name: string, ignoreId?: string) {
  const base = slugify(name);
  for (let attempt = 1; attempt < 40; attempt += 1) {
    const slug = attempt === 1 ? base : `${base}-${attempt}`.slice(0, 180);
    const [found] = await db.select({ id: tournaments.id }).from(tournaments).where(eq(tournaments.slug, slug)).limit(1);
    if (!found || found.id === ignoreId) return slug;
  }
  throw new AppError('SLUG_TAKEN', 'Choose a different tournament name.');
}
async function uniqueNewsSlug(title: string, ignoreId?: string) {
  const base = slugify(title);
  for (let attempt = 1; attempt < 40; attempt += 1) {
    const slug = attempt === 1 ? base : `${base}-${attempt}`.slice(0, 220);
    const [found] = await db.select({ id: news.id }).from(news).where(eq(news.slug, slug)).limit(1);
    if (!found || found.id === ignoreId) return slug;
  }
  throw new AppError('SLUG_TAKEN', 'Choose a different news title.');
}
function storedStatus(choice: string): 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'CANCELLED' {
  if (choice === 'PUBLISHED' || choice === 'ON_GOING') return 'PUBLISHED';
  if (choice === 'CANCELLED') return 'CANCELLED';
  if (choice === 'ARCHIVED') return 'ARCHIVED';
  return 'DRAFT';
}
async function ownedTournament(id: string) {
  if (!uuidPattern.test(id)) throw new AppError('NOT_FOUND', 'Tournament was not found.', 404);
  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
  if (!tournament) throw new AppError('NOT_FOUND', 'Tournament was not found.', 404);
  return tournament;
}

export async function saveTournamentDetailsAction(_: ActionState, form: FormData): Promise<ActionState> {
  let next: string | undefined;
  try {
    const actor = await requirePermission('tournament.write');
    const id = read(form, 'id');
    const name = read(form, 'name');
    if (name.length < 2) throw new AppError('VALIDATION_ERROR', 'Tournament name is required.');
    const startsAt = day(read(form, 'startsAt'));
    const endsAt = day(read(form, 'endsAt'), true);
    if (endsAt < startsAt) throw new AppError('VALIDATION_ERROR', 'End date must not be before start date.');
    const banner = uploadFile(form, 'banner');
    const bannerUrl = banner ? await saveUpload(banner) : null;
    const description = read(form, 'description') || null;
    if (id) {
      const current = await ownedTournament(id);
      await db.update(tournaments).set({ name, slug: await uniqueSlug(name, id), description, startsAt, endsAt, status: storedStatus(read(form, 'status')), bannerUrl: bannerUrl ?? current.bannerUrl, updatedAt: new Date() }).where(eq(tournaments.id, id));
      await audit(actor.id, 'tournament.update', 'tournament', id, { name });
      next = `/tournaments/${id}/setup?step=categories`;
    } else {
      const [created] = await db.insert(tournaments).values({ sportId: await footballSportId(), name, slug: await uniqueSlug(name), description, startsAt, endsAt, status: 'DRAFT', bannerUrl: bannerUrl ?? undefined }).returning();
      await audit(actor.id, 'tournament.create', 'tournament', created.id, { name });
      next = `/tournaments/${created.id}/setup?step=categories`;
    }
    touch('/tournaments', '/dashboard');
  } catch (error) { return failure(error); }
  redirect(next ?? '/tournaments');
}

export async function saveTournamentCategoriesAction(_: ActionState, form: FormData): Promise<ActionState> {
  const tournamentId = read(form, 'tournamentId');
  try {
    const actor = await requirePermission('tournament.write');
    await ownedTournament(tournamentId);
    const ids = many(form, 'ageGroupId');
    const names = many(form, 'categoryName');
    const orders = many(form, 'sortOrder');
    for (let index = 0; index < names.length; index += 1) {
      if (!names[index]) continue;
      if (ids[index]) await db.update(ageGroups).set({ name: names[index], sortOrder: Number(orders[index] || 0) }).where(and(eq(ageGroups.id, ids[index]), eq(ageGroups.tournamentId, tournamentId)));
      else await db.insert(ageGroups).values({ tournamentId, name: names[index], sortOrder: Number(orders[index] || index + 1), maxSquadSize: 20 });
    }
    await audit(actor.id, 'tournament.categories', 'tournament', tournamentId, { count: names.filter(Boolean).length });
    touch(`/tournaments/${tournamentId}`);
  } catch (error) { return failure(error); }
  redirect(`/tournaments/${tournamentId}/setup?step=stages`);
}

export async function saveTournamentStagesAction(_: ActionState, form: FormData): Promise<ActionState> {
  const tournamentId = read(form, 'tournamentId');
  try {
    const actor = await requirePermission('tournament.write');
    await ownedTournament(tournamentId);
    const ids = many(form, 'stageId');
    const names = many(form, 'stageName');
    const ages = many(form, 'ageGroupId');
    const types = many(form, 'stageType');
    for (let index = 0; index < names.length; index += 1) {
      if (!names[index] || !ages[index]) continue;
      const [group] = await db.select().from(ageGroups).where(and(eq(ageGroups.id, ages[index]), eq(ageGroups.tournamentId, tournamentId))).limit(1);
      if (!group) throw new AppError('INVALID_AGE_GROUP', 'Choose an age category from this tournament.');
      const type = types[index] === 'KNOCKOUT' ? 'KNOCKOUT' : 'GROUP';
      if (ids[index]) {
        const [owned] = await db.select({ id: stages.id }).from(stages).innerJoin(ageGroups, eq(stages.ageGroupId, ageGroups.id)).where(and(eq(stages.id, ids[index]), eq(ageGroups.tournamentId, tournamentId))).limit(1);
        if (!owned) throw new AppError('NOT_FOUND', 'Stage was not found in this tournament.', 404);
        await db.update(stages).set({ name: names[index], ageGroupId: group.id, type }).where(eq(stages.id, ids[index]));
      } else await db.insert(stages).values({ ageGroupId: group.id, name: names[index], type, sortOrder: index + 1 });
    }
    await audit(actor.id, 'tournament.stages', 'tournament', tournamentId, { count: names.filter(Boolean).length });
  } catch (error) { return failure(error); }
  redirect(`/tournaments/${tournamentId}/setup?step=${read(form, 'intent') === 'next' ? 'pitches' : 'stages'}`);
}

export async function assignStageTeamAction(_: ActionState, form: FormData): Promise<ActionState> {
  const tournamentId = read(form, 'tournamentId');
  const stageId = read(form, 'stageId');
  try {
    const actor = await requirePermission('team.write');
    const [stage] = await db.select({ stage: stages, group: ageGroups }).from(stages).innerJoin(ageGroups, eq(stages.ageGroupId, ageGroups.id)).where(and(eq(stages.id, stageId), eq(ageGroups.tournamentId, tournamentId))).limit(1);
    if (!stage) throw new AppError('NOT_FOUND', 'Group was not found.', 404);
    const teamId = read(form, 'teamId');
    const name = read(form, 'teamName');
    if (teamId) {
      const [updated] = await db.update(teams).set({ stageId, ageGroupId: stage.group.id, updatedAt: new Date() }).where(and(eq(teams.id, teamId), eq(teams.tournamentId, tournamentId))).returning();
      if (!updated) throw new AppError('NOT_FOUND', 'Team was not found in this tournament.', 404);
    } else if (name.length >= 2) await teamService.create({ tournamentId, ageGroupId: stage.group.id, stageId, name }, actor.id);
    else throw new AppError('VALIDATION_ERROR', name ? 'Team name is required.' : 'Select a team or type a new team name.');
    touch(`/tournaments/${tournamentId}`, '/teams');
  } catch (error) { return failure(error); }
  redirect(`/tournaments/${tournamentId}/setup?step=stages`);
}

export async function removeStageTeamAction(_: ActionState, form: FormData): Promise<ActionState> {
  const tournamentId = read(form, 'tournamentId');
  try {
    await requirePermission('team.write');
    const [updated] = await db.update(teams).set({ stageId: null, updatedAt: new Date() }).where(and(eq(teams.id, read(form, 'teamId')), eq(teams.tournamentId, tournamentId))).returning();
    if (!updated) throw new AppError('NOT_FOUND', 'Team was not found in this tournament.', 404);
    touch(`/tournaments/${tournamentId}`, '/teams');
  } catch (error) { return failure(error); }
  redirect(`/tournaments/${tournamentId}/setup?step=stages`);
}

export async function saveTournamentPitchesAction(_: ActionState, form: FormData): Promise<ActionState> {
  const tournamentId = read(form, 'tournamentId');
  try {
    const actor = await requirePermission('tournament.write');
    await ownedTournament(tournamentId);
    const ids = many(form, 'venueId');
    const names = many(form, 'venueName');
    const capacities = many(form, 'capacity');
    const addresses = many(form, 'address');
    const maps = many(form, 'mapUrl');
    for (let index = 0; index < names.length; index += 1) {
      if (!names[index]) continue;
      const values = { name: names[index], address: addresses[index] || null, capacity: capacities[index] ? Number(capacities[index]) : null, mapUrl: maps[index] || null };
      if (ids[index]) await db.update(venues).set(values).where(and(eq(venues.id, ids[index]), eq(venues.tournamentId, tournamentId)));
      else {
        const [venue] = await db.insert(venues).values({ tournamentId, ...values }).returning();
        await db.insert(pitches).values({ venueId: venue.id, name: names[index] });
      }
    }
    await audit(actor.id, 'tournament.pitches', 'tournament', tournamentId, { count: names.filter(Boolean).length });
    touch('/venues');
  } catch (error) { return failure(error); }
  redirect(`/tournaments/${tournamentId}/setup?step=rules`);
}

export async function saveTournamentRulesAction(_: ActionState, form: FormData): Promise<ActionState> {
  const tournamentId = read(form, 'tournamentId');
  try {
    const actor = await requirePermission('content.publish');
    await ownedTournament(tournamentId);
    const body = cleanHtml(read(form, 'body'));
    const [existing] = await db.select().from(tournamentRules).where(and(eq(tournamentRules.tournamentId, tournamentId), eq(tournamentRules.status, 'DRAFT'))).limit(1);
    if (existing) await db.update(tournamentRules).set({ body, title: 'General rules' }).where(eq(tournamentRules.id, existing.id));
    else await db.insert(tournamentRules).values({ tournamentId, title: 'General rules', body, status: 'DRAFT' });
    await audit(actor.id, 'tournament.rules', 'tournament', tournamentId, { saved: true });
    touch(`/tournaments/${tournamentId}`);
  } catch (error) { return failure(error); }
  redirect(`/tournaments/${tournamentId}?tab=groups`);
}

export async function deleteDraftTournamentAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission('tournament.write');
    const id = read(form, 'id');
    const tournament = await ownedTournament(id);
    if (tournament.status !== 'DRAFT') throw new AppError('TOURNAMENT_NOT_DRAFT', 'Only a draft tournament can be discarded.');
    const clubIds = (await db.select({ id: teams.id }).from(teams).where(eq(teams.tournamentId, id))).map((row) => row.id);
    await db.delete(certificates).where(eq(certificates.tournamentId, id));
    await db.delete(media).where(eq(media.tournamentId, id));
    await db.delete(matches).where(eq(matches.tournamentId, id));
    await db.update(news).set({ tournamentId: null }).where(eq(news.tournamentId, id));
    if (clubIds.length) {
      await db.delete(playerTeamHistory).where(or(inArray(playerTeamHistory.toTeamId, clubIds), inArray(playerTeamHistory.fromTeamId, clubIds)));
      const squadIds = (await db.select({ id: players.id }).from(players).where(inArray(players.teamId, clubIds))).map((row) => row.id);
      if (squadIds.length) await db.delete(matchEvents).where(inArray(matchEvents.playerId, squadIds));
      await db.delete(players).where(inArray(players.teamId, clubIds));
    }
    await db.delete(tournaments).where(eq(tournaments.id, id));
    await audit(actor.id, 'tournament.delete_draft', 'tournament', id, { name: tournament.name });
    touch('/tournaments', '/dashboard');
  } catch (error) { return failure(error); }
  redirect('/tournaments');
}

function goalEvents(form: FormData) {
  const teams = many(form, 'goalTeamId');
  const players = many(form, 'goalPlayerId');
  const minutes = many(form, 'goalMinute');
  return teams.flatMap((teamId, index) => teamId ? [{ eventType: 'GOAL' as const, teamId, playerId: players[index] || undefined, minute: parseClockMinutes(minutes[index] ?? '', 0) }] : []);
}

export async function saveMatchScoreAction(_: ActionState, form: FormData): Promise<ActionState> {
  const tournamentId = read(form, 'tournamentId');
  try {
    const actor = await requirePermission('match.score');
    const matchId = read(form, 'matchId');
    const [match] = await db.select().from(matches).where(and(eq(matches.id, matchId), eq(matches.tournamentId, tournamentId))).limit(1);
    if (!match) throw new AppError('NOT_FOUND', 'Match was not found.', 404);
    const events = goalEvents(form);
    const finished = read(form, 'finished') === 'on';
    const scores = events.length ? scoresFromGoals(match.homeTeamId, match.awayTeamId, events) : { homeScore: match.homeScore, awayScore: match.awayScore };
    if (finished || match.status === 'FINISHED') {
      if (match.status === 'FINISHED' && !actor.roles.includes('SUPER_ADMIN')) throw new AppError('FORBIDDEN', 'Only Super Admin may correct a finished score.', 403);
      await matchService.finalize(matchId, actor.id, { ...scores, events }, match.status === 'FINISHED');
    } else if (events.length) await matchService.recordGoals(matchId, actor.id, events);
    touch(`/tournaments/${tournamentId}`, '/dashboard');
  } catch (error) { return failure(error); }
  redirect(`/tournaments/${tournamentId}?tab=matches`);
}

export async function createTournamentMatchAction(_: ActionState, form: FormData): Promise<ActionState> {
  const tournamentId = read(form, 'tournamentId');
  try {
    const actor = await requirePermission('match.schedule');
    const stageId = read(form, 'stageId');
    const [stage] = await db.select({ stage: stages, group: ageGroups }).from(stages).innerJoin(ageGroups, eq(stages.ageGroupId, ageGroups.id)).where(and(eq(stages.id, stageId), eq(ageGroups.tournamentId, tournamentId))).limit(1);
    if (!stage) throw new AppError('NOT_FOUND', 'Group was not found.', 404);
    if (read(form, 'ageGroupId') && read(form, 'ageGroupId') !== stage.group.id) throw new AppError('VALIDATION_ERROR', 'The age category does not match the selected group.');
    const homeTeamId = read(form, 'homeTeamId');
    const awayTeamId = read(form, 'awayTeamId');
    const startsAt = new Date(read(form, 'startsAt'));
    if (!homeTeamId || homeTeamId === awayTeamId) throw new AppError('VALIDATION_ERROR', 'Choose two different teams.');
    if (Number.isNaN(startsAt.getTime())) throw new AppError('VALIDATION_ERROR', 'Match date is required.');
    const participants = await db.select({ id: teams.id }).from(teams).where(and(eq(teams.tournamentId, tournamentId), eq(teams.stageId, stageId), inArray(teams.id, [homeTeamId, awayTeamId])));
    if (participants.length !== 2) throw new AppError('VALIDATION_ERROR', 'Both teams must belong to the selected group.');
    const created = await scheduleService.create({ tournamentId, ageGroupId: stage.group.id, stageId, homeTeamId, awayTeamId, pitchId: read(form, 'pitchId') || undefined, startsAt, scheduledDurationMinutes: parseClockMinutes(read(form, 'duration'), 60), bufferMinutes: parseClockMinutes(read(form, 'buffer'), 10) }, actor.id);
    const status = read(form, 'status');
    if (status === 'LIVE') await matchService.setLive(created.id, actor.id, 0);
    else if (status === 'POSTPONED' || status === 'CANCELLED') await db.update(matches).set({ status, updatedAt: new Date() }).where(eq(matches.id, created.id));
    touch(`/tournaments/${tournamentId}`, '/dashboard');
  } catch (error) { return failure(error); }
  redirect(`/tournaments/${tournamentId}?tab=matches`);
}

export async function saveHighlightAction(_: ActionState, form: FormData): Promise<ActionState> {
  const tournamentId = read(form, 'tournamentId');
  try {
    const actor = await requirePermission('content.publish');
    const title = read(form, 'title');
    const matchId = read(form, 'matchId');
    const url = read(form, 'url');
    const playerId = read(form, 'playerId');
    if (!title || !matchId || !url) throw new AppError('VALIDATION_ERROR', 'Title, match, and video URL are required.');
    const [match] = await db.select({ id: matches.id }).from(matches).where(and(eq(matches.id, matchId), eq(matches.tournamentId, tournamentId))).limit(1);
    if (!match) throw new AppError('NOT_FOUND', 'Match was not found in this tournament.', 404);
    if (playerId) {
      const [player] = await db.select({ id: players.id }).from(players).innerJoin(teams, eq(players.teamId, teams.id)).where(and(eq(players.id, playerId), eq(teams.tournamentId, tournamentId))).limit(1);
      if (!player) throw new AppError('NOT_FOUND', 'Player was not found in this tournament.', 404);
    }
    await db.insert(media).values({ tournamentId, matchId, highlightPlayerId: playerId || null, type: 'HIGHLIGHT', title, path: url, externalUrl: url, mimeType: 'video/url', status: 'PUBLISHED', createdBy: actor.id });
    touch(`/tournaments/${tournamentId}`);
  } catch (error) { return failure(error); }
  redirect(`/tournaments/${tournamentId}?tab=highlights`);
}

export async function saveCertificateTemplateAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission('content.publish');
    const name = read(form, 'name');
    if (!name) throw new AppError('VALIDATION_ERROR', 'Template name is required.');
    const logo = uploadFile(form, 'logo');
    const layout = uploadFile(form, 'layout');
    const [row] = await db.insert(certificateTemplates).values({ name, description: read(form, 'description') || null, logoPath: logo ? await saveUpload(logo) : null, layoutPath: layout ? await saveUpload(layout) : null }).returning();
    await audit(actor.id, 'certificate_template.create', 'certificate_template', row.id, { name });
    touch('/certificate-templates');
  } catch (error) { return failure(error); }
  redirect('/certificate-templates');
}

export async function saveTournamentCertificateAction(_: ActionState, form: FormData): Promise<ActionState> {
  const tournamentId = read(form, 'tournamentId');
  try {
    const actor = await requirePermission('content.publish');
    const title = read(form, 'title');
    const templateId = read(form, 'templateId');
    const teamId = read(form, 'teamId');
    if (!title || !templateId) throw new AppError('VALIDATION_ERROR', 'Title and template are required.');
    await ownedTournament(tournamentId);
    const [template] = await db.select({ id: certificateTemplates.id }).from(certificateTemplates).where(eq(certificateTemplates.id, templateId)).limit(1);
    if (!template) throw new AppError('NOT_FOUND', 'Certificate template was not found.', 404);
    if (teamId) {
      const [team] = await db.select({ id: teams.id }).from(teams).where(and(eq(teams.id, teamId), eq(teams.tournamentId, tournamentId))).limit(1);
      if (!team) throw new AppError('NOT_FOUND', 'Team was not found in this tournament.', 404);
    }
    await db.insert(tournamentCertificates).values({ tournamentId, templateId, title, kind: read(form, 'kind') === 'CHAMPION' ? 'CHAMPION' : 'PARTICIPANT', teamId: teamId || null, active: read(form, 'active') === 'on' });
    await audit(actor.id, 'tournament_certificate.create', 'tournament', tournamentId, { title });
    touch(`/tournaments/${tournamentId}`);
  } catch (error) { return failure(error); }
  redirect(`/tournaments/${tournamentId}?tab=certificates`);
}

export async function createFigmaTeamAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission('team.write');
    const name = read(form, 'name');
    if (name.length < 2) throw new AppError('VALIDATION_ERROR', 'Team name is required.');
    const stageId = read(form, 'stageId');
    const ageGroupId = read(form, 'ageGroupId');
    let tournamentId = '';
    let groupId = '';
    let assignedStage: string | undefined;
    if (stageId) {
      if (!uuidPattern.test(stageId)) throw new AppError('VALIDATION_ERROR', 'Choose a group from this tournament.');
      const [stage] = await db.select({ stage: stages, group: ageGroups }).from(stages).innerJoin(ageGroups, eq(stages.ageGroupId, ageGroups.id)).where(eq(stages.id, stageId)).limit(1);
      if (!stage || (ageGroupId && ageGroupId !== stage.group.id)) throw new AppError('VALIDATION_ERROR', 'The group does not belong to the selected age category.');
      tournamentId = stage.group.tournamentId;
      groupId = stage.group.id;
      assignedStage = stage.stage.id;
    } else if (ageGroupId) {
      if (!uuidPattern.test(ageGroupId)) throw new AppError('VALIDATION_ERROR', 'Choose an age category. A draft tournament can take a team once it has an age category.');
      const [group] = await db.select().from(ageGroups).where(eq(ageGroups.id, ageGroupId)).limit(1);
      if (!group) throw new AppError('VALIDATION_ERROR', 'Choose an age category. A draft tournament can take a team once it has an age category.');
      tournamentId = group.tournamentId;
      groupId = group.id;
    } else throw new AppError('VALIDATION_ERROR', 'Choose an age category. A draft tournament can take a team once it has an age category.');
    const logo = uploadFile(form, 'logo');
    const logoUrl = logo ? await saveUpload(logo) : null;
    const team = await teamService.create({ tournamentId, ageGroupId: groupId, ...(assignedStage ? { stageId: assignedStage } : {}), name }, actor.id);
    if (logoUrl) await db.update(teams).set({ crestUrl: logoUrl }).where(eq(teams.id, team.id));
    touch('/teams', '/dashboard', `/tournaments/${tournamentId}`);
  } catch (error) { return failure(error); }
  redirect('/teams');
}

export async function deleteTeamAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission('team.write');
    const id = read(form, 'teamId');
    const [used] = await db.select({ id: matches.id }).from(matches).where(or(eq(matches.homeTeamId, id), eq(matches.awayTeamId, id))).limit(1);
    if (used) throw new AppError('TEAM_IN_USE', 'This team is on a match and cannot be deleted.');
    const squadIds = (await db.select({ id: players.id }).from(players).where(eq(players.teamId, id))).map((row) => row.id);
    await db.update(certificates).set({ teamId: null }).where(eq(certificates.teamId, id));
    await db.delete(playerTeamHistory).where(or(eq(playerTeamHistory.toTeamId, id), eq(playerTeamHistory.fromTeamId, id)));
    if (squadIds.length) {
      await db.update(media).set({ highlightPlayerId: null }).where(inArray(media.highlightPlayerId, squadIds));
      await db.delete(matchEvents).where(inArray(matchEvents.playerId, squadIds));
      await db.delete(players).where(eq(players.teamId, id));
    }
    await db.delete(matchEvents).where(eq(matchEvents.teamId, id));
    await db.delete(teams).where(eq(teams.id, id));
    touch('/teams', '/dashboard');
  } catch (error) { return failure(error); }
  redirect('/teams');
}

export async function saveTeamSetupAction(_: ActionState, form: FormData): Promise<ActionState> {
  const teamId = read(form, 'teamId');
  try {
    const actor = await requirePermission('team.write');
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team) throw new AppError('NOT_FOUND', 'Team was not found.', 404);
    await db.update(teams).set({ homeJersey: { color: read(form, 'homeJersey') }, awayJersey: { color: read(form, 'awayJersey') }, updatedAt: new Date() }).where(eq(teams.id, teamId));
    await db.update(ageGroups).set({ maxSquadSize: Number(read(form, 'maxSquadSize') || 20) }).where(eq(ageGroups.id, team.ageGroupId));
    const existingCoaches = await db.select({ coachName: coachNameSubmissions.coachName }).from(coachNameSubmissions).where(and(eq(coachNameSubmissions.teamId, teamId), eq(coachNameSubmissions.status, 'APPROVED')));
    const known = new Set(existingCoaches.map((row) => row.coachName.trim().toLowerCase()));
    for (const coachName of [read(form, 'coach1'), read(form, 'coach2')].filter(Boolean)) {
      if (known.has(coachName.toLowerCase())) continue;
      await db.insert(coachNameSubmissions).values({ teamId, submittedBy: actor.id, coachName, status: 'APPROVED', reviewedBy: actor.id, reviewedAt: new Date() });
      known.add(coachName.toLowerCase());
    }
    await audit(actor.id, 'team.manual_setup', 'team', teamId, { name: team.name });
    touch('/teams', '/dashboard');
  } catch (error) { return failure(error); }
  redirect(`/teams?modal=team&id=${teamId}&panel=setup`);
}

export async function reviewTeamSetupAction(_: ActionState, form: FormData): Promise<ActionState> {
  const teamId = read(form, 'teamId');
  try {
    const actor = await requirePermission('coach.review');
    const approve = read(form, 'decision') === 'APPROVED';
    const reason = read(form, 'reason') || undefined;
    if (!approve && !reason) throw new AppError('VALIDATION_ERROR', 'A rejection reason is required.');
    const [coachRows, jerseyRows, playerRows] = await Promise.all([
      db.select().from(coachNameSubmissions).where(and(eq(coachNameSubmissions.teamId, teamId), eq(coachNameSubmissions.status, 'PENDING'))),
      db.select().from(jerseySubmissions).where(and(eq(jerseySubmissions.teamId, teamId), eq(jerseySubmissions.status, 'PENDING'))),
      db.select().from(playerSubmissions).where(and(eq(playerSubmissions.teamId, teamId), eq(playerSubmissions.status, 'PENDING'))),
    ]);
    if (!coachRows.length && !jerseyRows.length && !playerRows.length) throw new AppError('NOTHING_PENDING', 'This team has no pending coach, jersey, or player submission.');
    for (const row of coachRows) await submissionService.reviewCoachName(row.id, actor.id, approve, reason);
    for (const row of jerseyRows) await submissionService.reviewJersey(row.id, actor.id, approve, reason);
    for (const row of playerRows) await submissionService.reviewPlayer(row.id, actor.id, approve, reason);
    touch('/teams', '/players', '/coaches', '/dashboard');
  } catch (error) { return failure(error); }
  redirect(`/teams?modal=team&id=${teamId}&panel=${read(form, 'panel') || 'setup'}`);
}

export async function addPlayerAction(_: ActionState, form: FormData): Promise<ActionState> {
  const teamId = read(form, 'teamId');
  const back = read(form, 'back') || '/players';
  try {
    const actor = await requirePermission('team.write');
    const name = read(form, 'name');
    const jerseyNumber = Number(read(form, 'jerseyNumber'));
    if (name.length < 2 || !Number.isInteger(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99) throw new AppError('VALIDATION_ERROR', 'Player name and a jersey number from 1 to 99 are required.');
    const [team] = await db.select({ id: teams.id }).from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team) throw new AppError('NOT_FOUND', 'Team was not found.', 404);
    const photo = uploadFile(form, 'photo');
    const photoUrl = photo ? await saveUpload(photo) : null;
    const [player] = await db.insert(players).values({ teamId, name, position: read(form, 'position') || null, jerseyNumber, photoUrl, approvalStatus: 'APPROVED', status: 'ACTIVE' }).returning();
    await db.insert(playerTeamHistory).values({ playerId: player.id, toTeamId: teamId, changedBy: actor.id, note: 'Added by admin' });
    touch('/players', '/teams');
  } catch (error) { return failure(error); }
  redirect(back);
}

export async function savePitchModalAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission('tournament.write');
    const name = read(form, 'name');
    if (!name) throw new AppError('VALIDATION_ERROR', 'Venue name is required.');
    const tournamentId = read(form, 'tournamentId');
    await ownedTournament(tournamentId);
    const [venue] = await db.insert(venues).values({ tournamentId, name, address: read(form, 'address') || null, capacity: read(form, 'capacity') ? Number(read(form, 'capacity')) : null, mapUrl: read(form, 'mapUrl') || null }).returning();
    await db.insert(pitches).values({ venueId: venue.id, name });
    await audit(actor.id, 'venue.create', 'venue', venue.id, { name });
    touch('/venues');
  } catch (error) { return failure(error); }
  redirect('/venues');
}

export async function saveNewsPageAction(_: ActionState, form: FormData): Promise<ActionState> {
  let next: string | undefined;
  try {
    const actor = await requirePermission('content.publish');
    const title = read(form, 'title');
    const category = read(form, 'category');
    if (title.length < 2 || !category) throw new AppError('VALIDATION_ERROR', 'Title and category are required.');
    const cover = uploadFile(form, 'cover');
    const coverUrl = cover ? await saveUpload(cover) : read(form, 'existingCover') || null;
    const values = { tournamentId: read(form, 'tournamentId') || null, title, slug: await uniqueNewsSlug(title, read(form, 'id') || undefined), category, body: cleanHtml(read(form, 'body')), coverUrl, createdBy: actor.id };
    const publish = read(form, 'intent') === 'publish';
    const id = read(form, 'id');
    const statusValues = publish ? { status: 'PUBLISHED' as const, publishedAt: read(form, 'publishDate') ? day(read(form, 'publishDate')) : new Date(), deletedAt: null } : { status: 'DRAFT' as const };
    if (id) {
      const [updated] = await db.update(news).set({ ...values, ...statusValues, updatedAt: new Date() }).where(and(eq(news.id, id), isNull(news.deletedAt))).returning();
      if (!updated) throw new AppError('NOT_FOUND', 'News was not found.', 404);
      next = `/news/${updated.id}/edit`;
    } else {
      const [row] = await db.insert(news).values({ ...values, ...statusValues }).returning();
      next = publish ? '/news' : `/news/${row.id}/edit`;
    }
    touch('/news');
  } catch (error) { return failure(error); }
  redirect(next ?? '/news');
}

export async function sendNotificationAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission('notification.send');
    const title = read(form, 'title');
    const body = read(form, 'body');
    if (!title || !body) throw new AppError('VALIDATION_ERROR', 'Title and message are required.');
    const teamId = read(form, 'teamId');
    const [row] = await db.insert(notifications).values({ title, body, teamId: teamId || null }).returning();
    await audit(actor.id, 'notification.compose', 'notification', row.id, { title, teamId: teamId || 'ALL' });
    touch('/notifications');
  } catch (error) { return failure(error); }
  redirect('/notifications');
}

export async function overrideStandingAction(_: ActionState, form: FormData): Promise<ActionState> {
  const tournamentId = read(form, 'tournamentId');
  const stageId = read(form, 'stageId');
  try {
    const actor = await requirePermission('match.score');
    const position = Number(read(form, 'position'));
    if (!Number.isInteger(position) || position < 1) throw new AppError('VALIDATION_ERROR', 'Position must be a whole number starting at 1.');
    await standingsService.override(stageId, read(form, 'teamId'), position, read(form, 'reason'), actor.id);
    touch(`/tournaments/${tournamentId}`);
  } catch (error) { return failure(error); }
  redirect(`/tournaments/${tournamentId}?tab=groups&stage=${stageId}`);
}

export async function transferPlayerAction(_: ActionState, form: FormData): Promise<ActionState> {
  const back = read(form, 'back') || '/players';
  try {
    const actor = await requirePermission('team.write');
    const playerId = read(form, 'playerId');
    const teamId = read(form, 'teamId');
    const [player] = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!player || !team) throw new AppError('NOT_FOUND', 'Player or team was not found.', 404);
    if (player.teamId === teamId) throw new AppError('VALIDATION_ERROR', 'Choose a different team.');
    const jerseyNumber = Number(read(form, 'jerseyNumber') || player.jerseyNumber);
    if (!Number.isInteger(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99) throw new AppError('VALIDATION_ERROR', 'Jersey number must be from 1 to 99.');
    await db.update(players).set({ teamId, jerseyNumber, status: 'ACTIVE', updatedAt: new Date() }).where(eq(players.id, playerId));
    await db.insert(playerTeamHistory).values({ playerId, fromTeamId: player.teamId, toTeamId: teamId, changedBy: actor.id, note: 'Transferred by admin' });
    touch('/players', '/teams');
  } catch (error) { return failure(error); }
  redirect(back);
}
