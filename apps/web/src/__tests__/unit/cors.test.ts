import { describe, expect, it } from 'vitest';
import { isAllowedApiOrigin } from '@/lib/api/cors';

describe('mobile API CORS origins', () => {
  it('allows the Expo web dev server on loopback', () => {
    expect(isAllowedApiOrigin('http://localhost:8081')).toBe(true);
    expect(isAllowedApiOrigin('http://127.0.0.1:8081')).toBe(true);
    expect(isAllowedApiOrigin('http://localhost:3000')).toBe(true);
  });

  it('rejects other sites and malformed origins', () => {
    expect(isAllowedApiOrigin('https://example.com')).toBe(false);
    expect(isAllowedApiOrigin('http://192.168.1.10:8081')).toBe(false);
    expect(isAllowedApiOrigin(null)).toBe(false);
    expect(isAllowedApiOrigin('not a url')).toBe(false);
  });
});
