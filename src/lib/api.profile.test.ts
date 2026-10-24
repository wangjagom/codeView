import { describe, expect, it, vi } from 'vitest';

// 사진·소개 칸이 아직 없는 DB (새 SQL을 안 돌린 상태)
const seen: string[] = [];
vi.mock('./supabase', () => ({
  supabase: {
    from: () => ({
      select: (cols: string) => {
        seen.push(cols);
        const res = /avatar/.test(cols)
          ? { data: null, error: { code: '42703', message: 'column profiles.avatar does not exist' } }
          : { data: [{ id: 'u1', name: '준호', color: '#000' }], error: null };
        return { eq: () => Promise.resolve(res) };
      },
    }),
  },
}));
const { getMyProfile, friendlyError } = await import('./api');

describe('profile columns fallback', () => {
  it('새 칸이 없으면 기본 칸만 다시 읽어요', async () => {
    expect(await getMyProfile('u1')).toEqual({ id: 'u1', name: '준호', color: '#000' });
    expect(seen).toEqual(['id, name, color, avatar, bio', 'id, name, color']);
  });
  it('저장하려 하면 SQL을 실행하라고 알려 줘요', () => {
    expect(friendlyError({ message: "Could not find the 'avatar' column of 'profiles' in the schema cache" })).toContain('20261024000000_profile.sql');
    expect(friendlyError({ message: 'new row violates check constraint "profiles_bio_length"' })).toContain('80자');
  });
});
