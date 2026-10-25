import type { Note } from './types';

/** 알림 한 줄에 보일 글 */
export interface NoteView {
  /** 읽음 처리할 알림들 (도움됐어요는 여러 개를 하나로 묶어요) */
  ids: string[];
  note: Note;
  actorId: string | null;
  text: string;
  quote: string;
  meta: string;
  unread: boolean;
}

export interface NoteCtx {
  name: (id: string | null) => string;
  /** 글 제목 (모르면 빈 글자) */
  title: (postId: string) => string;
  /** 코드 공유 글인지 (공유 글은 '리뷰' 대신 '의견·댓글'이라고 불러요) */
  isShare: (postId: string) => boolean;
  ago: (iso: string) => string;
}

export function noteText(n: Note, c: NoteCtx, others = 0): { text: string; quote: string } {
  const who = `${c.name(n.actor_id)}님${others ? ` 외 ${others}명` : ''}`;
  const share = c.isShare(n.post_id);
  switch (n.kind) {
    case 'review': return { text: `${who}이 ${share ? '줄 의견을' : '줄 리뷰를'} 남겼어요`, quote: n.snippet };
    case 'general': return { text: `${who}이 ${share ? '댓글을' : '전체 리뷰를'} 남겼어요`, quote: n.snippet };
    case 'reply': return { text: `${who}이 ${n.line === null ? '내 댓글' : share ? '내 의견' : '내 리뷰'}에 답글을 달았어요`, quote: n.snippet };
    case 'request': return { text: `${who}이 리뷰를 부탁했어요`, quote: '' };
    case 'applied': return { text: `${who}이 내 수정 제안을 적용했어요`, quote: '' };
    case 'like': return { text: `${who}이 도움됐어요를 눌렀어요`, quote: '' };
  }
}

const dayKey = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

/** 오늘 · 이번 주 · 이전으로 나누고, 같은 날 같은 글의 도움됐어요는 하나로 묶어요. 새것이 위로 와요. */
export function groupNotes(notes: Note[], c: NoteCtx, now = new Date()): { label: string; items: NoteView[] }[] {
  const sorted = [...notes].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const views: NoteView[] = [];
  const likeAt = new Map<string, NoteView & { actors: Set<string> }>();
  for (const n of sorted) {
    if (n.kind === 'like') {
      const key = `${n.post_id}|${dayKey(n.created_at)}`;
      const g = likeAt.get(key);
      if (g) {
        g.ids.push(n.id);
        if (n.actor_id) g.actors.add(n.actor_id);
        if (!n.read_at) g.unread = true;
        continue;
      }
      const v = { ids: [n.id], note: n, actorId: n.actor_id, text: '', quote: '', meta: '', unread: !n.read_at, actors: new Set(n.actor_id ? [n.actor_id] : []) };
      likeAt.set(key, v);
      views.push(v);
      continue;
    }
    views.push({ ids: [n.id], note: n, actorId: n.actor_id, text: '', quote: '', meta: '', unread: !n.read_at });
  }
  for (const v of views) {
    const others = 'actors' in v ? Math.max(0, (v as { actors: Set<string> }).actors.size - 1) : 0;
    const t = noteText(v.note, c, others);
    v.text = t.text; v.quote = t.quote.replace(/`{1,3}/g, '').trim();
    const title = c.title(v.note.post_id);
    v.meta = [title, v.note.line ? `${v.note.line}번째 줄` : '', c.ago(v.note.created_at)].filter(Boolean).join(' · ');
  }
  const today = dayKey(now.toISOString());
  const weekAgo = now.getTime() - 7 * 864e5;
  const buckets: Record<string, NoteView[]> = { '오늘': [], '이번 주': [], '이전': [] };
  for (const v of views) {
    const t = new Date(v.note.created_at);
    buckets[dayKey(v.note.created_at) === today ? '오늘' : t.getTime() >= weekAgo ? '이번 주' : '이전'].push(v);
  }
  return Object.entries(buckets).filter(([, items]) => items.length).map(([label, items]) => ({ label, items }));
}
