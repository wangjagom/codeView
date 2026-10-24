import type { Filter, Kind, StatusFilter, View } from '../components/Layout';
import { isMyTurn } from './store';
import { isShare, type CommentLite, type Post } from './types';

export interface FeedCtx { meId: string; comments: CommentLite[]; bookmarks: Set<string> }

export const matchKind = (p: Post, k: Kind) => k === 'all' || (k === 'share') === isShare(p);
export const matchStatus = (p: Post, s: StatusFilter) => s === 'all' || (!isShare(p) && p.status === s);
export function matchView(p: Post, v: View, c: FeedCtx) {
  if (v === 'turn') return isMyTurn(p, c.meId, c.comments);
  if (v === 'saved') return c.bookmarks.has(p.id);
  return p.author_id === c.meId;
}

/** 모아 보기(view)가 있으면 그것만, 없으면 종류 탭 + (리뷰 요청 탭일 때) 상태로 걸러요. */
export function matchFilter(p: Post, f: Filter, c: FeedCtx) {
  if (f.view) return matchView(p, f.view, c);
  return matchKind(p, f.kind) && (f.kind !== 'review' || matchStatus(p, f.status));
}
