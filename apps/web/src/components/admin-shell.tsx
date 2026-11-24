'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions';
import type { Identity } from '@/lib/auth';

// The Figma navigation is deliberately shallow. Tournament operations stay
// contextual (inside a tournament), rather than becoming top-level modules.
const nav = [
  { href: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { href: '/tournaments', icon: '♕', label: 'Tournaments' },
  { href: '/teams', icon: '♢', label: 'Teams' },
  { href: '/players', icon: '♧', label: 'Players' },
  { href: '/venues', icon: '⌖', label: 'Pitch' },
  { href: '/news', icon: '▤', label: 'News' },
  { href: '/certificate-templates', icon: '♙', label: 'Template Certificate' },
  { href: '/notifications', icon: '✉', label: 'Management Notification' },
];

function NavGroup({ items }: { items: typeof nav }) {
  const pathname = usePathname();
  return <div className="nav-group">{items.map((item) => <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href || pathname.startsWith(`${item.href}/`) ? 'active' : ''}`}><span className="nav-icon">{item.icon}</span><span>{item.label}</span></Link>)}</div>;
}

export function AdminShell({ children, identity }: Readonly<{ children: React.ReactNode; identity: Identity }>) {
  const initials = identity.displayName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  const superAdmin = identity.roles.includes('SUPER_ADMIN');
  return <div className="admin-shell"><aside className="sidebar"><Link className="brand-lockup" href="/dashboard"><span className="brand-mark">⚽</span><span>TYC</span></Link><span className="sidebar-collapse">▯</span><div className="brand-rule" /><p className="workspace">Menu</p><NavGroup items={nav} /><div className="sidebar-bottom"><details className="profile-menu"><summary className="profile"><span className="avatar">{initials}</span><span><strong>{identity.displayName}</strong><small>ADMINISTRATOR</small></span><span className="dots">⌃</span></summary><div className="profile-popover">{superAdmin && <><Link href="/accounts">Manage accounts</Link><Link href="/audit">Audit log</Link></>}<form action={logoutAction}><button type="submit">Log out</button></form></div></details></div></aside><main className="main-area"><header className="topbar"><strong>DREAM TOURNAMENT YOUTH CHAMPIONSHIP</strong><div className="top-actions"><Link className="icon-button" aria-label="Notifications" href="/notifications">✉</Link><span className="avatar top-avatar">{initials}</span></div></header><div className="page-content">{children}</div></main></div>;
}
