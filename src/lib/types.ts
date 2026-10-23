export type Status = 'wait' | 'doing' | 'done';

export interface Profile {
  id: string;
  name: string;
  color: string;
}

export interface Post {
  id: string;
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
