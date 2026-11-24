import { OperationsPage } from '@/components/operations-page';
export default function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) { return <OperationsPage section="highlights" searchParams={searchParams} />; }
