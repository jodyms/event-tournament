import { OperationsPage } from '@/components/operations-page';
export default function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) { return <OperationsPage section="coaches" searchParams={searchParams} />; }
