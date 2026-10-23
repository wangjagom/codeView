-- 줄톡 초기 스키마
-- Supabase 대시보드 SQL Editor에 통째로 붙여넣고 실행하거나, `supabase db push`로 적용해요.

-- ---------------------------------------------------------------
-- 팀 명단: 여기에 있는 이메일로 로그인한 사람만 데이터를 볼 수 있어요.
-- 정책을 일부러 두지 않아서 브라우저에서는 읽거나 쓸 수 없고, 대시보드(SQL)로만 관리해요.
-- ---------------------------------------------------------------
create table public.team_members (
  email text primary key check (email = lower(email))
);
alter table public.team_members enable row level security;

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke execute on function public.is_member() from public, anon;
grant execute on function public.is_member() to authenticated;

-- ---------------------------------------------------------------
-- 테이블
-- ---------------------------------------------------------------
create type public.post_status as enum ('wait', 'doing', 'done');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 20),
  color text not null default '#4f6bd8' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  file_name text not null default 'code.js' check (char_length(file_name) between 1 and 80),
  lang text not null default 'JavaScript',
  task text not null default '자유 질문',
  ask text not null default '' check (char_length(ask) <= 2000),
  code text not null check (char_length(code) between 1 and 50000),
  version int not null default 1,
  status public.post_status not null default 'wait',
  reviewer_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_created_at_idx on public.posts (created_at desc);

create table public.post_versions (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts (id) on delete cascade,
  version int not null,
  code text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (post_id, version)
);

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  line int not null check (line >= 1),
  resolved boolean not null default false,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index threads_post_idx on public.threads (post_id);

-- suggestion 형식: {"from": 8, "count": 2, "original": ["..", ".."], "to": ["..", "..", ".."]}
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  suggestion jsonb check (
    suggestion is null or (
      jsonb_typeof(suggestion -> 'from') = 'number'
      and jsonb_typeof(suggestion -> 'count') = 'number'
      and jsonb_typeof(suggestion -> 'original') = 'array'
      and jsonb_typeof(suggestion -> 'to') = 'array'
    )
  ),
  applied_at timestamptz,
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id);
create index comments_thread_idx on public.comments (thread_id);

-- ---------------------------------------------------------------
-- 트리거
-- ---------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger posts_touch before update on public.posts
  for each row execute function public.touch_updated_at();

-- 글을 올리면 v1을 버전 기록에 남겨요.
create or replace function public.record_first_version()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.post_versions (post_id, version, code, created_by, note)
  values (new.id, new.version, new.code, new.author_id, '처음 올린 코드');
  return new;
end;
$$;
create trigger posts_first_version after insert on public.posts
  for each row execute function public.record_first_version();

-- 다른 사람이 첫 리뷰를 남기면 '리뷰 대기' → '피드백 중'으로 바꿔요.
create or replace function public.mark_post_doing()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.posts set status = 'doing'
  where id = new.post_id and status = 'wait' and author_id <> new.author_id;
  return new;
end;
$$;
create trigger comments_mark_doing after insert on public.comments
  for each row execute function public.mark_post_doing();

-- 댓글의 post_id가 스레드의 post_id와 같은지 확인해요.
create or replace function public.check_comment_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.threads t where t.id = new.thread_id and t.post_id = new.post_id) then
    raise exception 'thread does not belong to post';
  end if;
  return new;
end;
$$;
create trigger comments_check_post before insert on public.comments
  for each row execute function public.check_comment_post();

-- ---------------------------------------------------------------
-- 수정 제안 적용 (글쓴이만). 코드 교체, 새 버전 기록, 아래쪽 스레드 줄 번호 이동을 한 번에 해요.
-- ---------------------------------------------------------------
create or replace function public.apply_suggestion(p_comment_id uuid)
returns public.posts
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.comments;
  p public.posts;
  s jsonb;
  lines text[];
  orig text[];
  repl text[];
  v_from int;
  v_count int;
  delta int;
  i int;
begin
  if not public.is_member() then
    raise exception 'not a team member';
  end if;

  select * into c from public.comments where id = p_comment_id;
  if not found or c.suggestion is null then
    raise exception 'suggestion not found';
  end if;
  if c.applied_at is not null then
    raise exception 'suggestion already applied';
  end if;

  select * into p from public.posts where id = c.post_id for update;
  if p.author_id <> auth.uid() then
    raise exception 'only the author can apply suggestions';
  end if;

  s := c.suggestion;
  v_from := (s ->> 'from')::int;
  v_count := (s ->> 'count')::int;
  select coalesce(array_agg(x order by n), '{}') into orig from jsonb_array_elements_text(s -> 'original') with ordinality as t(x, n);
  select coalesce(array_agg(x order by n), '{}') into repl from jsonb_array_elements_text(s -> 'to') with ordinality as t(x, n);

  lines := string_to_array(p.code, E'\n');
  if v_from < 1 or v_count < 1 or v_from + v_count - 1 > coalesce(array_length(lines, 1), 0) then
    raise exception 'suggestion is out of range';
  end if;
  for i in 1..v_count loop
    if lines[v_from + i - 1] is distinct from orig[i] then
      raise exception 'code changed since the suggestion was made';
    end if;
  end loop;

  lines := lines[1:v_from - 1] || repl || lines[v_from + v_count:];
  delta := coalesce(array_length(repl, 1), 0) - v_count;

  update public.posts
    set code = array_to_string(lines, E'\n'), version = version + 1
    where id = p.id
    returning * into p;

  insert into public.post_versions (post_id, version, code, created_by, note)
  values (p.id, p.version, p.code, auth.uid(), '수정 제안 적용');

  update public.threads
    set line = greatest(1, line + delta)
    where post_id = p.id and line >= v_from + v_count;

  update public.comments set applied_at = now() where id = c.id;
  return p;
end;
$$;
revoke execute on function public.apply_suggestion(uuid) from public, anon;
grant execute on function public.apply_suggestion(uuid) to authenticated;

-- ---------------------------------------------------------------
-- RLS 정책
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_versions enable row level security;
alter table public.threads enable row level security;
alter table public.comments enable row level security;

create policy "members read profiles" on public.profiles for select to authenticated using (public.is_member());
create policy "members create own profile" on public.profiles for insert to authenticated with check (public.is_member() and id = auth.uid());
create policy "members update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (public.is_member() and id = auth.uid());

create policy "members read posts" on public.posts for select to authenticated using (public.is_member());
create policy "members create own posts" on public.posts for insert to authenticated with check (public.is_member() and author_id = auth.uid() and version = 1);
create policy "authors update posts" on public.posts for update to authenticated using (author_id = auth.uid()) with check (public.is_member() and author_id = auth.uid());
create policy "authors delete posts" on public.posts for delete to authenticated using (author_id = auth.uid());

-- 글쓴이가 코드를 직접 바꾸지 못하게 해요. 코드는 apply_suggestion으로만 바뀌어요.
revoke update on public.posts from authenticated;
grant update (title, ask, task, status, reviewer_ids) on public.posts to authenticated;

create policy "members read versions" on public.post_versions for select to authenticated using (public.is_member());

create policy "members read threads" on public.threads for select to authenticated using (public.is_member());
create policy "members create threads" on public.threads for insert to authenticated with check (public.is_member() and created_by = auth.uid());
create policy "members resolve threads" on public.threads for update to authenticated using (public.is_member()) with check (public.is_member());
revoke update on public.threads from authenticated;
grant update (resolved) on public.threads to authenticated;

create policy "members read comments" on public.comments for select to authenticated using (public.is_member());
create policy "members create comments" on public.comments for insert to authenticated with check (public.is_member() and author_id = auth.uid() and applied_at is null);
create policy "authors delete comments" on public.comments for delete to authenticated using (author_id = auth.uid());

-- ---------------------------------------------------------------
-- 실시간: 조원이 리뷰를 남기면 열린 화면이 바로 갱신돼요.
-- ---------------------------------------------------------------
alter publication supabase_realtime add table public.posts, public.threads, public.comments;

-- ---------------------------------------------------------------
-- 마지막 단계: 조원 이메일을 넣어 주세요 (소문자로).
-- insert into public.team_members (email) values
--   ('me@example.com'), ('friend@example.com');
-- ---------------------------------------------------------------
