import { describe, expect, it, vi } from 'vitest';

// 직책 SQL을 아직 안 돌린 DB: p_role 인자가 있는 함수가 없어요.
const calls: Record<string, unknown>[] = [];
vi.mock('./supabase', () => ({
  supabase: {
    rpc: (_name: string, args: Record<string, unknown>) => {
      calls.push(args);
      return Promise.resolve('p_role' in args
        ? { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.create_team(p_name, p_role, p_tasks) in the schema cache' } }
        : { data: { id: 't1', name: '3조' }, error: null });
    },
  },
}));
const { createTeam, friendlyError } = await import('./api');

describe('team roles fallback', () => {
  it('새 SQL 전이면 직책 없이 다시 불러요', async () => {
    expect(await createTeam('3조', ['a'], 'member')).toMatchObject({ id: 't1' });
    expect(calls).toEqual([{ p_name: '3조', p_tasks: ['a'], p_role: 'member' }, { p_name: '3조', p_tasks: ['a'] }]);
  });
  it('자리가 차 있으면 알려 줘요', () => {
    expect(friendlyError({ message: 'owner taken' })).toContain('이미 조장이 있어요');
    expect(friendlyError({ message: 'duplicate key value violates unique constraint "team_one_vice"' })).toContain('이미 부조장이 있어요');
  });
});
