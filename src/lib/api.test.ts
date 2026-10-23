import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => ({ supabase: {} }));
const { friendlyError } = await import('./api');

describe('friendlyError', () => {
  it('reads message from Error and plain objects', () => {
    expect(friendlyError(new Error('invalid invite code'))).toContain('초대 코드');
    expect(friendlyError({ message: 'User already registered' })).toContain('이미 있는 이름');
    expect(friendlyError({ message: 'Invalid login credentials' })).toContain('비밀번호가 맞지 않아요');
    expect(friendlyError({ message: 'Email address "u8c51@users.codeview.example.com" is invalid' })).toContain('Confirm email');
  });

  it('falls back to the raw message', () => {
    expect(friendlyError('boom')).toBe('boom');
  });
});
