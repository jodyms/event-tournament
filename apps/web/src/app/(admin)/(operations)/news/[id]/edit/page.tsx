import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { NewsEditor } from '@/components/news-editor';
import { db } from '@/db/client';
import { news } from '@/db/schema';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select().from(news).where(eq(news.id, id)).limit(1);
  if (!row || row.deletedAt) notFound();
  return <NewsEditor row={row} />;
}
