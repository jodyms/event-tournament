import Link from 'next/link';

export function Pager({ page, pages, start, end, total, href }: { page: number; pages: number; start: number; end: number; total: number; href: (page: number) => string }) {
  return <div className="pager"><span>{total ? `Showing ${start + 1} - ${end} of ${total} records` : 'Showing 0 records'}</span><nav>{page > 1 ? <Link href={href(page - 1)}>‹ Previous</Link> : <span>‹ Previous</span>}<b>{page}</b>{page < pages ? <Link href={href(page + 1)}>Next ›</Link> : <span>Next ›</span>}</nav></div>;
}
