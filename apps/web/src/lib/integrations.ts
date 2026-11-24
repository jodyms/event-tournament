import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { eq, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { jobOutbox, notifications } from '@/db/schema';

/** Provider seams: replace these implementations without changing domain services. */
export interface StorageProvider { put(path: string, contents: Uint8Array): Promise<string>; }
export interface MailProvider { send(message: { to: string; subject: string; text: string }): Promise<void>; }
export interface PushProvider { send(message: { userId: string; title: string; body: string }): Promise<void>; }

const root = path.join(process.cwd(), 'local-data');
export const localStorage: StorageProvider = { async put(file, contents) { const absolute = path.join(root, file); await mkdir(path.dirname(absolute), { recursive: true }); await writeFile(absolute, contents); return file; } };
export const localMail: MailProvider = { async send(message) { await localStorage.put(`mail/${Date.now()}-${crypto.randomUUID()}.json`, Buffer.from(JSON.stringify(message, null, 2))); } };
export const localPush: PushProvider = { async send(message) { await localStorage.put(`push/${Date.now()}-${crypto.randomUUID()}.json`, Buffer.from(JSON.stringify(message, null, 2))); } };

const escapePdf = (value: string) => value.replace(/[\\()]/g, '\\$&');
export async function createFixedCertificate(input: { recipientName: string; tournamentName: string; category: string; date: string; verificationCode: string }) {
  const lines = ['TYC TOURNAMENT CERTIFICATE', `Presented to: ${input.recipientName}`, `Tournament: ${input.tournamentName}`, `Category: ${input.category}`, `Date: ${input.date}`, `Verification: ${input.verificationCode}`];
  const stream = lines.map((line, index) => `BT /F1 ${index === 0 ? 22 : 13} Tf 72 ${720 - index * 58} Td (${escapePdf(line)}) Tj ET`).join('\n');
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>', `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let output = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(output)); output += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const start = Buffer.byteLength(output); output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return localStorage.put(`certificates/${input.verificationCode}.pdf`, Buffer.from(output));
}

export async function processLocalOutbox(limit = 50) {
  const jobs = await db.select().from(jobOutbox).where(isNull(jobOutbox.processedAt)).limit(limit);
  for (const job of jobs) {
    try {
      await localStorage.put(`outbox/${job.id}.json`, Buffer.from(JSON.stringify({ type: job.type, payload: job.payload, createdAt: job.createdAt })));
      if (job.type === 'password.reset.requested' && typeof job.payload.email === 'string' && typeof job.payload.resetToken === 'string') await localMail.send({ to: job.payload.email, subject: 'TYC password reset', text: `Open http://localhost:3000/reset-password?token=${job.payload.resetToken} or paste this one-time token: ${job.payload.resetToken}` });
      if (job.type === 'notification.compose' && typeof job.payload.notificationId === 'string') await db.update(notifications).set({ deliveryStatus: 'DELIVERED', deliveredAt: new Date() }).where(eq(notifications.id, job.payload.notificationId));
      await db.update(jobOutbox).set({ processedAt: new Date(), attempts: job.attempts + 1 }).where(eq(jobOutbox.id, job.id));
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Local delivery failed';
      if (job.type === 'notification.compose' && typeof job.payload.notificationId === 'string') await db.update(notifications).set({ deliveryStatus: 'FAILED', failureReason: reason }).where(eq(notifications.id, job.payload.notificationId));
      await db.update(jobOutbox).set({ attempts: job.attempts + 1 }).where(eq(jobOutbox.id, job.id));
    }
  }
  return jobs.length;
}
