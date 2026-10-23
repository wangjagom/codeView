import { supabase } from './supabase';
import type { Comment, CommentLite, Post, Profile, Status, Suggestion, Thread, Version } from './types';

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function isMember(): Promise<boolean> {
  return must(await supabase.rpc('is_member')) as boolean;
}

export async function listProfiles(): Promise<Profile[]> {
  return must(await supabase.from('profiles').select('id, name, color').order('created_at'));
}

export async function createProfile(id: string, name: string, color: string): Promise<void> {
  must(await supabase.from('profiles').insert({ id, name, color }));
}

export async function updateProfile(id: string, patch: Partial<Pick<Profile, 'name' | 'color'>>): Promise<void> {
  must(await supabase.from('profiles').update(patch).eq('id', id));
}

export async function listPosts(): Promise<Post[]> {
  return must(await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(200));
}

export async function listCommentsLite(): Promise<CommentLite[]> {
  return must(await supabase.from('comments').select('post_id, author_id, created_at').order('created_at', { ascending: false }).limit(2000));
}

export async function getPost(id: string): Promise<{ post: Post; threads: Thread[]; versions: Version[] }> {
  const [post, threads, comments, versions] = await Promise.all([
    supabase.from('posts').select('*').eq('id', id).single(),
    supabase.from('threads').select('*').eq('post_id', id).order('line'),
    supabase.from('comments').select('*').eq('post_id', id).order('created_at'),
    supabase.from('post_versions').select('version, code, note, created_by, created_at').eq('post_id', id).order('version'),
  ]);
  const cs = must(comments) as Comment[];
  return {
    post: must(post) as Post,
    threads: (must(threads) as Omit<Thread, 'comments'>[]).map((t) => ({ ...t, comments: cs.filter((c) => c.thread_id === t.id) })),
    versions: must(versions) as Version[],
  };
}

export interface NewPost {
  title: string;
  file_name: string;
  lang: string;
  task: string;
  ask: string;
  code: string;
  reviewer_ids: string[];
}

export async function createPost(input: NewPost): Promise<Post> {
  return must(await supabase.from('posts').insert(input).select('*').single());
}

export async function setStatus(postId: string, status: Status): Promise<void> {
  must(await supabase.from('posts').update({ status }).eq('id', postId));
}

export async function deletePost(postId: string): Promise<void> {
  must(await supabase.from('posts').delete().eq('id', postId));
}

/** 그 줄에 스레드가 없으면 만들고 첫 댓글을 달아요. */
export async function addLineComment(postId: string, line: number, body: string, suggestion: Suggestion | null, threadId?: string): Promise<void> {
  let tid = threadId;
  if (!tid) {
    const t = must(await supabase.from('threads').insert({ post_id: postId, line }).select('id').single()) as { id: string };
    tid = t.id;
  }
  must(await supabase.from('comments').insert({ thread_id: tid, post_id: postId, body, suggestion }));
}

export async function setResolved(threadId: string, resolved: boolean): Promise<void> {
  must(await supabase.from('threads').update({ resolved }).eq('id', threadId));
}

export async function applySuggestion(commentId: string): Promise<Post> {
  return must(await supabase.rpc('apply_suggestion', { p_comment_id: commentId })) as Post;
}

/** 서버 에러 메시지를 사람이 읽을 수 있는 말로 바꿔요. */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/code changed/.test(msg)) return '그 사이 코드가 바뀌어서 이 제안은 적용할 수 없어요.';
  if (/only the author/.test(msg)) return '수정 제안은 코드를 올린 사람만 적용할 수 있어요.';
  if (/already applied/.test(msg)) return '이미 적용된 제안이에요.';
  if (/not a team member|row-level security/.test(msg)) return '팀 명단에 없는 계정이에요. 조장에게 이메일 등록을 부탁해 주세요.';
  if (/Failed to fetch|NetworkError/.test(msg)) return '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.';
  return msg;
}
