import { describe, expect, it } from 'vitest';
import { matchFilter } from './feed';
import type { Post } from './types';

const post = (id: string, patch: Partial<Post>): Post => ({
  id, team_id: 't', author_id: 'u2', title: '', file_name: 'a.abap', lang: 'ABAP', task: '', ask: '', code: 'x', version: 1, status: 'wait', reviewer_ids: [], created_at: '', updated_at: '', ...patch,
});

describe('matchFilter', () => {
  const posts = [
    post('r1', { status: 'wait', reviewer_ids: ['me'] }),
    post('r2', { status: 'doing', author_id: 'me' }),
    post('s1', { kind: 'share', status: 'wait', reviewer_ids: ['me'] }),
  ];
  const ctx = { meId: 'me', comments: [], bookmarks: new Set(['s1']) };
  const ids = (f: Parameters<typeof matchFilter>[1]) => posts.filter((p) => matchFilter(p, f, ctx)).map((p) => p.id);
  it('종류 탭으로 나눠요', () => {
    expect(ids({ kind: 'all', status: 'all' })).toEqual(['r1', 'r2', 's1']);
    expect(ids({ kind: 'review', status: 'all' })).toEqual(['r1', 'r2']);
    expect(ids({ kind: 'share', status: 'all' })).toEqual(['s1']);
  });
  it('상태는 리뷰 요청 탭에서만 걸러요', () => {
    expect(ids({ kind: 'review', status: 'doing' })).toEqual(['r2']);
    expect(ids({ kind: 'all', status: 'doing' })).toEqual(['r1', 'r2', 's1']);
  });
  it('모아 보기는 탭보다 먼저예요', () => {
    expect(ids({ kind: 'share', status: 'all', view: 'turn' })).toEqual(['r1']);
    expect(ids({ kind: 'all', status: 'all', view: 'saved' })).toEqual(['s1']);
    expect(ids({ kind: 'all', status: 'all', view: 'mine' })).toEqual(['r2']);
  });
});
