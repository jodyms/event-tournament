'use client';

import { useActionState } from 'react';
import { requestResetAction } from '@/app/actions/auth';
import type { ActionState } from '@/app/actions/shared';

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestResetAction, {} as ActionState);
  return <main className="login-page"><section className="login-panel"><a className="brand-lockup" href="/login"><span className="brand-mark">T</span><span>TYC <b>ADMIN</b></span></a><p className="eyebrow">ACCOUNT RECOVERY</p><h1>Reset password</h1><p className="login-copy">Enter your staff email. In local development, the reset token is written to <code>local-data/mail</code> by the worker.</p><form className="login-form" action={action}><label>Email<input required name="email" type="email" autoComplete="email" /></label>{state.error && <p className="form-error" role="alert">{state.error}</p>}{state.message && <p className="form-success" role="status">{state.message}</p>}<button className="primary-button login-button" disabled={pending} type="submit">{pending ? 'Requesting…' : 'Request reset'}</button></form><p className="login-foot"><a href="/login">Back to sign in</a></p></section><aside className="login-art"><p>SECURE YOUR<br /><strong>TOURNAMENT ACCESS.</strong></p></aside></main>;
}
