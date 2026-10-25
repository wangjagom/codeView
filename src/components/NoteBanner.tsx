import { useEffect, useMemo } from 'react';
import { openNote } from '../lib/focus';
import { noteText } from '../lib/notes';
import { useStore } from '../lib/store';
import { isShare } from '../lib/types';
import type { Note } from '../lib/types';
import { Avatar } from './Avatar';

/** 앱을 쓰는 중에 새 알림이 오면 위에서 4초 동안 보여 줘요. 지금 보고 있는 글의 소식은 띄우지 않아요. */
export function NoteBanner({ note, viewingPostId, onDone }: { note: Note | null; viewingPostId: string | null; onDone: () => void }) {
  const { person, posts, markRead } = useStore();
  const skip = !note || note.post_id === viewingPostId;
  useEffect(() => {
    if (!note) return;
    if (skip) { onDone(); return; }
    const t = window.setTimeout(onDone, 4000);
    return () => window.clearTimeout(t);
  }, [note, skip, onDone]);
  const view = useMemo(() => {
    if (!note) return null;
    const post = posts.find((p) => p.id === note.post_id);
    const { text } = noteText(note, { name: (id) => person(id ?? '').name, title: () => '', isShare: () => Boolean(post && isShare(post)), ago: () => '' });
    return { text, meta: [post?.title, note.line ? `${note.line}번째 줄` : ''].filter(Boolean).join(' · ') };
  }, [note, posts, person]);
  if (!note || skip || !view) return null;
  return (
    <div className="nb" role="status">
      <Avatar person={person(note.actor_id ?? '')} />
      <span className="nb-body"><b>{view.text}</b>{view.meta && <span>{view.meta}</span>}</span>
      <button type="button" className="nb-go" onClick={() => { markRead([note.id]); onDone(); openNote(note); }}>보기</button>
    </div>
  );
}
