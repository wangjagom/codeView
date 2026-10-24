-- 한 글에 여러 파일 (최대 10개). posts.files = [{ "name": …, "lang": …, "code": … }, …]
-- 예전 칸(file_name, lang, code)은 첫 번째 파일과 늘 같게 맞춰 둬요. 목록이나 예전 화면이 그대로 쓸 수 있게요.
-- 줄 리뷰(threads)는 몇 번째 파일인지(file, 0부터)를 같이 기억해요. 예전 리뷰는 첫 파일(0)이에요.

create or replace function public.valid_post_files(f jsonb)
returns boolean language sql immutable as $$
  select f is null or (
    jsonb_typeof(f) = 'array'
    and jsonb_array_length(f) between 1 and 10
    and not exists (
      select 1 from jsonb_array_elements(f) e
      where jsonb_typeof(e) <> 'object'
         or jsonb_typeof(e -> 'name') is distinct from 'string'
         or jsonb_typeof(e -> 'lang') is distinct from 'string'
         or jsonb_typeof(e -> 'code') is distinct from 'string'
         or char_length(e ->> 'name') not between 1 and 80
         or char_length(e ->> 'lang') not between 1 and 40
         or char_length(e ->> 'code') not between 1 and 50000
    )
    and (select count(distinct lower(e ->> 'name')) from jsonb_array_elements(f) e) = jsonb_array_length(f)
    and (select sum(char_length(e ->> 'code')) from jsonb_array_elements(f) e) <= 200000
  );
$$;

alter table public.posts add column if not exists files jsonb;
alter table public.posts add constraint posts_files_valid check (public.valid_post_files(files));
alter table public.post_versions add column if not exists files jsonb;
alter table public.threads add column if not exists file smallint not null default 0 check (file between 0 and 9);

-- 기존 글은 지금 코드를 파일 하나로 옮겨요. (수정 시각이 바뀌지 않게 잠깐 꺼요)
alter table public.posts disable trigger posts_touch;
update public.posts set files = jsonb_build_array(jsonb_build_object('name', file_name, 'lang', lang, 'code', code)) where files is null;
alter table public.posts enable trigger posts_touch;
update public.post_versions v set files = jsonb_build_array(jsonb_build_object('name', p.file_name, 'lang', p.lang, 'code', v.code))
  from public.posts p where p.id = v.post_id and v.files is null;

-- files와 예전 칸을 늘 맞춰요.
create or replace function public.sync_post_files()
returns trigger language plpgsql as $$
begin
  if new.files is null then
    new.files := jsonb_build_array(jsonb_build_object('name', new.file_name, 'lang', new.lang, 'code', new.code));
  elsif tg_op = 'UPDATE' and new.code is distinct from old.code and new.files = old.files then
    new.files := jsonb_set(new.files, '{0,code}', to_jsonb(new.code));
  end if;
  new.file_name := new.files -> 0 ->> 'name';
  new.lang := new.files -> 0 ->> 'lang';
  new.code := new.files -> 0 ->> 'code';
  return new;
end;
$$;
create trigger posts_sync_files before insert or update on public.posts
  for each row execute function public.sync_post_files();

-- 처음 버전에도 파일 전체를 남겨요.
create or replace function public.record_first_version()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.post_versions (post_id, version, code, files, created_by, note)
  values (new.id, new.version, new.code, new.files, new.author_id, '처음 올린 코드');
  return new;
end;
$$;

-- 수정 제안 적용: 리뷰가 달린 파일만 바꾸고, 그 파일의 아래쪽 리뷰 줄 번호만 옮겨요.
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
  fidx int;
  lines text[];
  orig text[];
  repl text[];
  v_from int;
  v_count int;
  delta int;
  i int;
  new_files jsonb;
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

  select file into fidx from public.threads where id = c.thread_id;
  if p.files -> fidx is null then
    raise exception 'suggestion is out of range';
  end if;

  s := c.suggestion;
  v_from := (s ->> 'from')::int;
  v_count := (s ->> 'count')::int;
  select coalesce(array_agg(x order by n), '{}') into orig from jsonb_array_elements_text(s -> 'original') with ordinality as t(x, n);
  select coalesce(array_agg(x order by n), '{}') into repl from jsonb_array_elements_text(s -> 'to') with ordinality as t(x, n);

  lines := string_to_array(p.files -> fidx ->> 'code', E'\n');
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
  new_files := jsonb_set(p.files, array[fidx::text, 'code'], to_jsonb(array_to_string(lines, E'\n')));

  update public.posts
    set files = new_files, version = version + 1
    where id = p.id
    returning * into p;

  insert into public.post_versions (post_id, version, code, files, created_by, note)
  values (p.id, p.version, p.code, p.files, auth.uid(), '수정 제안 적용');

  update public.threads
    set line = greatest(1, line + delta)
    where post_id = p.id and file = fidx and line >= v_from + v_count;

  update public.comments set applied_at = now() where id = c.id;
  return p;
end;
$$;
