import { useMemo } from 'react';
import { Avatar } from '../components/Avatar';
import { BackBar } from '../components/Layout';
import { Loading } from '../components/Motion';
import { openNote } from '../lib/focus';
import { groupNotes } from '../lib/notes';
import { useStore } from '../lib/store';
import { isShare, type NoteKind } from '../lib/types';
import { timeAgo } from '../lib/util';

/** 아바타 오른쪽 아래 작은 표시: 무슨 알림인지 */
const MARK: Record<NoteKind, { label: string; cls: string }> = {
  review: { label: '줄', cls: 'k-review' }, general: { label: '글', cls: 'k-review' }, reply: { label: '↩', cls: 'k-reply' },
  request: { label: '!', cls: 'k-request' }, applied: { label: '✓', cls: 'k-applied' }, like: { label: '♥', cls: 'k-like' },
};

export function Notifications() {
  const { team, notes, person, posts, markRead } = useStore();
  const mine = useMemo(() => (notes ?? []).filter((n) => n.team_id === team.id), [notes, team.id]);
  const groups = useMemo(() => groupNotes(mine, {
    name: (id) => person(id ?? '').name,
    title: (id) => posts.find((p) => p.id === id)?.title ?? '',
    isShare: (id) => { const p = posts.find((x) => x.id === id); return Boolean(p && isShare(p)); },
    ago: timeAgo,
  }), [mine, person, posts]);
  const unreadIds = mine.filter((n) => !n.read_at).map((n) => n.id);

  return (
    <section>
      <BackBar label="홈" />
      <div className="nt-h">
        <h1 className="h-big tight">알림</h1>
        <button type="button" className="btn sm" disabled={!unreadIds.length} onClick={() => markRead(unreadIds)}>모두 읽음</button>
      </div>
      {notes === undefined ? (
        <div className="card empty"><Loading /></div>
      ) : notes === null ? (
        <div className="card empty">알림은 아직 준비 중이에요<br /><span className="muted small">팀장이 Supabase SQL을 실행하면 쓸 수 있어요</span></div>
      ) : !groups.length ? (
        <div className="card empty">아직 알림이 없어요<br /><span className="muted small">내 코드에 리뷰가 달리면 여기로 알려 드려요</span></div>
      ) : groups.map((g) => (
        <div key={g.label} className="nt-group">
          <h2 className="nt-day">{g.label}</h2>
          <div className="card list">
            {g.items.map((v) => (
              <button key={v.ids[0]} type="button" className={`item nt ${v.unread ? 'unread' : ''}`} onClick={() => { markRead(v.ids); openNote(v.note); }}>
                <span className="nt-ava"><Avatar person={person(v.actorId ?? '')} size="lg" /><i className={`nt-k ${MARK[v.note.kind].cls}`} aria-hidden="true">{MARK[v.note.kind].label}</i></span>
                <span className="body">
                  <span className="t">{v.text}</span>
                  {v.quote && <span className="nt-q">"{v.quote}"</span>}
                  <span className="m">{v.meta}</span>
                </span>
                {v.unread && <span className="nt-dot" aria-label="안 읽음" />}
              </button>
            ))}
          </div>
        </div>
      ))}
      {groups.length > 0 && <p className="muted small lead center">30일이 지난 알림은 자동으로 지워져요</p>}
    </section>
  );
}
