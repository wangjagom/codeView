import { supabase } from './supabase';
import type { Comment, CommentLite, Like, Member, Post, PostFile, PostKind, Profile, Role, Status, Suggestion, Team, Thread, Version } from './types';

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/* ---------- 프로필 ---------- */

// 사진·소개 칸은 새 SQL(20261024000000_profile.sql)을 실행해야 생겨요. 아직이면 기본 칸만 읽어요.
const BASIC_COLS = 'id, name, color';
let profileCols = 'id, name, color, avatar, bio';
const missingColumn = (e: { message: string; code?: string } | null) => Boolean(e && /avatar|bio/.test(e.message) && (e.code === '42703' || e.code === 'PGRST204' || /column/i.test(e.message)));

async function withProfileCols<T>(run: (cols: string) => PromiseLike<{ data: T | null; error: { message: string; code?: string } | null }>): Promise<T> {
  let res = await run(profileCols);
  if (missingColumn(res.error) && profileCols !== BASIC_COLS) { profileCols = BASIC_COLS; res = await run(profileCols); }
  return must(res);
}

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const rows = await withProfileCols((cols) => supabase.from('profiles').select(cols).eq('id', userId)) as unknown as Profile[];
  return rows[0] ?? null;
}

export async function createProfile(id: string, name: string, color: string): Promise<void> {
  must(await supabase.from('profiles').insert({ id, name, color }));
}

export async function updateProfile(id: string, patch: Partial<Pick<Profile, 'color' | 'avatar' | 'bio'>>): Promise<void> {
  must(await supabase.from('profiles').update(patch).eq('id', id));
}

export interface NotificationPrefs {
  email: string;
  on_review: boolean;
  on_request: boolean;
}

/** 알림 설정 표가 아직 없을 때 (20261025000000_notification_prefs_fix.sql을 실행하기 전) */
export const isMissingPrefs = (e: unknown) => /notification_prefs/.test(e instanceof Error ? e.message : String((e as { message?: unknown })?.message ?? e)) && /schema cache|does not exist|Could not find/i.test(e instanceof Error ? e.message : String((e as { message?: unknown })?.message ?? e));

export async function getNotificationPrefs(): Promise<NotificationPrefs | null> {
  const rows = must(await supabase.from('notification_prefs').select('email, on_review, on_request')) as { email: string | null; on_review: boolean; on_request: boolean }[];
  return rows[0] ? { ...rows[0], email: rows[0].email ?? '' } : null;
}

export async function saveNotificationPrefs(userId: string, p: NotificationPrefs): Promise<void> {
  must(await supabase.from('notification_prefs').upsert({ user_id: userId, email: p.email.trim() || null, on_review: p.on_review, on_request: p.on_request }));
}

/* ---------- 팀 ---------- */

export async function listMyTeams(userId: string): Promise<(Team & { role: Role })[]> {
  const rows = must(await supabase.from('team_memberships').select('role, teams(*)').eq('user_id', userId)) as unknown as { role: Role; teams: Team | null }[];
  return rows.filter((r) => r.teams).map((r) => ({ ...(r.teams as Team), role: r.role })).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function listMembers(teamId: string): Promise<Member[]> {
  const rows = await withProfileCols((cols) => supabase.from('team_memberships').select(`role, joined_at, profiles(${cols})`).eq('team_id', teamId).order('joined_at')) as unknown as { role: Role; joined_at: string; profiles: Profile | null }[];
  return rows.filter((r) => r.profiles).map((r) => ({ ...(r.profiles as Profile), role: r.role, joined_at: r.joined_at }));
}

// 직책 고르기는 새 SQL(20261024010000_team_roles.sql)을 실행해야 돼요. 아직이면 예전 방식(만든 사람 = 팀장)으로 해요.
const noRoleArg = (e: { message: string; code?: string } | null) => Boolean(e && (e.code === 'PGRST202' || /Could not find the function/i.test(e.message)));

export async function createTeam(name: string, tasks: string[], role: Role = 'owner'): Promise<Team> {
  let res = await supabase.rpc('create_team', { p_name: name, p_tasks: tasks, p_role: role });
  if (noRoleArg(res.error)) res = await supabase.rpc('create_team', { p_name: name, p_tasks: tasks });
  return must(res) as Team;
}

export async function joinTeam(code: string, role: Role = 'member'): Promise<Team> {
  let res = await supabase.rpc('join_team', { p_code: code, p_role: role });
  if (noRoleArg(res.error)) res = await supabase.rpc('join_team', { p_code: code });
  return must(res) as Team;
}

export interface TeamPeek { name: string; members: number; owner_taken: boolean; vice_taken: boolean; joined: boolean }

/** 초대 코드로 팀 이름과 빈 직책을 미리 봐요. 새 SQL 전이면 null이에요. */
export async function peekTeam(code: string): Promise<TeamPeek | null> {
  const res = await supabase.rpc('peek_team', { p_code: code });
  if (noRoleArg(res.error)) return null;
  return must(res) as TeamPeek;
}

/** 내 직책 바꾸기 (빈 팀장·부팀장 자리를 맡거나 팀원으로 내려와요) */
export async function setMyRole(teamId: string, role: Role): Promise<void> {
  must(await supabase.rpc('set_my_role', { p_team: teamId, p_role: role }));
}

/**
 * 팀원 누구나 과제 하나를 더해요. 띄어쓰기만 다른 같은 과제가 있으면 그대로 둬요.
 * 새 SQL 전이면 팀장·부팀장만 예전 방식(목록 통째로 저장)으로 더할 수 있어요.
 */
export async function addTeamTask(teamId: string, task: string, current: string[], canManage: boolean): Promise<string[]> {
  const res = await supabase.rpc('add_team_task', { p_team: teamId, p_task: task });
  if (noRoleArg(res.error)) {
    if (!canManage) throw new Error('add_team_task missing');
    const next = [...current, task.trim()];
    must(await supabase.from('teams').update({ tasks: next }).eq('id', teamId));
    return next;
  }
  return must(res) as string[];
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
    supabase.from('post_versions').select('*').eq('post_id', id).order('version'),
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

export async function createPost(input: NewPost & { kind?: PostKind; files?: PostFile[] }): Promise<Post> {
  // 리뷰 요청·파일 하나면 kind·files를 보내지 않아요 (DB 기본값). 새 SQL 전에도 그대로 올라가게요.
  const { kind, files, ...rest } = input;
  const row: NewPost & { kind?: PostKind; files?: PostFile[] } = { ...rest, ...(kind === 'share' ? { kind } : {}), ...(files && files.length > 1 ? { files } : {}) };
  return must(await supabase.from('posts').insert(row as NewPost).select('*').single());
}

/* ---------- 👍 도움됐어요 · 🔖 저장 ---------- */

// 새 SQL(20261024060000_likes_bookmarks_edit.sql) 전이면 표가 없어서, 목록은 빈 채로 두고 앱은 그대로 써요.
const missingTable = (e: { message: string; code?: string } | null) => Boolean(e && (e.code === '42P01' || e.code === 'PGRST205' || /relation .* does not exist|Could not find the table/i.test(e.message)));

export async function listLikes(postIds: string[]): Promise<Like[]> {
  if (!postIds.length) return [];
  const res = await supabase.from('post_likes').select('post_id, user_id').in('post_id', postIds);
  if (missingTable(res.error)) return [];
  return must(res) as Like[];
}

export async function listMyBookmarks(userId: string): Promise<string[]> {
  const res = await supabase.from('post_bookmarks').select('post_id').eq('user_id', userId);
  if (missingTable(res.error)) return [];
  return (must(res) as { post_id: string }[]).map((r) => r.post_id);
}

export async function setLike(postId: string, on: boolean, userId: string): Promise<void> {
  const res = on ? await supabase.from('post_likes').insert({ post_id: postId }) : await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
  if (res.error && /duplicate key/.test(res.error.message)) return;
  if (missingTable(res.error)) throw new Error('likes table missing');
  must(res);
}

export async function setBookmark(postId: string, on: boolean, userId: string): Promise<void> {
  const res = on ? await supabase.from('post_bookmarks').insert({ post_id: postId }) : await supabase.from('post_bookmarks').delete().eq('post_id', postId).eq('user_id', userId);
  if (res.error && /duplicate key/.test(res.error.message)) return;
  if (missingTable(res.error)) throw new Error('likes table missing');
  must(res);
}

/* ---------- 글 고치기 ---------- */

/** 제목·설명·과제·리뷰어 고치기 (글쓴이만) */
export async function updatePostMeta(postId: string, patch: Partial<Pick<Post, 'title' | 'ask' | 'task' | 'reviewer_ids'>>): Promise<void> {
  const rows = must(await supabase.from('posts').update(patch).eq('id', postId).select('id')) as { id: string }[];
  if (!rows.length) throw new Error('only the author can edit');
}

/** 코드(파일들) 고치기. 새 버전으로 남고, threads는 [{id, file(없애면 null), line}]로 옮겨요. */
export async function updatePostCode(postId: string, files: PostFile[], threads: { id: string; file: number | null; line: number }[], note: string): Promise<Post> {
  const res = await supabase.rpc('update_post_code', { p_post: postId, p_files: files, p_threads: threads, p_note: note });
  if (res.error && (res.error.code === 'PGRST202' || /Could not find the function/i.test(res.error.message))) throw new Error('update_post_code missing');
  return must(res) as Post;
}

export async function setStatus(postId: string, status: Status): Promise<void> {
  must(await supabase.from('posts').update({ status }).eq('id', postId));
}

export async function deletePost(postId: string): Promise<void> {
  must(await supabase.from('posts').delete().eq('id', postId));
}

/** 그 줄에 스레드가 없으면 만들고 첫 댓글을 달아요. */
/** 줄 리뷰 (line이 null이면 글 전체에 다는 댓글) */
export async function addLineComment(postId: string, line: number | null, body: string, suggestion: Suggestion | null, threadId?: string, file = 0): Promise<void> {
  let tid = threadId;
  if (!tid) {
    const t = must(await supabase.from('threads').insert(file ? { post_id: postId, line, file } : { post_id: postId, line }).select('id').single()) as { id: string };
    tid = t.id;
  }
  must(await supabase.from('comments').insert({ thread_id: tid, post_id: postId, body, suggestion }));
}

/** 내 리뷰 글 고치기. 고칠 권한이 없으면(새 SQL 전 포함) 0줄이 바뀌어서 오류로 알려요. */
export async function updateComment(id: string, body: string): Promise<void> {
  const rows = must(await supabase.from('comments').update({ body }).eq('id', id).select('id')) as { id: string }[];
  if (!rows.length) throw new Error('comment edit not allowed');
}

/** 내 리뷰 지우기. 대화의 마지막 댓글이면 대화도 같이 지워져요. */
export async function deleteComment(id: string): Promise<void> {
  const rows = must(await supabase.from('comments').delete().eq('id', id).select('id')) as { id: string }[];
  if (!rows.length) throw new Error('comment edit not allowed');
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
  if (/"line".*not-null|null value in column "line"/i.test(msg)) return '전체 댓글을 쓰려면 Supabase에서 새 SQL(20261025010000_general_comments.sql)을 먼저 실행해야 해요.';
  if (/suggestion needs a line/.test(msg)) return '수정 제안은 줄 리뷰에만 달 수 있어요.';
  if (isMissingPrefs(e)) return '이메일 알림은 아직 준비 중이에요. Supabase에서 새 SQL(20261025000000_notification_prefs_fix.sql)을 실행하면 쓸 수 있어요.';
  if (/code changed/.test(msg)) return '그 사이 코드가 바뀌어서 이 제안은 적용할 수 없어요.';
  if (/only the author/.test(msg)) return '수정 제안은 코드를 올린 사람만 적용할 수 있어요.';
  if (/already applied/.test(msg)) return '이미 적용된 제안이에요.';
  if (/invalid invite code/.test(msg)) return '초대 코드가 맞지 않아요. 팀장에게 새 코드를 받아 주세요.';
  if (/team needs an owner/.test(msg)) return '팀장이 한 명은 있어야 해요. 다른 팀원을 먼저 팀장으로 지정해 주세요.';
  if (/'files' column|column posts\.files|'file' column|column threads\.file|posts_files_valid/i.test(msg)) return /posts_files_valid/.test(msg)
    ? '파일 이름이 겹치거나 비어 있는 파일이 있어요. 확인해 주세요.'
    : '파일 여러 개를 올리려면 Supabase에서 새 SQL(20261024050000_multi_file.sql)을 먼저 실행해야 해요.';
  if (/'kind' column|column posts\.kind|kind.*schema cache/i.test(msg)) return '코드 공유 글을 올리려면 Supabase에서 새 SQL(20261024040000_post_kind.sql)을 먼저 실행해야 해요.';
  if (/likes table missing|update_post_code missing/.test(msg)) return '이 기능을 쓰려면 Supabase에서 새 SQL(20261024060000_likes_bookmarks_edit.sql)을 먼저 실행해야 해요.';
  if (/only the author can edit/.test(msg)) return '글쓴이만 고칠 수 있어요.';
  if (/add_team_task missing/.test(msg)) return '팀원이 과제를 추가하려면 Supabase에서 새 SQL(20261024030000_add_task.sql)을 먼저 실행해야 해요. 지금은 팀장·부팀장만 추가할 수 있어요.';
  if (/too many tasks/.test(msg)) return '과제는 30개까지 만들 수 있어요.';
  if (/invalid task name/.test(msg)) return '과제 이름은 1~40자로 적어 주세요.';
  if (/comment edit not allowed/.test(msg)) return '리뷰를 고치거나 지우려면 Supabase에서 새 SQL(20261024020000_comment_edit.sql)을 먼저 실행해야 해요.';
  if (/only owners/.test(msg)) return '팀장·부팀장만 할 수 있어요.';
  if (/owner taken|team_one_owner/.test(msg)) return '이미 팀장이 있어요. 다른 직책을 골라 주세요.';
  if (/vice taken|team_one_vice/.test(msg)) return '이미 부팀장이 있어요. 다른 직책을 골라 주세요.';
  if (/set_my_role|peek_team/.test(msg) && /function/i.test(msg)) return '직책을 바꾸려면 Supabase에서 새 SQL(20261024010000_team_roles.sql)을 먼저 실행해야 해요.';
  if (/invalid input value for enum|team_role/.test(msg)) return '부팀장을 쓰려면 Supabase에서 새 SQL(20261024010000_team_roles.sql)을 먼저 실행해야 해요.';
  if (/row-level security|JSON object requested/.test(msg)) return '이 팀에 속한 사람만 볼 수 있어요.';
  if (/rate limit/i.test(msg)) return '요청이 너무 많아요. 잠시 뒤 다시 시도해 주세요.';
  if (/User already registered|profiles_name_unique|duplicate key.*profiles/i.test(msg)) return '이미 있는 이름이에요. 다른 이름을 정해 주세요.';
  if (/Invalid login credentials/i.test(msg)) return '이름이나 비밀번호가 맞지 않아요.';
  if (/Password should be at least/i.test(msg)) return '비밀번호가 너무 짧아요. 6자 이상으로 정해 주세요.';
  if (/weak.?password|Password should contain/i.test(msg)) return '비밀번호가 너무 쉬워요. 영문·숫자를 섞어 더 길게 정해 주세요.';
  if (/Signups not allowed|signup.*disabled/i.test(msg)) return 'Supabase에서 가입이 꺼져 있어요. Authentication 설정에서 가입을 허용해 주세요.';
  if (/Email logins are disabled|Email provider is disabled|email_provider_disabled/i.test(msg)) return 'Supabase에서 Email 로그인 방식이 꺼져 있어요. 켜 주세요. (README 참고)';
  if (/Email address .* is invalid|email_address_invalid/i.test(msg)) return 'Supabase에서 가입 확인 메일을 보내려고 해서 막혔어요. Authentication → Sign In / Providers → Email 에서 Confirm email을 꺼 주세요.';
  if (/Email not confirmed/i.test(msg)) return 'Supabase에서 Confirm email을 꺼 주세요. (README 참고)';
  if (/(avatar|bio)/.test(msg) && /column/i.test(msg)) return '사진·소개를 저장하려면 Supabase에서 새 SQL(20261024000000_profile.sql)을 먼저 실행해야 해요.';
  if (/profiles_avatar_format/.test(msg)) return '이 사진은 저장할 수 없어요. 다른 이미지를 골라 주세요.';
  if (/profiles_bio_length/.test(msg)) return '소개는 80자까지예요.';
  if (/profiles_name_format/.test(msg)) return '이름은 한글, 영문, 숫자와 _ . - 로 2~20자만 쓸 수 있어요.';
  if (/Invalid path specified/.test(msg)) return 'Supabase 주소 설정이 잘못됐어요. VITE_SUPABASE_URL에 https://<프로젝트>.supabase.co 만 넣어 주세요.';
  if (/Invalid API key|No API key/i.test(msg)) return 'Supabase 키 설정이 잘못됐어요. VITE_SUPABASE_ANON_KEY에 anon(public) 키를 넣어 주세요.';
  if (/Failed to fetch|NetworkError/.test(msg)) return '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.';
  return msg;
}
