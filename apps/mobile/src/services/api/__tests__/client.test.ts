jest.mock('../../storage/session', () => ({
  sessionStorage: { read: jest.fn(async () => null), write: jest.fn(), clear: jest.fn() },
}));

import { ApiError, getApiErrorMessage } from '../client';

describe('getApiErrorMessage', () => {
  it('maps stable server codes to safe user-facing copy', () => {
    expect(getApiErrorMessage(new ApiError(409, 'Duplicate', 'JERSEY_NUMBER_DUPLICATE'))).toBe('Nomor punggung tersebut sudah digunakan.');
  });

  it('keeps an unknown API message available', () => {
    expect(getApiErrorMessage(new ApiError(500, 'Service unavailable'))).toBe('Service unavailable');
  });
});
