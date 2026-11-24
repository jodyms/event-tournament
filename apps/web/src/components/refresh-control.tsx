'use client';

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function RefreshControl() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => { const timer = window.setInterval(() => startTransition(() => router.refresh()), 30_000); return () => window.clearInterval(timer); }, [router, startTransition]);
  return <button className="secondary-button" onClick={() => startTransition(() => router.refresh())} type="button">{pending ? 'Refreshing…' : 'Refresh (30s)'}</button>;
}
