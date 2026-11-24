import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email wajib diisi').email('Masukkan alamat email yang valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

export type LoginValues = z.infer<typeof loginSchema>;
