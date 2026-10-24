-- 👍 도움됐어요 (팀원 모두에게 보여요) · 🔖 저장 (나만 봐요) · 글 코드 고치기

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_likes_user_idx on public.post_likes (user_id);

create table public.post_bookmarks (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_bookmarks_user_idx on public.post_bookmarks (user_id);

alter table public.post_likes enable row level security;
alter table public.post_bookmarks enable row level security;

create policy "team reads likes" on public.post_likes for select to authenticated using (public.can_see_post(post_id));
create policy "like as myself" on public.post_likes for insert to authenticated with check (user_id = auth.uid() and public.can_see_post(post_id));
create policy "unlike my own" on public.post_likes for delete to authenticated using (user_id = auth.uid());

create policy "read my bookmarks" on public.post_bookmarks for select to authenticated using (user_id = auth.uid());
create policy "bookmark as myself" on public.post_bookmarks for insert to authenticated with check (user_id = auth.uid() and public.can_see_post(post_id));
create policy "remove my bookmark" on public.post_bookmarks for delete to authenticated using (user_id = auth.uid());

revoke update on public.post_likes, public.post_bookmarks from authenticated;

alter publication supabase_realtime add table public.post_likes;

-- ---------------------------------------------------------------
-- 글쓴이가 코드(파일들)를 고쳐요. 새 버전으로 남기고, 줄 리뷰는 앱이 계산한 새 자리로 옮겨요.
-- p_threads: [{ "id": 대화 id, "file": 새 파일 번호 또는 null(지우기), "line": 새 줄 }]
-- 목록에 없는 대화 중 없어진 파일에 있던 건 지워요.
-- ---------------------------------------------------------------
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
      delete from public.threads where id = r.id and post_id = p.id;
    elsif r.file between 0 and n - 1 then
      update public.threads set file = r.file, line = greatest(1, coalesce(r.line, 1)) where id = r.id and post_id = p.id;
    end if;
  end loop;
  delete from public.threads where post_id = p.id and file >= n;

  update public.posts set files = p_files, version = version + 1 where id = p.id returning * into p;
  insert into public.post_versions (post_id, version, code, files, created_by, note)
  values (p.id, p.version, p.code, p.files, auth.uid(), left(coalesce(nullif(btrim(p_note), ''), '직접 수정'), 80));
  return p;
end;
$$;

revoke execute on function public.update_post_code(uuid, jsonb, jsonb, text) from public, anon;
grant execute on function public.update_post_code(uuid, jsonb, jsonb, text) to authenticated;
