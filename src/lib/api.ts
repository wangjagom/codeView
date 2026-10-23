import { supabase } from './supabase';
import type { Comment, CommentLite, Member, Post, Profile, Role, Status, Suggestion, Team, Thread, Version } from './types';

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/* ---------- 프로필 ---------- */

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const rows = must(await supabase.from('profiles').select('id, name, color').eq('id', userId)) as Profile[];
  return rows[0] ?? null;
}

export async function createProfile(id: string, name: string, color: string): Promise<void> {
  must(await supabase.from('profiles').insert({ id, name, color }));
}

export async function updateProfile(id: string, patch: Partial<Pick<Profile, 'name' | 'color'>>): Promise<void> {
  must(await supabase.from('profiles').update(patch).eq('id', id));
}

export interface NotificationPrefs {
  email: string;
  on_review: boolean;
  on_request: boolean;
}

export async function getNotificationPrefs(): Promise<NotificationPrefs | null> {
  const rows = must(await supabase.from('notification_prefs').select('email, on_review, on_request')) as { email: string | null; on_review: boolean; on_request: boolean }[];
  return rows[0] ? { ...rows[0], email: rows[0].email ?? '' } : null;
}

export async function saveNotificationPrefs(userId: string, p: NotificationPrefs): Promise<void> {
  must(await supabase.from('notification_prefs').upsert({ user_id: userId, email: p.email.trim() || null, on_review: p.on_review, on_request: p.on_request }));
}

/* ---------- 조 ---------- */

export async function listMyTeams(userId: string): Promise<(Team & { role: Role })[]> {
  const rows = must(await supabase.from('team_memberships').select('role, teams(*)').eq('user_id', userId)) as unknown as { role: Role; teams: Team | null }[];
  return rows.filter((r) => r.teams).map((r) => ({ ...(r.teams as Team), role: r.role })).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function listMembers(teamId: string): Promise<Member[]> {
  const rows = must(await supabase.from('team_memberships').select('role, joined_at, profiles(id, name, color)').eq('team_id', teamId).order('joined_at')) as unknown as { role: Role; joined_at: string; profiles: Profile | null }[];
  return rows.filter((r) => r.profiles).map((r) => ({ ...(r.profiles as Profile), role: r.role, joined_at: r.joined_at }));
}

export async function createTeam(name: string, tasks: string[]): Promise<Team> {
  return must(await supabase.rpc('create_team', { p_name: name, p_tasks: tasks })) as Team;
}

export async function joinTeam(code: string): Promise<Team> {
  return must(await supabase.rpc('join_team', { p_code: code })) as Team;
}

export async function regenerateInvite(teamId: string): Promise<string> {
  return must(await supabase.rpc('regenerate_invite', { p_team: teamId })) as string;
}

export async function updateTeam(teamId: string, patch: Partial<Pick<Team, 'name' | 'tasks'>>): Promise<void> {
  must(await supabase.from('teams').update(patch).eq('id', teamId));
}

export async function setRole(teamId: string, userId: string, role: Role): Promise<void> {
  must(await supabase.from('team_memberships').update({ role }).eq('team_id', teamId).eq('user_id', userId));
}

export async function removeMember(teamId: string, userId: string): Promise<void> {
  must(await supabase.from('team_memberships').delete().eq('team_id', teamId).eq('user_id', userId));
}

export async function deleteTeam(teamId: string): Promise<void> {
  must(await supabase.from('teams').delete().eq('id', teamId));
}

/* ---------- 글 ---------- */

export async function listPosts(teamId: string): Promise<Post[]> {
  return must(await supabase.from('posts').select('*').eq('team_id', teamId).order('created_at', { ascending: false }).limit(200));
}

export async function listCommentsLite(postIds: string[]): Promise<CommentLite[]> {
  if (!postIds.length) return [];
  return must(await supabase.from('comments').select('post_id, author_id, created_at').in('post_id', postIds).order('created_at', { ascending: false }).limit(2000));
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
  team_id: string;
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
  const msg = e instanceof Error ? e.message
    : e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message)
    : String(e);
  if (/code changed/.test(msg)) return '그 사이 코드가 바뀌어서 이 제안은 적용할 수 없어요.';
  if (/only the author/.test(msg)) return '수정 제안은 코드를 올린 사람만 적용할 수 있어요.';
  if (/already applied/.test(msg)) return '이미 적용된 제안이에요.';
  if (/invalid invite code/.test(msg)) return '초대 코드가 맞지 않아요. 조장에게 새 코드를 받아 주세요.';
  if (/team needs an owner/.test(msg)) return '조장이 한 명은 있어야 해요. 다른 조원을 먼저 조장으로 지정해 주세요.';
  if (/only owners/.test(msg)) return '조장만 할 수 있어요.';
  if (/row-level security|JSON object requested/.test(msg)) return '이 조에 속한 사람만 볼 수 있어요.';
  if (/rate limit/i.test(msg)) return '요청이 너무 많아요. 잠시 뒤 다시 시도해 주세요.';
  if (/User already registered|profiles_name_unique|duplicate key.*profiles/i.test(msg)) return '이미 있는 이름이에요. 다른 이름을 정해 주세요.';
  if (/Invalid login credentials/i.test(msg)) return '이름이나 비밀번호가 맞지 않아요.';
  if (/Password should be at least/i.test(msg)) return '비밀번호가 너무 짧아요. 6자 이상으로 정해 주세요.';
  if (/weak.?password|Password should contain/i.test(msg)) return '비밀번호가 너무 쉬워요. 영문·숫자를 섞어 더 길게 정해 주세요.';
  if (/Signups not allowed|signup.*disabled/i.test(msg)) return 'Supabase에서 가입이 꺼져 있어요. Authentication 설정에서 가입을 허용해 주세요.';
  if (/Email logins are disabled|Email provider is disabled|email_provider_disabled/i.test(msg)) return 'Supabase에서 Email 로그인 방식이 꺼져 있어요. 켜 주세요. (README 참고)';
  if (/Email address .* is invalid|email_address_invalid/i.test(msg)) return 'Supabase에서 가입 확인 메일을 보내려고 해서 막혔어요. Authentication → Sign In / Providers → Email 에서 Confirm email을 꺼 주세요.';
  if (/Email not confirmed/i.test(msg)) return 'Supabase에서 Confirm email을 꺼 주세요. (README 참고)';
  if (/profiles_name_format/.test(msg)) return '이름은 한글, 영문, 숫자와 _ . - 로 2~20자만 쓸 수 있어요.';
  if (/Invalid path specified/.test(msg)) return 'Supabase 주소 설정이 잘못됐어요. VITE_SUPABASE_URL에 https://<프로젝트>.supabase.co 만 넣어 주세요.';
  if (/Invalid API key|No API key/i.test(msg)) return 'Supabase 키 설정이 잘못됐어요. VITE_SUPABASE_ANON_KEY에 anon(public) 키를 넣어 주세요.';
  if (/Failed to fetch|NetworkError/.test(msg)) return '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.';
  return msg;
}
