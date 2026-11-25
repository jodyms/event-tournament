import { loginSchema } from '../schemas';

describe('loginSchema', () => {
  it('accepts a valid credential pair', () => {
    expect(loginSchema.safeParse({ email: 'coach@kickzone.app', password: 'password' }).success).toBe(true);
  });

  it('rejects an invalid email and short password', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: '123' });
    expect(result.success).toBe(false);
  });
});
