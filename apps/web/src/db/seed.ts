import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, pool } from './client';
import { permissions, rolePermissions, roles, sports, userRoles, users } from './schema';

const permissionList = ['tournament.read', 'tournament.write', 'team.read', 'team.write', 'coach.review', 'player.review', 'match.schedule', 'match.score', 'content.publish', 'notification.send', 'admin.manage', 'audit.read'];

export async function seedFoundation() {
  for (const [code, name] of [['SUPER_ADMIN', 'Super Admin'], ['OPERATOR', 'Operator'], ['COACH', 'Coach'], ['USER', 'User']] as const) await db.insert(roles).values({ code, name }).onConflictDoNothing();
  for (const code of permissionList) await db.insert(permissions).values({ code, description: `Allows ${code}` }).onConflictDoNothing();
  for (const code of ['FOOTBALL', 'BASKETBALL', 'BASEBALL', 'VOLLEYBALL']) await db.insert(sports).values({ code, name: code[0] + code.slice(1).toLowerCase(), active: code === 'FOOTBALL' }).onConflictDoNothing();
  const [superAdmin] = await db.select().from(roles).where(eq(roles.code, 'SUPER_ADMIN')).limit(1);
  const allPermissions = await db.select().from(permissions);
  if (!superAdmin) throw new Error('Super Admin role was not created.');
  for (const permission of allPermissions) await db.insert(rolePermissions).values({ roleId: superAdmin.id, permissionId: permission.id }).onConflictDoNothing();
  const [operator] = await db.select().from(roles).where(eq(roles.code, 'OPERATOR')).limit(1);
  if (!operator) throw new Error('Operator role was not created.');
  for (const permission of allPermissions.filter((permission) => !['admin.manage', 'tournament.write'].includes(permission.code))) await db.insert(rolePermissions).values({ roleId: operator.id, permissionId: permission.id }).onConflictDoNothing();
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@tyc.local').toLowerCase();
  const passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!', 12);
  await db.insert(users).values({ email, passwordHash, displayName: 'TYC Super Admin' }).onConflictDoNothing();
  const [admin] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!admin) throw new Error('Seed admin was not created.');
  await db.insert(userRoles).values({ userId: admin.id, roleId: superAdmin.id }).onConflictDoNothing();
  return { adminId: admin.id, email };
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === (entry.startsWith('file:') ? entry : pathToFileURL(entry).href);
}

if (isDirectRun()) {
  seedFoundation()
    .then(({ email }) => { console.log(`Seeded ${email}. Change SEED_ADMIN_PASSWORD outside local development.`); return pool.end(); })
    .catch(async (error) => { console.error(error); await pool.end(); process.exitCode = 1; });
}
