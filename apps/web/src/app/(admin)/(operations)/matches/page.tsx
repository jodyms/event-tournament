import { OperationsPage } from '@/components/operations/operations-page';
export default function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) { return <OperationsPage section="matches" searchParams={searchParams} />; }
