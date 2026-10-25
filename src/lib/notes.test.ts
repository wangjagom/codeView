import { describe, expect, it } from 'vitest';
import { groupNotes, noteText, type NoteCtx } from './notes';
import type { Note } from './types';

const note = (id: string, patch: Partial<Note>): Note => ({
  id, user_id: 'me', actor_id: 'ji', team_id: 't', post_id: 'p1', comment_id: null, kind: 'review', snippet: '', line: null, file: null,
  created_at: '2026-10-25T09:00:00Z', read_at: null, ...patch,
});
const ctx: NoteCtx = {
  name: (id) => ({ ji: '지은', jun: '준호', min: '민수' }[id ?? ''] ?? '팀원'),
  title: (id) => (id === 'p1' ? 'Table 바인딩' : '공유 글'),
  isShare: (id) => id === 'p2',
  ago: () => '방금',
};

describe('noteText', () => {
  it('종류마다 자연스러운 문장', () => {
    expect(noteText(note('a', { kind: 'review', line: 3 }), ctx).text).toBe('지은님이 줄 리뷰를 남겼어요');
    expect(noteText(note('a', { kind: 'review', post_id: 'p2', line: 3 }), ctx).text).toBe('지은님이 줄 의견을 남겼어요');
    expect(noteText(note('a', { kind: 'general' }), ctx).text).toBe('지은님이 전체 리뷰를 남겼어요');
    expect(noteText(note('a', { kind: 'general', post_id: 'p2' }), ctx).text).toBe('지은님이 댓글을 남겼어요');
    expect(noteText(note('a', { kind: 'reply', line: 4 }), ctx).text).toBe('지은님이 내 리뷰에 답글을 달았어요');
    expect(noteText(note('a', { kind: 'reply', line: null }), ctx).text).toBe('지은님이 내 댓글에 답글을 달았어요');
    expect(noteText(note('a', { kind: 'like' }), ctx, 2).text).toBe('지은님 외 2명이 도움됐어요를 눌렀어요');
  });
});

describe('groupNotes', () => {
  const now = new Date('2026-10-25T12:00:00Z');
  it('오늘·이번 주·이전으로 나누고 같은 날 도움됐어요는 묶어요', () => {
    const g = groupNotes([
      note('r1', { kind: 'review', line: 12, created_at: '2026-10-25T10:00:00Z' }),
      note('l1', { kind: 'like', actor_id: 'jun', created_at: '2026-10-25T09:00:00Z', read_at: '2026-10-25T09:10:00Z' }),
      note('l2', { kind: 'like', actor_id: 'min', created_at: '2026-10-25T08:00:00Z' }),
      note('o1', { kind: 'request', created_at: '2026-10-21T08:00:00Z' }),
      note('x1', { kind: 'applied', created_at: '2026-10-01T08:00:00Z' }),
    ], ctx, now);
    expect(g.map((x) => x.label)).toEqual(['오늘', '이번 주', '이전']);
    expect(g[0].items).toHaveLength(2);
    expect(g[0].items[0].meta).toBe('Table 바인딩 · 12번째 줄 · 방금');
    expect(g[0].items[1]).toMatchObject({ ids: ['l1', 'l2'], unread: true, text: '준호님 외 1명이 도움됐어요를 눌렀어요' });
  });
});
