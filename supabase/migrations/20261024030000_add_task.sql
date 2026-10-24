-- 코드를 올리면서 조원 누구나 새 과제를 추가할 수 있어요.
-- 과제 목록 전체를 바꾸는 것(이름 바꾸기·지우기·순서)은 그대로 조장·부조장만 할 수 있어요.

create or replace function public.add_team_task(p_team uuid, p_task text)
returns text[] language plpgsql security definer set search_path = public as $$
declare
  t text := btrim(p_task);
  cur text[];
  norm text := regexp_replace(lower(t), '[\s.,·:()\[\]_/-]+', '', 'g');
begin
  if not public.is_team_member(p_team) then raise exception 'not a member'; end if;
  if t is null or char_length(t) < 1 or char_length(t) > 40 then raise exception 'invalid task name'; end if;
  select tasks into cur from public.teams where id = p_team for update;
  -- 띄어쓰기·대소문자만 다른 같은 과제가 있으면 그 이름을 그대로 써요.
  if exists (select 1 from unnest(cur) x where regexp_replace(lower(x), '[\s.,·:()\[\]_/-]+', '', 'g') = norm) then
    return cur;
  end if;
  if coalesce(array_length(cur, 1), 0) >= 30 then raise exception 'too many tasks'; end if;
  update public.teams set tasks = cur || t where id = p_team returning tasks into cur;
  return cur;
end;
$$;

revoke execute on function public.add_team_task(uuid, text) from public, anon;
grant execute on function public.add_team_task(uuid, text) to authenticated;
