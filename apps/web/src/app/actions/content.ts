'use server';

import { and, eq, isNull } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { certificateTemplates, jobOutbox, matches, media, news, notifications, players, teams, tournamentCertificates } from '@/db/schema';
import { AppError } from '@/lib/api/errors';
import { requirePermission } from '@/lib/auth/session';
import { cleanHtml } from '@/lib/domain/tournament-status';
import { saveUpload, uploadFile } from '@/lib/infra/uploads';
import { audit, day, failure, ownedTournament, read, refresh, uniqueNewsSlug, uuidPattern, type ActionState } from './shared';

export async function saveNewsAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission('content.publish');
    const existingId = read(form, 'id');
    const values = { tournamentId: read(form, 'tournamentId') || undefined, title: read(form, 'title'), slug: read(form, 'slug'), category: read(form, 'category') || undefined, body: read(form, 'body'), coverUrl: read(form, 'coverUrl') || undefined, createdBy: actor.id };
    if (existingId) {
      const [existing] = await db.select().from(news).where(eq(news.id, existingId)).limit(1);
      if (!existing) throw new AppError('NOT_FOUND', 'News item was not found.', 404);
      if (existing.status === 'PUBLISHED') await db.insert(news).values({ ...values, slug: `${values.slug}-${Date.now()}`, revisionOfId: existing.id, status: 'DRAFT' });
      else await db.update(news).set({ ...values, updatedAt: new Date() }).where(eq(news.id, existing.id));
    } else {
      await db.insert(news).values({ ...values, status: 'DRAFT' });
    }
    refresh('/news');
    return { message: existingId ? 'Draft revision saved; published version remains visible.' : 'News draft saved.' };
  } catch (error) {
    return failure(error);
  }
}

export async function publishNewsAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission('content.publish');
    const [row] = await db.update(news).set({ status: 'PUBLISHED', publishedAt: new Date(), deletedAt: null, updatedAt: new Date() }).where(eq(news.id, read(form, 'id'))).returning();
    if (!row) throw new AppError('NOT_FOUND', 'News item was not found.', 404);
    await audit(actor.id, 'news.publish', 'news', row.id, { title: row.title });
    refresh('/news');
    return { message: 'News published.' };
  } catch (error) {
    return failure(error);
  }
}

export async function unpublishNewsAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission('content.publish');
    const [row] = await db.update(news).set({ status: 'DRAFT', publishedAt: null, updatedAt: new Date() }).where(eq(news.id, read(form, 'id'))).returning();
    if (!row) throw new AppError('NOT_FOUND', 'News item was not found.', 404);
    await audit(actor.id, 'news.unpublish', 'news', row.id, { title: row.title });
    refresh('/news');
    return { message: 'News moved back to draft.' };
  } catch (error) {
    return failure(error);
  }
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
    refresh('/news');
  } catch (error) {
    return failure(error);
  }
  redirect(next ?? '/news');
}

export async function composeNotificationAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission('notification.send');
    const [row] = await db.insert(notifications).values({ userId: read(form, 'userId') || undefined, title: read(form, 'title'), body: read(form, 'body') }).returning();
    await db.insert(jobOutbox).values({ type: 'notification.compose', payload: { notificationId: row.id, userId: row.userId, title: row.title } });
    await audit(actor.id, 'notification.compose', 'notification', row.id, { title: row.title });
    refresh('/notifications');
    return { message: 'Notification queued for local delivery.' };
  } catch (error) {
    return failure(error);
  }
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
    refresh('/notifications');
  } catch (error) {
    return failure(error);
  }
  redirect('/notifications');
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
    refresh(`/tournaments/${tournamentId}`);
  } catch (error) {
    return failure(error);
  }
  redirect(`/tournaments/${tournamentId}?tab=highlights`);
}

export async function saveCertificateTemplateAction(_: ActionState, form: FormData): Promise<ActionState> {
  const back = read(form, 'back');
  const next = back.startsWith('/certificate-templates') && !back.startsWith('//') ? back : '/certificate-templates';
  try {
    const actor = await requirePermission('content.publish');
    const name = read(form, 'name');
    if (!name || name.length > 160) throw new AppError('VALIDATION_ERROR', 'Template name is required and must be 160 characters or fewer.');
    const description = read(form, 'description') || null;
    const logo = uploadFile(form, 'logo');
    const layout = uploadFile(form, 'layout');
    const logoPath = logo ? await saveUpload(logo) : null;
    const layoutPath = layout ? await saveUpload(layout) : null;
    const id = read(form, 'id');
    if (id) {
      if (!uuidPattern.test(id)) throw new AppError('NOT_FOUND', 'Certificate template was not found.', 404);
      const [current] = await db.select().from(certificateTemplates).where(eq(certificateTemplates.id, id)).limit(1);
      if (!current) throw new AppError('NOT_FOUND', 'Certificate template was not found.', 404);
      await db.update(certificateTemplates).set({ name, description, logoPath: logoPath ?? current.logoPath, layoutPath: layoutPath ?? current.layoutPath }).where(eq(certificateTemplates.id, id));
      await audit(actor.id, 'certificate_template.update', 'certificate_template', id, { name });
    } else {
      const [row] = await db.insert(certificateTemplates).values({ name, description, logoPath, layoutPath }).returning();
      await audit(actor.id, 'certificate_template.create', 'certificate_template', row.id, { name });
    }
    refresh('/certificate-templates');
  } catch (error) {
    return failure(error);
  }
  redirect(next);
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
    refresh(`/tournaments/${tournamentId}`);
  } catch (error) {
    return failure(error);
  }
  redirect(`/tournaments/${tournamentId}?tab=certificates`);
}
