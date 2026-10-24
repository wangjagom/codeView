import { createContext, useContext } from 'react';
import type { CommentLite, Member, Post, Profile, Role, Team } from './types';

export type MyTeam = Team & { role: Role };

export interface Store {
  me: Profile;
  /** 지금 보고 있는 팀 */
  team: MyTeam;
  /** 내가 속한 모든 팀 */
  teams: MyTeam[];
  /** 팀장·부팀장이면 팀을 관리할 수 있어요 */
  isOwner: boolean;
  /** 지금 팀의 팀원 (나 포함) */
  profiles: Member[];
  person: (id: string) => Profile;
  posts: Post[];
  comments: CommentLite[];
  /** 서버에서 지금 팀의 목록을 다시 불러와요. */
  refresh: () => Promise<void>;
  /** 팀 정보·팀 목록을 다시 불러와요. 팀을 나가거나 지웠을 때도 써요. */
  reloadTeams: (preferTeamId?: string) => Promise<void>;
  switchTeam: (teamId: string) => void;
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

const UNKNOWN: Profile = { id: '', name: '나간 팀원', color: '#8a919d' };

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

/* 마지막으로 본 팀과 초대 링크로 받은 코드는 이 브라우저에만 기억해요. */
const LAST_TEAM = 'codeview:team';
const PENDING_CODE = 'codeview:join';
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* 저장 못 해도 괜찮아요 */ } };
export const lastTeam = { get: () => read(LAST_TEAM), set: (v: string | null) => write(LAST_TEAM, v) };
export const pendingCode = { get: () => read(PENDING_CODE), set: (v: string | null) => write(PENDING_CODE, v) };
/** 가입할 때 적은 사진·소개. 프로필이 만들어진 뒤에 저장해요. */
export const pendingProfile = {
  get: (): { avatar?: string | null; bio?: string | null } | null => { try { return JSON.parse(read('codeview.pendingProfile') ?? 'null'); } catch { return null; } },
  set: (v: { avatar?: string | null; bio?: string | null } | null) => write('codeview.pendingProfile', v ? JSON.stringify(v) : null),
};
