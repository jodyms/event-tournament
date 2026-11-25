'use server';

import { redirect } from 'next/navigation';
import { AppError } from '@/lib/api/errors';
import { loginSchema } from '@/lib/api/validation';
import { createAdminSession, destroyAdminSession, requestPasswordReset, resetPassword, verifyPasswordLogin } from '@/lib/auth/session';
import { failure, read, type ActionState } from './shared';

export async function loginAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const input = loginSchema.parse({ email: read(form, 'email'), password: read(form, 'password') });
    const identity = await verifyPasswordLogin(input.email, input.password);
    if (!identity.permissions.includes('*') && !identity.permissions.some((permission) => permission.endsWith('.read'))) {
      throw new AppError('FORBIDDEN', 'This account has no admin access.', 403);
    }
    await createAdminSession(identity.id);
  } catch (error) {
    return failure(error);
  }
  redirect('/dashboard');
}

export async function logoutAction() {
  await destroyAdminSession();
  redirect('/login');
}

export async function requestResetAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requestPasswordReset(read(form, 'email'));
    return { message: 'If that account exists, a reset link was placed in the local mail sink.' };
  } catch (error) {
    return failure(error);
  }
}

export async function resetPasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const password = read(form, 'password');
    if (password.length < 8) throw new AppError('VALIDATION_ERROR', 'Password must contain at least 8 characters.');
    if (password !== read(form, 'confirmPassword')) throw new AppError('VALIDATION_ERROR', 'Password confirmation does not match.');
    await resetPassword(read(form, 'token'), password);
  } catch (error) {
    return failure(error);
  }
  redirect('/login?reset=1');
}
