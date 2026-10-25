-- 앱 안 알림: 리뷰·댓글·답글·리뷰 부탁·제안 적용·도움됐어요를 받는 사람에게 남겨요.
-- 알림은 서버(트리거)만 만들고, 나는 내 알림을 읽고(읽음 표시) 지울 수만 있어요.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  team_id uuid not null references public.teams (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  kind text not null check (kind in ('review', 'general', 'reply', 'request', 'applied', 'like')),
  snippet text not null default '' check (char_length(snippet) <= 140),
  line int,
  file smallint,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
drop policy if exists "read my notifications" on public.notifications;
drop policy if exists "mark my notifications" on public.notifications;
drop policy if exists "remove my notifications" on public.notifications;
create policy "read my notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "mark my notifications" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "remove my notifications" on public.notifications for delete to authenticated using (user_id = auth.uid());
revoke insert, update on public.notifications from authenticated, anon;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

-- 종류별로 앱 안 알림을 켜고 끌 수 있어요. (도움됐어요는 처음에 꺼 둬요)
alter table public.notification_prefs
  add column if not exists app_review boolean not null default true,
  add column if not exists app_reply boolean not null default true,
  add column if not exists app_request boolean not null default true,
  add column if not exists app_applied boolean not null default true,
  add column if not exists app_like boolean not null default false;

-- 받는 사람이 그 종류를 켜 두었는지 (설정을 저장한 적 없으면 기본값)
create or replace function public.wants_notification(p_user uuid, p_kind text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case p_kind
      when 'review' then app_review when 'general' then app_review
      when 'reply' then app_reply when 'request' then app_request
      when 'applied' then app_applied when 'like' then app_like end
    from public.notification_prefs where user_id = p_user
  ), p_kind <> 'like');
$$;

create or replace function public.notify(p_user uuid, p_actor uuid, p_post public.posts, p_kind text, p_comment uuid, p_snippet text, p_line int, p_file smallint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null or p_user = p_actor or not public.wants_notification(p_user, p_kind) then return; end if;
  if not exists (select 1 from public.team_memberships m where m.team_id = p_post.team_id and m.user_id = p_user) then return; end if;
  insert into public.notifications (user_id, actor_id, team_id, post_id, comment_id, kind, snippet, line, file)
  values (p_user, p_actor, p_post.team_id, p_post.id, p_comment, p_kind, left(regexp_replace(coalesce(p_snippet, ''), '\s+', ' ', 'g'), 140), p_line, p_file);
  -- 30일이 지난 알림은 정리해요.
  delete from public.notifications where user_id = p_user and created_at < now() - interval '30 days';
end;
$$;
revoke execute on function public.notify(uuid, uuid, public.posts, text, uuid, text, int, smallint) from public, anon, authenticated;

-- 리뷰·댓글·답글
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.posts;
  t public.threads;
  u uuid;
begin
  select * into p from public.posts where id = new.post_id;
  select * into t from public.threads where id = new.thread_id;
  if p.id is null or t.id is null then return new; end if;
  -- 글쓴이: 내 코드에 리뷰(줄)·전체 리뷰(댓글)가 달렸어요
  perform public.notify(p.author_id, new.author_id, p, case when t.line is null then 'general' else 'review' end, new.id, new.body, t.line, t.file);
  -- 같은 대화에 앞서 글을 남긴 사람들: 답글이 달렸어요
  for u in select distinct c.author_id from public.comments c where c.thread_id = new.thread_id and c.id <> new.id and c.author_id <> p.author_id loop
    perform public.notify(u, new.author_id, p, 'reply', new.id, new.body, t.line, t.file);
  end loop;
  return new;
end;
$$;
drop trigger if exists comments_notify on public.comments;
create trigger comments_notify after insert on public.comments for each row execute function public.notify_on_comment();

-- 수정 제안이 적용됐어요
create or replace function public.notify_on_applied()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.posts;
  t public.threads;
begin
  if old.applied_at is not null or new.applied_at is null then return new; end if;
  select * into p from public.posts where id = new.post_id;
  select * into t from public.threads where id = new.thread_id;
  perform public.notify(new.author_id, auth.uid(), p, 'applied', new.id, new.body, t.line, t.file);
  return new;
end;
$$;
drop trigger if exists comments_notify_applied on public.comments;
create trigger comments_notify_applied after update of applied_at on public.comments for each row execute function public.notify_on_applied();

-- 리뷰를 부탁받았어요 (새 글, 또는 리뷰어를 새로 넣었을 때)
create or replace function public.notify_on_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  u uuid;
begin
  if coalesce(new.kind, 'review') = 'share' then return new; end if;
  for u in select unnest(new.reviewer_ids) except select unnest(case when tg_op = 'UPDATE' then old.reviewer_ids else '{}'::uuid[] end) loop
    perform public.notify(u, new.author_id, new, 'request', null, new.title, null, null);
  end loop;
  return new;
end;
$$;
drop trigger if exists posts_notify_request on public.posts;
create trigger posts_notify_request after insert or update of reviewer_ids on public.posts for each row execute function public.notify_on_request();

-- 도움됐어요
create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.posts;
begin
  select * into p from public.posts where id = new.post_id;
  if p.id is not null then perform public.notify(p.author_id, new.user_id, p, 'like', null, p.title, null, null); end if;
  return new;
end;
$$;
drop trigger if exists post_likes_notify on public.post_likes;
create trigger post_likes_notify after insert on public.post_likes for each row execute function public.notify_on_like();

notify pgrst, 'reload schema';
