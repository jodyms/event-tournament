import Link from 'next/link';
import { and, asc, count, desc, eq, ilike, isNull, type SQL } from 'drizzle-orm';
import { sendNotificationAction } from '@/app/actions/content';
import { BoundForm, SubmitButton } from '@/components/ui/bound-form';
import { DataTable } from '@/components/ui/data-table';
import { ListFilters } from '@/components/ui/list-filters';
import { Modal } from '@/components/ui/modal';
import { Pager } from '@/components/ui/pager';
import { db } from '@/db/client';
import { notifications, teams } from '@/db/schema';
import { pageWindow, shortDate, withParams } from '@/lib/domain/tournament-status';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const clauses = [query.q ? ilike(notifications.title, `%${query.q}%`) : undefined, query.teamId === 'ALL' ? isNull(notifications.teamId) : query.teamId ? eq(notifications.teamId, query.teamId) : undefined].filter((clause): clause is SQL => Boolean(clause));
  const where = clauses.length ? and(...clauses) : undefined;
  const [totalRow] = await db.select({ value: count() }).from(notifications).where(where);
  const total = Number(totalRow?.value ?? 0);
  const window = pageWindow(query.page, total);
  const [rows, clubRows] = await Promise.all([
    db.select({ notification: notifications, team: teams }).from(notifications).leftJoin(teams, eq(notifications.teamId, teams.id)).where(where).orderBy(desc(notifications.createdAt)).limit(window.size).offset(window.start),
    db.select().from(teams).orderBy(asc(teams.name)),
  ]);
  const keep = { q: query.q, teamId: query.teamId };
  return <section>
    <header className="figma-heading"><div><h1>Management Notification</h1><p>An empty team means the message is stored for all teams. Delivery to phones stays in the worker.</p></div><Link className="dark-button" href={withParams('/notifications', keep, { modal: 'notification' })}>Send notification</Link></header>
    <div className="figma-panel module-panel">
      <ListFilters action="/notifications" query={query.q} placeholder="Search title" filters={[{ name: 'teamId', label: 'All recipients', value: query.teamId, options: [{ value: 'ALL', label: 'All teams' }, ...clubRows.map((team) => ({ value: team.id, label: team.name }))] }]} />
      <DataTable columns={['Title', 'Message', 'Send to', 'Created']} empty="No notification yet." rows={rows.map((row) => ({ id: row.notification.id, cells: [row.notification.title, row.notification.body, row.team?.name ?? 'All teams', shortDate(row.notification.createdAt)] }))} />
      <Pager page={window.page} pages={window.pages} start={window.start} end={window.end} total={total} href={(page) => withParams('/notifications', keep, { page: String(page) })} />
    </div>
    {query.modal === 'notification' && <Modal closeHref={withParams('/notifications', keep, { modal: null })} title="Send notification"><BoundForm action={sendNotificationAction}><label>Title<input name="title" required /></label><label>Message<textarea name="body" required /></label><label>Send to<select name="teamId" defaultValue=""><option value="">All teams</option>{clubRows.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><div className="form-actions"><SubmitButton>Save notification</SubmitButton></div></BoundForm></Modal>}
  </section>;
}
