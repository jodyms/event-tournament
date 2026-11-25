import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { ageGroups, auditLogs, news, sports, stages, tournaments } from '@/db/schema';
import { AppError } from '@/lib/api/errors';
import { parseClockMinutes, slugify } from '@/lib/domain/tournament-status';

export type ActionState = { error?: string; message?: string; fields?: Record<string, string> };

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const read = (form: FormData, name: string) => String(form.get(name) ?? '').trim();
export const many = (form: FormData, name: string) => form.getAll(name).map((value) => String(value).trim());
export const date = (form: FormData, name: string) => new Date(read(form, name));
export const refresh = (...paths: string[]) => paths.forEach((path) => revalidatePath(path));

export function requireConfirmed(form: FormData) {
  if (read(form, 'confirmed') !== 'on') {
    throw new AppError('CONFIRMATION_REQUIRED', 'Confirm that you understand this official change before continuing.');
  }
}

export function day(value: string, end = false) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) {
    throw new AppError('VALIDATION_ERROR', 'Start and end dates are required.');
  }
  return new Date(`${value.slice(0, 10)}T${end ? '23:59:59' : '00:00:00'}`);
}

export function optionalCapacity(value: string) {
  if (!value) return null;
  const capacity = Number(value);
  if (!Number.isInteger(capacity) || capacity < 0) {
    throw new AppError('VALIDATION_ERROR', 'Capacity must be a whole number of zero or more.');
  }
  return capacity;
}

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
    } else {
      current = undefined;
    }
  }
  return parts.join(' ');
}

export function failure(error: unknown): ActionState {
  if (error instanceof AppError) return { error: error.message, fields: error.fields };
  const text = errorText(error);
  if (text.includes('player_team_jersey')) return { error: 'That jersey number is already used on this team.' };
  if (text.includes('team_tournament_name')) return { error: 'A team with this name already exists in the tournament.' };
  if (text.includes('age_group_tournament_name')) return { error: 'That age category name is already used in this tournament.' };
  return { error: 'Unable to complete the request. Please review the form and try again.' };
}

export async function audit(actorId: string, action: string, entityType: string, entityId: string, after: Record<string, unknown>) {
  await db.insert(auditLogs).values({ actorId, action, entityType, entityId, after });
}

export async function footballSportId() {
  const [sport] = await db.select().from(sports).where(eq(sports.code, 'FOOTBALL')).limit(1);
  if (!sport) throw new AppError('SPORT_MISSING', 'Seed the Football sport before creating a tournament.');
  return sport.id;
}

export async function uniqueSlug(name: string, ignoreId?: string) {
  const base = slugify(name);
  for (let attempt = 1; attempt < 40; attempt += 1) {
    const slug = attempt === 1 ? base : `${base}-${attempt}`.slice(0, 180);
    const [found] = await db.select({ id: tournaments.id }).from(tournaments).where(eq(tournaments.slug, slug)).limit(1);
    if (!found || found.id === ignoreId) return slug;
  }
  throw new AppError('SLUG_TAKEN', 'Choose a different tournament name.');
}

export async function uniqueNewsSlug(title: string, ignoreId?: string) {
  const base = slugify(title);
  for (let attempt = 1; attempt < 40; attempt += 1) {
    const slug = attempt === 1 ? base : `${base}-${attempt}`.slice(0, 220);
    const [found] = await db.select({ id: news.id }).from(news).where(eq(news.slug, slug)).limit(1);
    if (!found || found.id === ignoreId) return slug;
  }
  throw new AppError('SLUG_TAKEN', 'Choose a different news title.');
}

export function storedStatus(choice: string): 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'CANCELLED' {
  if (choice === 'PUBLISHED' || choice === 'ON_GOING') return 'PUBLISHED';
  if (choice === 'CANCELLED') return 'CANCELLED';
  if (choice === 'ARCHIVED') return 'ARCHIVED';
  return 'DRAFT';
}

export async function ownedTournament(id: string) {
  if (!uuidPattern.test(id)) throw new AppError('NOT_FOUND', 'Tournament was not found.', 404);
  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
  if (!tournament) throw new AppError('NOT_FOUND', 'Tournament was not found.', 404);
  return tournament;
}

export async function teamPlacement(stageId: string, ageGroupId: string) {
  if (stageId) {
    if (!uuidPattern.test(stageId)) throw new AppError('VALIDATION_ERROR', 'Choose a group from this tournament.');
    const [stage] = await db
      .select({ stage: stages, group: ageGroups })
      .from(stages)
      .innerJoin(ageGroups, eq(stages.ageGroupId, ageGroups.id))
      .where(eq(stages.id, stageId))
      .limit(1);
    if (!stage || (ageGroupId && ageGroupId !== stage.group.id)) {
      throw new AppError('VALIDATION_ERROR', 'The group does not belong to the selected age category.');
    }
    return { tournamentId: stage.group.tournamentId, ageGroupId: stage.group.id, stageId: stage.stage.id };
  }
  if (!ageGroupId || !uuidPattern.test(ageGroupId)) {
    throw new AppError('VALIDATION_ERROR', 'Choose an age category. A draft tournament can take a team once it has an age category.');
  }
  const [group] = await db.select().from(ageGroups).where(eq(ageGroups.id, ageGroupId)).limit(1);
  if (!group) {
    throw new AppError('VALIDATION_ERROR', 'Choose an age category. A draft tournament can take a team once it has an age category.');
  }
  return { tournamentId: group.tournamentId, ageGroupId: group.id, stageId: undefined as string | undefined };
}

export function goalEvents(form: FormData) {
  const teamIds = many(form, 'goalTeamId');
  const playerIds = many(form, 'goalPlayerId');
  const minutes = many(form, 'goalMinute');
  return teamIds.flatMap((teamId, index) =>
    teamId ? [{ eventType: 'GOAL' as const, teamId, playerId: playerIds[index] || undefined, minute: parseClockMinutes(minutes[index] ?? '', 0) }] : [],
  );
}
