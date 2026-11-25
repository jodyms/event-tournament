import Link from 'next/link';

export function DataTable({ columns, rows, empty }: { columns: string[]; rows: { id: string; cells: React.ReactNode[] }[]; empty: string }) {
  return <div className="table-wrap"><table className="figma-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{row.cells.map((cell, index) => <td key={`${row.id}-${index}`}>{cell}</td>)}</tr>)}{!rows.length && <tr><td className="empty-cell" colSpan={columns.length}>{empty}</td></tr>}</tbody></table></div>;
}

export function RowMenu({ items }: { items: { href: string; label: string }[] }) {
  return <details className="row-action"><summary aria-label="Row actions">···</summary><div className="menu-popover">{items.map((item) => <Link key={`${item.label}-${item.href}`} href={item.href}>{item.label}</Link>)}</div></details>;
}

export function StatusPill({ label, tone }: { label: string; tone: string }) {
  return <span className={`status ${tone}`}>{label}</span>;
}
