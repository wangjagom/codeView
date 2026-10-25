-- 글 전체에 다는 댓글: 줄(line)이 없는 대화예요. 답글·수정·삭제·알림은 줄 리뷰와 같아요.
-- 수정 제안(코드 바꾸기)은 줄 리뷰에만 달 수 있고, 글 코드를 고쳐도 전체 댓글은 그대로 남아요.

alter table public.threads alter column line drop not null;

-- 전체 댓글에는 수정 제안을 달 수 없어요.
create or replace function public.no_suggestion_on_general()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.suggestion is not null and exists (select 1 from public.threads t where t.id = new.thread_id and t.line is null) then
    raise exception 'suggestion needs a line';
  end if;
  return new;
end;
$$;

drop trigger if exists comments_no_suggestion_on_general on public.comments;
create trigger comments_no_suggestion_on_general before insert or update of suggestion on public.comments
  for each row execute function public.no_suggestion_on_general();

-- 코드 고치기: 줄 리뷰만 옮기거나 지우고, 전체 댓글(line is null)은 건드리지 않아요.
create or replace function public.update_post_code(p_post uuid, p_files jsonb, p_threads jsonb default '[]', p_note text default '직접 수정')
returns public.posts
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.posts;
  r record;
  n int;
begin
  select * into p from public.posts where id = p_post for update;
  if not found then raise exception 'post not found'; end if;
  if p.author_id <> auth.uid() or not public.is_team_member(p.team_id) then
    raise exception 'only the author can edit';
  end if;
  if p_files is null or not public.valid_post_files(p_files) then raise exception 'invalid files'; end if;
  n := jsonb_array_length(p_files);

  for r in select * from jsonb_to_recordset(coalesce(p_threads, '[]'::jsonb)) as x(id uuid, file int, line int) loop
    if r.file is null then
      delete from public.threads where id = r.id and post_id = p.id and line is not null;
    elsif r.file between 0 and n - 1 then
      update public.threads set file = r.file, line = greatest(1, coalesce(r.line, 1)) where id = r.id and post_id = p.id and line is not null;
    end if;
  end loop;
  delete from public.threads where post_id = p.id and file >= n and line is not null;

  update public.posts set files = p_files, version = version + 1 where id = p.id returning * into p;
  insert into public.post_versions (post_id, version, code, files, created_by, note)
  values (p.id, p.version, p.code, p.files, auth.uid(), left(coalesce(nullif(btrim(p_note), ''), '직접 수정'), 80));
  return p;
end;
$$;

revoke execute on function public.update_post_code(uuid, jsonb, jsonb, text) from public, anon;
grant execute on function public.update_post_code(uuid, jsonb, jsonb, text) to authenticated;

notify pgrst, 'reload schema';
