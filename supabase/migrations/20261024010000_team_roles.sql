-- 조장·부조장을 '조를 만든 사람'으로 정하지 않고, 조를 만들거나 들어올 때 각자 골라요.
-- 직책: owner(조장) · vice(부조장) · member(조원). 조장과 부조장은 조마다 한 명씩이에요.
-- 조장·부조장은 둘 다 조를 관리할 수 있어요 (초대 코드, 조 정보, 조원 직책·내보내기, 조 삭제).

-- 조장이 꼭 있어야 한다는 규칙은 없애요. 비어 있으면 누구든 나중에 맡을 수 있어요.
drop trigger if exists memberships_keep_owner on public.team_memberships;
drop function if exists public.keep_one_owner();

-- 직책을 enum 대신 text + check로 바꿔요 (enum에 값을 더하면 같은 실행 안에서 바로 못 써서요).
alter table public.team_memberships alter column role drop default;
alter table public.team_memberships alter column role type text using role::text;
alter table public.team_memberships alter column role set default 'member';
alter table public.team_memberships add constraint team_memberships_role_check check (role in ('owner', 'vice', 'member'));
drop type if exists public.team_role;

-- 기존 데이터에 조장이 여러 명이면 먼저 들어온 한 명만 조장으로 남겨요.
update public.team_memberships m set role = 'member'
where m.role = 'owner' and exists (
  select 1 from public.team_memberships o
  where o.team_id = m.team_id and o.role = 'owner' and (o.joined_at, o.user_id) < (m.joined_at, m.user_id)
);
create unique index team_one_owner on public.team_memberships (team_id) where role = 'owner';
create unique index team_one_vice on public.team_memberships (team_id) where role = 'vice';

-- 관리 권한: 조장 또는 부조장 (정책들이 이 함수를 그대로 써요)
create or replace function public.is_team_owner(p_team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_memberships where team_id = p_team and user_id = auth.uid() and role in ('owner', 'vice'));
$$;

-- 직책 자리가 이미 찼으면 알아보기 쉬운 오류로 바꿔요.
create or replace function public.role_taken_error(p_role text)
returns void language plpgsql as $$
begin
  if p_role = 'owner' then raise exception 'owner taken'; end if;
  raise exception 'vice taken';
end;
$$;
revoke execute on function public.role_taken_error(text) from public, anon, authenticated;

-- ---------------------------------------------------------------
-- 조 만들기 / 참여 (직책을 골라요)
-- ---------------------------------------------------------------
drop function if exists public.create_team(text, text[]);
create function public.create_team(p_name text, p_tasks text[] default null, p_role text default 'owner')
returns public.teams language plpgsql security definer set search_path = public as $$
declare
  t public.teams;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'profile required';
  end if;
  if p_role not in ('owner', 'vice', 'member') then raise exception 'invalid role'; end if;
  insert into public.teams (name, tasks, invite_code, created_by)
  values (trim(p_name), coalesce(nullif(p_tasks, '{}'), array['자유 질문']), public.new_invite_code(), auth.uid())
  returning * into t;
  insert into public.team_memberships (team_id, user_id, role) values (t.id, auth.uid(), p_role);
  return t;
end;
$$;

drop function if exists public.join_team(text);
create function public.join_team(p_code text, p_role text default 'member')
returns public.teams language plpgsql security definer set search_path = public as $$
declare
  t public.teams;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'profile required';
  end if;
  if p_role not in ('owner', 'vice', 'member') then raise exception 'invalid role'; end if;
  select * into t from public.teams where invite_code = upper(trim(p_code));
  if not found then
    raise exception 'invalid invite code';
  end if;
  begin
    insert into public.team_memberships (team_id, user_id, role) values (t.id, auth.uid(), p_role)
    on conflict (team_id, user_id) do nothing;
  exception when unique_violation then
    perform public.role_taken_error(p_role);
  end;
  return t;
end;
$$;

-- 초대 코드로 들어가기 전에 조 이름과 빈 직책을 미리 봐요.
create or replace function public.peek_team(p_code text)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  t public.teams;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select * into t from public.teams where invite_code = upper(trim(p_code));
  if not found then raise exception 'invalid invite code'; end if;
  return json_build_object(
    'name', t.name,
    'members', (select count(*) from public.team_memberships where team_id = t.id),
    'owner_taken', exists (select 1 from public.team_memberships where team_id = t.id and role = 'owner'),
    'vice_taken', exists (select 1 from public.team_memberships where team_id = t.id and role = 'vice'),
    'joined', exists (select 1 from public.team_memberships where team_id = t.id and user_id = auth.uid())
  );
end;
$$;

-- 내 직책 바꾸기: 비어 있는 조장·부조장 자리를 맡거나 조원으로 내려와요.
create or replace function public.set_my_role(p_team uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_role not in ('owner', 'vice', 'member') then raise exception 'invalid role'; end if;
  if not public.is_team_member(p_team) then raise exception 'not a member'; end if;
  begin
    update public.team_memberships set role = p_role where team_id = p_team and user_id = auth.uid();
  exception when unique_violation then
    perform public.role_taken_error(p_role);
  end;
end;
$$;

revoke execute on function public.create_team(text, text[], text), public.join_team(text, text), public.peek_team(text), public.set_my_role(uuid, text) from public, anon;
grant execute on function public.create_team(text, text[], text), public.join_team(text, text), public.peek_team(text), public.set_my_role(uuid, text) to authenticated;

-- 마지막 사람이 나가면 빈 조는 지워요.
create or replace function public.drop_empty_team()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.team_memberships where team_id = old.team_id) then
    delete from public.teams where id = old.team_id;
  end if;
  return null;
end;
$$;
create trigger memberships_drop_empty_team
  after delete on public.team_memberships
  for each row execute function public.drop_empty_team();
