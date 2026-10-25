-- 알림 설정 표(notification_prefs)가 없거나 API가 아직 모를 때 바로잡아요.
-- 이미 있으면 아무것도 바꾸지 않아요. 여러 번 실행해도 괜찮아요.

create table if not exists public.notification_prefs (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  on_review boolean not null default true,
  on_request boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

drop policy if exists "own prefs read" on public.notification_prefs;
drop policy if exists "own prefs insert" on public.notification_prefs;
drop policy if exists "own prefs update" on public.notification_prefs;
drop policy if exists "own prefs delete" on public.notification_prefs;
create policy "own prefs read" on public.notification_prefs for select to authenticated using (user_id = auth.uid());
create policy "own prefs insert" on public.notification_prefs for insert to authenticated with check (user_id = auth.uid());
create policy "own prefs update" on public.notification_prefs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own prefs delete" on public.notification_prefs for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.notification_prefs to authenticated;
revoke all on public.notification_prefs from anon;

drop trigger if exists notification_prefs_touch on public.notification_prefs;
create trigger notification_prefs_touch before update on public.notification_prefs
  for each row execute function public.touch_updated_at();

-- Supabase API(PostgREST)가 새 표를 바로 알아보게 해요.
notify pgrst, 'reload schema';
