import { z } from 'zod';

export const paginationSchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20), q: z.string().trim().max(160).optional() });
export const loginSchema = z.object({ email: z.string().email().max(320), password: z.string().min(8).max(200) });
export const tournamentSchema = z.object({ sportId: z.string().uuid(), name: z.string().trim().min(2).max(160), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180), description: z.string().max(4000).optional(), startsAt: z.coerce.date(), endsAt: z.coerce.date() }).refine((value) => value.endsAt >= value.startsAt, { message: 'End date must not be before start date.', path: ['endsAt'] });
export const teamSchema = z.object({ tournamentId: z.string().uuid(), ageGroupId: z.string().uuid(), stageId: z.string().uuid().optional(), name: z.string().trim().min(2).max(140) });
export const playerPayloadSchema = z.object({ name: z.string().trim().min(2).max(160), jerseyNumber: z.number().int().min(1).max(99), position: z.string().trim().max(60).optional(), photoUrl: z.string().url().optional() });
export const coachNamesSchema = z.object({ names: z.array(z.string().trim().min(1).max(160)).min(1).max(10) });
export const jerseyColorsSchema = z.object({ home: z.string().trim().min(1).max(40), away: z.string().trim().min(1).max(40) });
export const logoutSchema = z.object({ refreshToken: z.string().trim().min(20).max(200) });
export const matchSchema = z.object({ tournamentId: z.string().uuid(), ageGroupId: z.string().uuid(), stageId: z.string().uuid(), homeTeamId: z.string().uuid(), awayTeamId: z.string().uuid(), pitchId: z.string().uuid().optional(), startsAt: z.coerce.date(), scheduledDurationMinutes: z.number().int().min(10).max(240).default(60), bufferMinutes: z.number().int().min(0).max(120).default(10) }).refine((value) => value.homeTeamId !== value.awayTeamId, { message: 'Home and away teams must differ.', path: ['awayTeamId'] });
export const scoreSchema = z.object({ homeScore: z.number().int().min(0).max(99), awayScore: z.number().int().min(0).max(99), events: z.array(z.object({ eventType: z.literal('GOAL'), teamId: z.string().uuid(), playerId: z.string().uuid().optional(), minute: z.number().int().min(0).max(180) })).default([]) });
