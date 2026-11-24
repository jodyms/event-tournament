'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { ActionState } from '@/app/actions';

type ServerAction = (state: ActionState, form: FormData) => Promise<ActionState>;

export function BoundForm({ action, children, className = 'stack-form' }: { action: ServerAction; children: React.ReactNode; className?: string }) {
  const [state, formAction] = useActionState(action, {});
  return <form className={className} action={formAction}>{state.error && <p className="form-error" role="alert">{state.error}</p>}{children}</form>;
}

export function SubmitButton({ children, name, value, variant = 'dark' }: { children: string; name?: string; value?: string; variant?: 'dark' | 'secondary' }) {
  const { pending } = useFormStatus();
  return <button className={variant === 'dark' ? 'dark-button' : 'secondary-button'} disabled={pending} name={name} type="submit" value={value}>{pending ? 'Saving…' : children}</button>;
}
