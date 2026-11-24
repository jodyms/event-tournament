'use client';

import { useActionState } from 'react';
import type { HTMLInputTypeAttribute } from 'react';
import type { ActionState } from '@/app/actions';

type ServerAction = (state: ActionState, form: FormData) => Promise<ActionState>;
export type Field = { name: string; label?: string; type?: string; required?: boolean; value?: string; options?: { value: string; label: string }[]; placeholder?: string };

export function ActionForm({ action, fields, submit = 'Save', sensitive = false }: { action: ServerAction; fields: Field[]; submit?: string; sensitive?: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form className="operation-form" action={formAction}>
    <div className="form-fields">{fields.map((field) => <FieldInput key={field.name} field={field} />)}</div>
    {sensitive && <label className="checkbox confirmation"><input name="confirmed" required type="checkbox" /> I understand this updates an official tournament record.</label>}
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    {state.message && <p className="form-success" role="status">{state.message}</p>}
    <button className="primary-button" disabled={pending} type="submit">{pending ? 'Saving…' : submit}</button>
  </form>;
}

function FieldInput({ field }: { field: Field }) {
  if (field.type === 'hidden') return <input name={field.name} type="hidden" value={field.value ?? ''} />;
  const label = field.label ?? field.name;
  return <label>{label}{field.type === 'textarea' ? <textarea name={field.name} required={field.required} defaultValue={field.value} placeholder={field.placeholder} /> : field.type === 'select' ? <select name={field.name} required={field.required} defaultValue={field.value ?? ''}><option value="">Select…</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input name={field.name} required={field.required} defaultValue={field.value} type={(field.type ?? 'text') as HTMLInputTypeAttribute} placeholder={field.placeholder} />}</label>;
}
