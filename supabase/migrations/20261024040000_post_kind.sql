-- 글 종류: review(리뷰 요청) · share(코드 공유).
-- 공유 글은 상태(리뷰 대기 → 피드백 중 → 해결됨)와 리뷰어 없이, 설명(ask 칸)과 질문·의견만 받아요.
-- 종류는 올릴 때 정하고 나중에 바꾸지 않아요 (update 권한을 주지 않아요).

alter table public.posts
  add column if not exists kind text not null default 'review' check (kind in ('review', 'share'));

-- 공유 글에 댓글이 달려도 상태를 '피드백 중'으로 바꾸지 않아요.
create or replace function public.mark_post_doing()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.posts set status = 'doing'
  where id = new.post_id and status = 'wait' and author_id <> new.author_id and kind = 'review';
  return new;
end;
$$;
