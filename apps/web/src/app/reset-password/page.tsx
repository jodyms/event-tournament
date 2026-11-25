'use client';

import { useActionState } from 'react';
import { resetPasswordAction } from '@/app/actions/auth';
import type { ActionState } from '@/app/actions/shared';

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(resetPasswordAction, {} as ActionState);
  return <main className="login-page"><section className="login-panel"><a className="brand-lockup" href="/login"><span className="brand-mark">T</span><span>TYC <b>ADMIN</b></span></a><p className="eyebrow">ACCOUNT RECOVERY</p><h1>Choose a password</h1><form className="login-form" action={action}><label>Reset token<input required name="token" placeholder="Paste token from local mail sink" /></label><label>New password<input required name="password" minLength={8} type="password" autoComplete="new-password" /></label><label>Confirm password<input required name="confirmPassword" minLength={8} type="password" autoComplete="new-password" /></label>{state.error && <p className="form-error" role="alert">{state.error}</p>}<button className="primary-button login-button" disabled={pending} type="submit">{pending ? 'Saving…' : 'Reset password'}</button></form></section><aside className="login-art"><p>BACK TO<br /><strong>THE ACTION.</strong></p></aside></main>;
}
