'use client';

import { useState } from 'react';

export type EditorField = { name: string; label: string; type?: string; placeholder?: string; options?: { value: string; label: string }[] };
type Row = Record<string, string>;

export function RowEditor({ fields, initial, addLabel = 'Add row' }: { fields: EditorField[]; initial: Row[]; addLabel?: string }) {
  const blank = Object.fromEntries(fields.map((field) => [field.name, '']));
  const [rows, setRows] = useState<Row[]>(initial.length ? initial : [blank]);
  const update = (index: number, name: string, value: string) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [name]: value } : row));
  return <div className="row-editor">{rows.map((row, index) => <div className="editor-row" key={index}>{fields.map((field) => <label className={field.type === 'hidden' ? 'sr-only' : undefined} key={field.name}>{field.type === 'hidden' ? null : field.label}{field.options ? <select name={field.name} value={row[field.name] ?? ''} onChange={(event) => update(index, field.name, event.target.value)}><option value="">Select</option>{field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input name={field.name} type={field.type ?? 'text'} placeholder={field.placeholder} value={row[field.name] ?? ''} onChange={(event) => update(index, field.name, event.target.value)} />}</label>)}<button type="button" className="icon-danger" onClick={() => setRows((current) => current.length === 1 ? [blank] : current.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove row">⌫</button></div>)}<button type="button" className="secondary-button" onClick={() => setRows((current) => [...current, blank])}>{addLabel}</button></div>;
}
