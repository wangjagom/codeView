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

/** owner = 팀장, vice = 부팀장. 둘 다 팀을 관리할 수 있어요. */
export type Role = 'owner' | 'vice' | 'member';
export const ROLE_LABEL: Record<Role, string> = { owner: '팀장', vice: '부팀장', member: '팀원' };
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
  /** 글 종류. 새 SQL 전에 올린 글에는 없어서 비어 있으면 리뷰 요청이에요. */
  kind?: PostKind;
  /** 파일들. 첫 파일은 file_name·lang·code와 같아요. 새 SQL 전 글에는 없어요. */
  files?: PostFile[] | null;
}

export interface PostFile { name: string; lang: string; code: string }

/** 글의 파일 목록 (예전 글은 파일 하나) */
export const filesOf = (p: Pick<Post, 'files' | 'file_name' | 'lang' | 'code'>): PostFile[] =>
  p.files?.length ? p.files : [{ name: p.file_name, lang: p.lang, code: p.code }];

/** 그 버전의 파일 목록 (예전 버전은 첫 파일 코드만 있어요) */
export const versionFiles = (v: Pick<Version, 'files' | 'code'>, p: Post): PostFile[] => {
  if (v.files?.length) return v.files;
  const [first, ...rest] = filesOf(p);
  return [{ ...first, code: v.code }, ...rest];
};

/** review = 리뷰 요청 (상태·리뷰어가 있어요), share = 코드 공유 (설명과 질문·의견만) */
export type PostKind = 'review' | 'share';
export const isShare = (p: Pick<Post, 'kind'>) => p.kind === 'share';

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
  /** 줄 리뷰는 줄 번호, 글 전체에 다는 댓글은 null */
  line: number | null;
  resolved: boolean;
  created_by: string;
  created_at: string;
  comments: Comment[];
  /** 몇 번째 파일인지 (0부터). 예전 리뷰에는 없어서 첫 파일이에요. */
  file?: number;
}

export interface Version {
  version: number;
  code: string;
  files?: PostFile[] | null;
  note: string;
  created_by: string;
  created_at: string;
}

/** 목록 화면에서 쓰는 가벼운 댓글 정보 */
/** 👍 도움됐어요 한 번 */
export interface Like { post_id: string; user_id: string }

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
