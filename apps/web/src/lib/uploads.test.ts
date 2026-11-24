import { describe, expect, it } from 'vitest';
import { AppError } from './errors';
import { assertUpload } from './uploads';

describe('upload checks', () => {
  it('accepts a small png and rejects an oversize or unknown file', () => {
    expect(assertUpload(new File([new Uint8Array(12)], 'crest.png', { type: 'image/png' }))).toBe('png');
    expect(assertUpload(new File([], 'empty.png', { type: 'image/png' }))).toBeNull();
    expect(() => assertUpload(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' }))).toThrow(AppError);
    expect(() => assertUpload(new File([new Uint8Array(8)], 'notes.txt', { type: 'text/plain' }))).toThrow(AppError);
  });
});
