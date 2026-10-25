import { navigate } from './router';
import type { Note } from './types';

/** 알림을 눌렀을 때 글 상세가 어느 파일·어느 리뷰로 스크롤할지 잠깐 기억해요. */
interface Focus { postId: string; commentId: string | null; file: number | null }
let pending: Focus | null = null;

export function takeFocus(postId: string): Focus | null {
  if (pending?.postId !== postId) return null;
  const f = pending; pending = null;
  return f;
}

export function openNote(n: Note) {
  pending = { postId: n.post_id, commentId: n.comment_id, file: n.file };
  const target = `#/post/${encodeURIComponent(n.post_id)}`;
  if (location.hash === target) window.dispatchEvent(new Event('cv-focus'));
  else navigate({ name: 'post', id: n.post_id });
}
