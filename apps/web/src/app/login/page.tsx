'use client';

import Image from 'next/image';
import { useActionState, useState } from 'react';
import { loginAction, type ActionState } from '@/app/actions';

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, {} as ActionState);
  const [showPassword, setShowPassword] = useState(false);
  return <main className="login-figma"><Image className="login-figma-logo" src="/images/login-logo.png" alt="TYC" width={120} height={39} priority /><section className="login-figma-form-area"><div className="login-figma-content"><header className="login-figma-header"><div className="login-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="m10 17 5-5-5-5M15 12H3" /></svg></div><div><h1>Login to your account</h1><p className="login-figma-copy">Enter your registered email/username and password to login</p></div></header><form className="login-figma-form" action={action}><label>Username/Email<input required name="email" type="text" autoComplete="username" placeholder="Type your username/email" /></label><label>Password<span className="password-input"><input required name="password" minLength={8} type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Type your password" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? '◉' : '◡'}</button></span></label>{state.error && <p className="form-error" role="alert">{state.error}</p>}<div className="login-figma-options"><label className="login-check"><input type="checkbox" name="remember" /> <span>Remember me</span></label><a href="/forgot-password">Change password?</a></div><button className="login-figma-button" disabled={pending} type="submit">{pending ? 'Logging in…' : <>Login <span>↗</span></>}</button></form></div></section><aside className="login-figma-hero"><Image src="/images/login-image.jpg" alt="Football player celebrating" fill priority sizes="(max-width: 900px) 0px, 55vw" /><div className="login-figma-shade" /><strong>FOOTBALL<br />LIFE.</strong></aside></main>;
}
