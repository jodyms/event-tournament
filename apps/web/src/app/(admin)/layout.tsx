import { AdminShell } from '@/components/layout/admin-shell';
import { currentAdmin } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const identity = await currentAdmin().catch(() => null);
  if (!identity) redirect('/login');
  return <AdminShell identity={identity}>{children}</AdminShell>;
}
