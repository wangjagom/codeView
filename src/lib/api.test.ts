import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => ({ supabase: {} }));
const { friendlyError } = await import('./api');

describe('friendlyError', () => {
  it('reads message from Error and plain objects', () => {
    expect(friendlyError(new Error('invalid invite code'))).toContain('초대 코드');
    expect(friendlyError({ message: 'A user with this email address has already been registered' })).toContain('이미 다른 계정');
    expect(friendlyError({ message: 'Anonymous sign-ins are disabled' })).toContain('이메일 없이 시작하기');
  });

  it('falls back to the raw message', () => {
    expect(friendlyError('boom')).toBe('boom');
  });
});
