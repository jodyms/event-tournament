'use client';

import Link from 'next/link';
import { ActionForm, type Field } from '@/components/ui/action-form';
import type { ActionState } from '@/app/actions/shared';

type ServerAction = (state: ActionState, form: FormData) => Promise<ActionState>;
export type OperationRecord = { id: string; title: string; detail: string; status?: string; href?: string; fields?: Field[]; action?: ServerAction; actionLabel?: string; sensitive?: boolean };

export function OperationsModule({ title, description, records, form, page, empty }: { title: string; description: string; records: OperationRecord[]; form?: { action: ServerAction; fields: Field[]; submit: string; sensitive?: boolean }; page: string; empty?: string }) {
  const createLabel = form?.submit.replace(/^Create\s+/i, 'Add New ') ?? '';
  return <section className="figma-module"><div className="page-heading figma-heading"><div><h1>{title}</h1><p>{description}</p></div>{form && <details className="page-create"><summary className="dark-button">{createLabel || form.submit}</summary><div className="figma-create-popover"><ActionForm action={form.action} fields={form.fields} submit={form.submit} sensitive={form.sensitive} /></div></details>}</div><article className="figma-panel module-panel"><div className="module-tools figma-tools"><form action={page} method="get" className="search-form"><label className="small-search"><span>⌕</span><input name="q" placeholder={`Search ${singular(title)}`} /></label><label className="filter-select"><span>All Status</span><b>⌄</b></label><button className="sr-only" type="submit">Search</button></form></div><div className="table-wrap"><table className="figma-table module-table"><thead><tr><th>{title.endsWith('s') ? title.slice(0, -1) : title} Name</th><th>Information</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td>{record.href ? <Link className="record-link" href={record.href}>{record.title}</Link> : record.title}</td><td>{record.detail}</td><td>{record.status && <span className={`status ${statusTone(record.status)}`}>{readableStatus(record.status)}</span>}</td><td className="table-actions-cell">{record.href && <Link className="row-link" aria-label={`View ${record.title}`} href={record.href}>↗</Link>}{record.action && record.fields && <details className="row-action"><summary aria-label={`Actions for ${record.title}`}>•••</summary><div className="figma-action-popover"><ActionForm action={record.action} fields={record.fields} submit={record.actionLabel ?? 'Save'} sensitive={record.sensitive} /></div></details>}</td></tr>)}{!records.length && <tr><td colSpan={4} className="empty-cell">{empty ?? 'No records match this filter.'}</td></tr>}</tbody></table></div></article></section>;
}

function singular(title: string) { return title.endsWith('s') ? title.slice(0, -1).toLowerCase() : title.toLowerCase(); }
function readableStatus(status: string) { return status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function statusTone(status: string) { if (['INACTIVE', 'REJECTED', 'CANCELLED', 'FAILED'].includes(status)) return 'danger'; if (['DRAFT', 'PENDING', 'QUEUED', 'NOT_STARTED'].includes(status)) return 'warning'; if (['LIVE', 'ONGOING'].includes(status)) return 'info'; return 'success'; }
