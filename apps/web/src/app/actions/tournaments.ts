'use server';

import { and, eq, inArray, or } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { ageGroups, certificates, matchEvents, matches, media, news, pitches, playerTeamHistory, players, stages, teams, tournamentRules, tournaments, venues } from '@/db/schema';
import { AppError } from '@/lib/api/errors';
import { tournamentSchema } from '@/lib/api/validation';
import { requirePermission } from '@/lib/auth/session';
import { teamService, tournamentService } from '@/lib/domain/services';
import { cleanHtml } from '@/lib/domain/tournament-status';
import { saveUpload, uploadFile } from '@/lib/infra/uploads';
import { audit, date, day, failure, footballSportId, many, optionalCapacity, ownedTournament, read, refresh, storedStatus, uniqueSlug, uuidPattern, type ActionState } from './shared';

const tournamentTabs = new Set(['groups', 'teams', 'matches', 'highlights', 'certificates']);

export async function createTournamentAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission('tournament.write');
    await tournamentService.create(tournamentSchema.parse({ sportId: read(form, 'sportId'), name: read(form, 'name'), slug: read(form, 'slug'), description: read(form, 'description') || undefined, startsAt: date(form, 'startsAt'), endsAt: date(form, 'endsAt') }), actor.id);
    refresh('/tournaments', '/dashboard');
    return { message: 'Tournament created as draft.' };
  } catch (error) {
    return failure(error);
  }
}

export async function createAgeGroupAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission('tournament.write');
    const [row] = await db.insert(ageGroups).values({ tournamentId: read(form, 'tournamentId'), name: read(form, 'name'), maxSquadSize: Number(read(form, 'maxSquadSize') || 20), sortOrder: Number(read(form, 'sortOrder') || 0) }).returning();
    await audit(actor.id, 'age_group.create', 'age_group', row.id, { name: row.name });
    refresh('/age-groups', '/teams');
    return { message: 'Age group created.' };
  } catch (error) {
    return failure(error);
  }
}

export async function createStageAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission('tournament.write');
    const [row] = await db.insert(stages).values({ ageGroupId: read(form, 'ageGroupId'), name: read(form, 'name'), type: read(form, 'type') || 'GROUP', sortOrder: Number(read(form, 'sortOrder') || 0) }).returning();
    await audit(actor.id, 'stage.create', 'stage', row.id, { name: row.name });
    refresh('/stages', '/teams');
    return { message: 'Stage created.' };
  } catch (error) {
    return failure(error);
  }
}

export async function createVenueAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission('tournament.write');
    const [row] = await db.insert(venues).values({ tournamentId: read(form, 'tournamentId'), name: read(form, 'name'), address: read(form, 'address') || undefined, capacity: read(form, 'capacity') ? Number(read(form, 'capacity')) : undefined, mapUrl: read(form, 'mapUrl') || undefined }).returning();
    await audit(actor.id, 'venue.create', 'venue', row.id, { name: row.name });
    refresh('/venues');
    return { message: 'Venue created.' };
  } catch (error) {
    return failure(error);
  }
}

export async function createPitchAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission('tournament.write');
    const [row] = await db.insert(pitches).values({ venueId: read(form, 'venueId'), name: read(form, 'name') }).returning();
    await audit(actor.id, 'pitch.create', 'pitch', row.id, { name: row.name });
    refresh('/venues', '/matches');
    return { message: 'Pitch created.' };
  } catch (error) {
    return failure(error);
  }
}

export async function updateTournamentStatusAction(_: ActionState, form: FormData): Promise<ActionState> {
  const id = read(form, 'id');
  const tab = read(form, 'tab');
  try {
    const actor = await requirePermission('tournament.write');
    const current = await ownedTournament(id);
    const choice = read(form, 'status');
    if (choice !== 'DRAFT' && choice !== 'PUBLISHED' && choice !== 'ARCHIVED' && choice !== 'CANCELLED') {
      throw new AppError('VALIDATION_ERROR', 'Choose a tournament status.');
    }
    await db.update(tournaments).set({ status: choice, updatedAt: new Date() }).where(eq(tournaments.id, id));
    await audit(actor.id, 'tournament.status', 'tournament', id, { from: current.status, status: choice });
    refresh('/tournaments', '/dashboard', `/tournaments/${id}`);
  } catch (error) {
    return failure(error);
  }
  redirect(tournamentTabs.has(tab) ? `/tournaments/${id}?tab=${tab}` : `/tournaments/${id}`);
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
    refresh('/tournaments', '/dashboard');
  } catch (error) {
    return failure(error);
  }
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
    refresh(`/tournaments/${tournamentId}`);
  } catch (error) {
    return failure(error);
  }
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
      } else {
        await db.insert(stages).values({ ageGroupId: group.id, name: names[index], type, sortOrder: index + 1 });
      }
    }
    await audit(actor.id, 'tournament.stages', 'tournament', tournamentId, { count: names.filter(Boolean).length });
  } catch (error) {
    return failure(error);
  }
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
    } else if (name.length >= 2) {
      await teamService.create({ tournamentId, ageGroupId: stage.group.id, stageId, name }, actor.id);
    } else {
      throw new AppError('VALIDATION_ERROR', name ? 'Team name is required.' : 'Select a team or type a new team name.');
    }
    refresh(`/tournaments/${tournamentId}`, '/teams');
  } catch (error) {
    return failure(error);
  }
  redirect(`/tournaments/${tournamentId}/setup?step=stages`);
}

export async function removeStageTeamAction(_: ActionState, form: FormData): Promise<ActionState> {
  const tournamentId = read(form, 'tournamentId');
  try {
    await requirePermission('team.write');
    const [updated] = await db.update(teams).set({ stageId: null, updatedAt: new Date() }).where(and(eq(teams.id, read(form, 'teamId')), eq(teams.tournamentId, tournamentId))).returning();
    if (!updated) throw new AppError('NOT_FOUND', 'Team was not found in this tournament.', 404);
    refresh(`/tournaments/${tournamentId}`, '/teams');
  } catch (error) {
    return failure(error);
  }
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
    refresh('/venues');
  } catch (error) {
    return failure(error);
  }
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
    refresh(`/tournaments/${tournamentId}`);
  } catch (error) {
    return failure(error);
  }
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
    refresh('/tournaments', '/dashboard');
  } catch (error) {
    return failure(error);
  }
  redirect('/tournaments');
}

export async function savePitchModalAction(_: ActionState, form: FormData): Promise<ActionState> {
  const back = read(form, 'back');
  const next = back.startsWith('/venues') && !back.startsWith('//') ? back : '/venues';
  try {
    const actor = await requirePermission('tournament.write');
    const name = read(form, 'name');
    if (!name) throw new AppError('VALIDATION_ERROR', 'Venue name is required.');
    if (name.length > 100) throw new AppError('VALIDATION_ERROR', 'Pitch name must be 100 characters or fewer.');
    const tournamentId = read(form, 'tournamentId');
    await ownedTournament(tournamentId);
    const capacity = optionalCapacity(read(form, 'capacity'));
    const address = read(form, 'address') || null;
    const mapUrl = read(form, 'mapUrl') || null;
    const venueId = read(form, 'venueId');
    if (venueId) {
      if (!uuidPattern.test(venueId)) throw new AppError('NOT_FOUND', 'Pitch was not found.', 404);
      const [current] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
      if (!current) throw new AppError('NOT_FOUND', 'Pitch was not found.', 404);
      const pitchRows = await db.select().from(pitches).where(eq(pitches.venueId, venueId));
      if (tournamentId !== current.tournamentId && pitchRows.length) {
        const [used] = await db.select({ id: matches.id }).from(matches).where(inArray(matches.pitchId, pitchRows.map((pitch) => pitch.id))).limit(1);
        if (used) throw new AppError('PITCH_IN_USE', 'This pitch is on a match. You can change its name, address, capacity, and map, but not its tournament.');
      }
      await db.update(venues).set({ tournamentId, name, address, capacity, mapUrl }).where(eq(venues.id, venueId));
      const renamed = pitchRows.length === 1 ? pitchRows : pitchRows.filter((pitch) => pitch.name === current.name);
      if (renamed.length) await db.update(pitches).set({ name }).where(inArray(pitches.id, renamed.map((pitch) => pitch.id)));
      await audit(actor.id, 'venue.update', 'venue', venueId, { name, tournamentId });
      refresh('/venues', `/tournaments/${current.tournamentId}`, `/tournaments/${tournamentId}`);
    } else {
      const [venue] = await db.insert(venues).values({ tournamentId, name, address, capacity, mapUrl }).returning();
      await db.insert(pitches).values({ venueId: venue.id, name });
      await audit(actor.id, 'venue.create', 'venue', venue.id, { name });
      refresh('/venues');
    }
  } catch (error) {
    return failure(error);
  }
  redirect(next);
}
