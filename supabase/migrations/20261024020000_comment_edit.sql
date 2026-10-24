-- 내가 남긴 리뷰(댓글)를 고치거나 지울 수 있어요.
-- 고칠 수 있는 건 글(body)뿐이에요. 수정 제안 코드는 그대로 두고, 바꾸고 싶으면 지우고 다시 남겨요.

alter table public.comments add column if not exists edited_at timestamptz;

create policy "authors edit own comments" on public.comments for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid() and public.can_see_post(post_id));
create policy "authors delete own comments" on public.comments for delete to authenticated
  using (author_id = auth.uid());

revoke update on public.comments from authenticated;
grant update (body) on public.comments to authenticated;

-- 글을 고치면 고친 시각을 남겨요.
create or replace function public.mark_comment_edited()
returns trigger language plpgsql as $$
begin
  if new.body is distinct from old.body then new.edited_at := now(); end if;
  return new;
end;
$$;
create trigger comments_mark_edited before update on public.comments
  for each row execute function public.mark_comment_edited();

-- 대화의 마지막 댓글을 지우면 빈 대화도 지워요.
create or replace function public.drop_empty_thread()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.comments where thread_id = old.thread_id) then
    delete from public.threads where id = old.thread_id;
  end if;
  return null;
end;
$$;
create trigger comments_drop_empty_thread after delete on public.comments
  for each row execute function public.drop_empty_thread();
