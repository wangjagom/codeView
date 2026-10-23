import { createContext, useContext } from 'react';
import type { CommentLite, Post, Profile } from './types';

export interface Store {
  me: Profile;
  profiles: Profile[];
  person: (id: string) => Profile;
  posts: Post[];
  comments: CommentLite[];
  /** 서버에서 목록을 다시 불러와요. */
  refresh: () => Promise<void>;
  /** 실시간 변경이 올 때마다 바뀌는 숫자. 상세 화면이 다시 불러올 때 써요. */
  tick: number;
  toast: (msg: string) => void;
  signOut: () => Promise<void>;
}

export const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('StoreContext missing');
  return s;
}

const UNKNOWN: Profile = { id: '', name: '알 수 없음', color: '#8a919d' };

export function makePerson(profiles: Profile[]) {
  const map = new Map(profiles.map((p) => [p.id, p]));
  return (id: string) => map.get(id) ?? { ...UNKNOWN, id };
}

/** 내가 리뷰어인데 아직 한 번도 댓글을 안 단, 끝나지 않은 글 */
export function isMyTurn(post: Post, meId: string, comments: CommentLite[]): boolean {
  return post.author_id !== meId
    && post.reviewer_ids.includes(meId)
    && post.status !== 'done'
    && !comments.some((c) => c.post_id === post.id && c.author_id === meId);
}
