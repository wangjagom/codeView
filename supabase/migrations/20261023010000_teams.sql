-- 조(팀)를 앱 안에서 만들고 초대 코드로 참여하도록 바꿔요.
-- 기존 team_members 이메일 명단은 없애고, 조 단위로 권한을 나눠요.
-- 이미 글이 있다면 '우리 조'를 하나 만들어 기존 글과 사람을 모두 넣어요.

-- ---------------------------------------------------------------
-- 테이블
-- ---------------------------------------------------------------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  tasks text[] not null default array['자유 질문'],
  invite_code text not null unique,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create type public.team_role as enum ('owner', 'member');

create table public.team_memberships (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.team_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index team_memberships_user_idx on public.team_memberships (user_id);

alter table public.posts add column team_id uuid references public.teams (id) on delete cascade;
create index posts_team_idx on public.posts (team_id, created_at desc);

-- ---------------------------------------------------------------
-- 기존 데이터 옮기기
-- ---------------------------------------------------------------
do $$
declare
  first_profile uuid;
  t uuid;
begin
  if exists (select 1 from public.posts) then
    select id into first_profile from public.profiles order by created_at limit 1;
    insert into public.teams (name, invite_code, created_by)
    values ('우리 조', upper(substr(md5(random()::text), 1, 8)), first_profile)
    returning id into t;
    insert into public.team_memberships (team_id, user_id, role)
    select t, p.id, case when p.id = first_profile then 'owner'::public.team_role else 'member'::public.team_role end
    from public.profiles p;
    update public.posts set team_id = t;
  end if;
end;
$$;

alter table public.posts alter column team_id set not null;

-- ---------------------------------------------------------------
-- 권한 함수
-- ---------------------------------------------------------------
create or replace function public.is_team_member(p_team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_memberships where team_id = p_team and user_id = auth.uid());
$$;

create or replace function public.is_team_owner(p_team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_memberships where team_id = p_team and user_id = auth.uid() and role = 'owner');
$$;

create or replace function public.can_see_post(p_post uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.posts p join public.team_memberships m on m.team_id = p.team_id
    where p.id = p_post and m.user_id = auth.uid()
  );
$$;

create or replace function public.shares_team_with(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_user = auth.uid() or exists (
    select 1 from public.team_memberships a join public.team_memberships b on a.team_id = b.team_id
    where a.user_id = auth.uid() and b.user_id = p_user
  );
$$;

revoke execute on function public.is_team_member(uuid), public.is_team_owner(uuid), public.can_see_post(uuid), public.shares_team_with(uuid) from public, anon;
grant execute on function public.is_team_member(uuid), public.is_team_owner(uuid), public.can_see_post(uuid), public.shares_team_with(uuid) to authenticated;

-- 헷갈리지 않는 글자만 써서 8자리 초대 코드를 만들어요 (0/O, 1/I 제외).
create or replace function public.new_invite_code()
returns text language plpgsql volatile set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.teams where invite_code = code);
  end loop;
  return code;
end;
$$;
revoke execute on function public.new_invite_code() from public, anon, authenticated;

-- ---------------------------------------------------------------
-- 조 만들기 / 참여 / 초대 코드 새로 만들기
-- ---------------------------------------------------------------
create or replace function public.create_team(p_name text, p_tasks text[] default null)
returns public.teams language plpgsql security definer set search_path = public as $$
declare
  t public.teams;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'profile required';
  end if;
  insert into public.teams (name, tasks, invite_code, created_by)
  values (trim(p_name), coalesce(nullif(p_tasks, '{}'), array['자유 질문']), public.new_invite_code(), auth.uid())
  returning * into t;
  insert into public.team_memberships (team_id, user_id, role) values (t.id, auth.uid(), 'owner');
  return t;
end;
$$;

create or replace function public.join_team(p_code text)
returns public.teams language plpgsql security definer set search_path = public as $$
declare
  t public.teams;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'profile required';
  end if;
  select * into t from public.teams where invite_code = upper(trim(p_code));
  if not found then
    raise exception 'invalid invite code';
  end if;
  insert into public.team_memberships (team_id, user_id) values (t.id, auth.uid())
  on conflict do nothing;
  return t;
end;
$$;

create or replace function public.regenerate_invite(p_team uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  code text;
begin
  if not public.is_team_owner(p_team) then
    raise exception 'only owners can do this';
  end if;
  code := public.new_invite_code();
  update public.teams set invite_code = code where id = p_team;
  return code;
end;
$$;

revoke execute on function public.create_team(text, text[]), public.join_team(text), public.regenerate_invite(uuid) from public, anon;
grant execute on function public.create_team(text, text[]), public.join_team(text), public.regenerate_invite(uuid) to authenticated;

-- 조장이 한 명도 안 남지 않게 막아요.
create or replace function public.keep_one_owner()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  tid uuid := coalesce(old.team_id, new.team_id);
begin
  if exists (select 1 from public.teams where id = tid)
     and exists (select 1 from public.team_memberships where team_id = tid)
     and not exists (select 1 from public.team_memberships where team_id = tid and role = 'owner') then
    raise exception 'team needs an owner';
  end if;
  return null;
end;
$$;
create constraint trigger memberships_keep_owner
  after update or delete on public.team_memberships
  deferrable initially deferred
  for each row execute function public.keep_one_owner();

-- ---------------------------------------------------------------
-- 수정 제안 적용: 팀 명단 대신 조 멤버인지 확인해요.
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
  select * into c from public.comments where id = p_comment_id;
  if not found or c.suggestion is null then
    raise exception 'suggestion not found';
  end if;
  if c.applied_at is not null then
    raise exception 'suggestion already applied';
  end if;

  select * into p from public.posts where id = c.post_id for update;
  if p.author_id <> auth.uid() or not public.is_team_member(p.team_id) then
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

-- ---------------------------------------------------------------
-- 정책 바꾸기
-- ---------------------------------------------------------------
drop policy "members read profiles" on public.profiles;
drop policy "members create own profile" on public.profiles;
drop policy "members update own profile" on public.profiles;
drop policy "members read posts" on public.posts;
drop policy "members create own posts" on public.posts;
drop policy "authors update posts" on public.posts;
drop policy "members read versions" on public.post_versions;
drop policy "members read threads" on public.threads;
drop policy "members create threads" on public.threads;
drop policy "members resolve threads" on public.threads;
drop policy "members read comments" on public.comments;
drop policy "members create comments" on public.comments;

create policy "see teammates" on public.profiles for select to authenticated using (public.shares_team_with(id));
create policy "create own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;

create policy "members read team" on public.teams for select to authenticated using (public.is_team_member(id));
create policy "owners update team" on public.teams for update to authenticated using (public.is_team_owner(id)) with check (public.is_team_owner(id));
create policy "owners delete team" on public.teams for delete to authenticated using (public.is_team_owner(id));
revoke insert, update on public.teams from authenticated;
grant update (name, tasks) on public.teams to authenticated;

create policy "members read memberships" on public.team_memberships for select to authenticated using (public.is_team_member(team_id));
create policy "owners change roles" on public.team_memberships for update to authenticated using (public.is_team_owner(team_id)) with check (public.is_team_owner(team_id));
create policy "leave or remove" on public.team_memberships for delete to authenticated using (user_id = auth.uid() or public.is_team_owner(team_id));
revoke insert, update on public.team_memberships from authenticated;
grant update (role) on public.team_memberships to authenticated;

create policy "team reads posts" on public.posts for select to authenticated using (public.is_team_member(team_id));
create policy "team creates own posts" on public.posts for insert to authenticated with check (public.is_team_member(team_id) and author_id = auth.uid() and version = 1);
create policy "authors update posts" on public.posts for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid() and public.is_team_member(team_id));

create policy "team reads versions" on public.post_versions for select to authenticated using (public.can_see_post(post_id));

create policy "team reads threads" on public.threads for select to authenticated using (public.can_see_post(post_id));
create policy "team creates threads" on public.threads for insert to authenticated with check (public.can_see_post(post_id) and created_by = auth.uid());
create policy "team resolves threads" on public.threads for update to authenticated using (public.can_see_post(post_id)) with check (public.can_see_post(post_id));

create policy "team reads comments" on public.comments for select to authenticated using (public.can_see_post(post_id));
create policy "team creates comments" on public.comments for insert to authenticated with check (public.can_see_post(post_id) and author_id = auth.uid() and applied_at is null);

-- 이메일 명단은 더 이상 쓰지 않아요.
drop function public.is_member();
drop table public.team_members;

alter publication supabase_realtime add table public.team_memberships;
