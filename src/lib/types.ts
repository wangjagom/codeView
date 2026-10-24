export type Status = 'wait' | 'doing' | 'done';

export interface Profile {
  id: string;
  name: string;
  color: string;
  /** 프로필 사진 (data URL, 선택) */
  avatar?: string | null;
  /** 한 줄 소개 (선택) */
  bio?: string | null;
}

/** owner = 조장, vice = 부조장. 둘 다 조를 관리할 수 있어요. */
export type Role = 'owner' | 'vice' | 'member';
export const ROLE_LABEL: Record<Role, string> = { owner: '조장', vice: '부조장', member: '조원' };
export const canManage = (role: Role | undefined) => role === 'owner' || role === 'vice';

export interface Team {
  id: string;
  name: string;
  tasks: string[];
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface Member extends Profile {
  role: Role;
  joined_at: string;
}

export interface Post {
  id: string;
  team_id: string;
  author_id: string;
  title: string;
  file_name: string;
  lang: string;
  task: string;
  ask: string;
  code: string;
  version: number;
  status: Status;
  reviewer_ids: string[];
  created_at: string;
  updated_at: string;
}

/** 줄 번호는 1부터 시작해요. original은 제안을 만든 시점의 줄 내용이에요. */
export interface Suggestion {
  from: number;
  count: number;
  original: string[];
  to: string[];
}

export interface Comment {
  id: string;
  thread_id: string;
  post_id: string;
  author_id: string;
  body: string;
  suggestion: Suggestion | null;
  applied_at: string | null;
  created_at: string;
  /** 글을 고친 시각 (고친 적 없으면 비어 있어요) */
  edited_at?: string | null;
}

export interface Thread {
  id: string;
  post_id: string;
  line: number;
  resolved: boolean;
  created_by: string;
  created_at: string;
  comments: Comment[];
}

export interface Version {
  version: number;
  code: string;
  note: string;
  created_by: string;
  created_at: string;
}

/** 목록 화면에서 쓰는 가벼운 댓글 정보 */
export interface CommentLite {
  post_id: string;
  author_id: string;
  created_at: string;
}

export const STATUS_LABEL: Record<Status, string> = {
  wait: '리뷰 대기',
  doing: '피드백 중',
  done: '해결됨',
};
