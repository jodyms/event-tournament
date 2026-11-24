import Link from 'next/link';

export function Modal({ title, subtitle, closeHref, children, side = false }: { title: string; subtitle?: string; closeHref: string; children: React.ReactNode; side?: boolean }) {
  return <div className="modal-backdrop"><section className={side ? 'drawer' : 'modal-card'} role="dialog" aria-modal="true" aria-label={title}><header className="modal-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><Link href={closeHref} aria-label="Close">×</Link></header><div className="modal-body">{children}</div></section></div>;
}
