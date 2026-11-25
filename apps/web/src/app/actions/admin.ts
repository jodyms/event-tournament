'use server';

import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { roles, userRoles, users } from '@/db/schema';
import { AppError } from '@/lib/api/errors';
import { requirePermission } from '@/lib/auth/session';
import { audit, failure, read, refresh, requireConfirmed, type ActionState } from './shared';

export async function createAdminAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    requireConfirmed(form);
    const actor = await requirePermission('admin.manage');
    const email = read(form, 'email').toLowerCase();
    const password = read(form, 'password');
    if (!email || password.length < 8 || !read(form, 'displayName')) {
      throw new AppError('VALIDATION_ERROR', 'Name, email, and an 8-character password are required.');
    }
    const roleCode = read(form, 'roleCode');
    if (!['SUPER_ADMIN', 'OPERATOR'].includes(roleCode)) {
      throw new AppError('VALIDATION_ERROR', 'Only Super Admin or Operator may be assigned from admin web.');
    }
    const [role] = await db.select().from(roles).where(eq(roles.code, roleCode)).limit(1);
    if (!role) throw new AppError('NOT_FOUND', 'Role was not found.', 404);
    const [user] = await db.insert(users).values({ email, passwordHash: await bcrypt.hash(password, 12), displayName: read(form, 'displayName') }).returning();
    await db.insert(userRoles).values({ userId: user.id, roleId: role.id });
    await audit(actor.id, 'admin.create', 'user', user.id, { email, roleCode });
    refresh('/accounts');
    return { message: 'Admin account created.' };
  } catch (error) {
    return failure(error);
  }
}

export async function setAdminRoleAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    requireConfirmed(form);
    const actor = await requirePermission('admin.manage');
    const [role] = await db.select().from(roles).where(eq(roles.code, read(form, 'roleCode'))).limit(1);
    if (!role || !['SUPER_ADMIN', 'OPERATOR'].includes(role.code)) {
      throw new AppError('VALIDATION_ERROR', 'Invalid administrative role.');
    }
    const userId = read(form, 'userId');
    await db.transaction(async (tx) => {
      await tx.delete(userRoles).where(eq(userRoles.userId, userId));
      await tx.insert(userRoles).values({ userId, roleId: role.id });
    });
    await audit(actor.id, 'admin.role_change', 'user', userId, { role: role.code });
    refresh('/accounts');
    return { message: 'Role assignment updated.' };
  } catch (error) {
    return failure(error);
  }
}
