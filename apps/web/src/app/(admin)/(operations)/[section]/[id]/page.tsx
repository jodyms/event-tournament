import { EntityDetail } from '@/components/entity-detail';

export default async function Page({ params }: { params: Promise<{ section: string; id: string }> }) {
  const { section, id } = await params;
  return <EntityDetail section={section} id={id} />;
}
