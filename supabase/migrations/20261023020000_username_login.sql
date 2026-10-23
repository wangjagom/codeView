-- 이메일 대신 '겹치지 않는 이름 + 비밀번호'로 로그인해요.
-- 앱은 이름으로 만든 내부용 주소(…@users.codeview.example.com)로 Supabase Auth에 가입시켜요.
-- 그래서 대시보드에서 Authentication → Sign In / Providers → Email 의 'Confirm email'을 꺼야 해요.

-- 이름은 대소문자 구분 없이 겹칠 수 없어요.
create unique index profiles_name_unique on public.profiles (lower(name));

-- 이름 규칙: 한글·영문·숫자·_ . - 로 2~20자 (기존 데이터는 검사하지 않아요)
alter table public.profiles
  add constraint profiles_name_format check (name ~ '^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9_.-]{2,20}$') not valid;

-- 이름은 로그인 아이디라서 바꿀 수 없어요. 색만 바꿀 수 있어요.
revoke update on public.profiles from authenticated;
grant update (color) on public.profiles to authenticated;

-- ---------------------------------------------------------------
-- 알림 설정 (선택). 본인만 보고 바꿀 수 있어요.
-- 실제 메일 발송은 나중에 Edge Function으로 붙여요.
-- ---------------------------------------------------------------
create table public.notification_prefs (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  on_review boolean not null default true,
  on_request boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;
create policy "own prefs read" on public.notification_prefs for select to authenticated using (user_id = auth.uid());
create policy "own prefs insert" on public.notification_prefs for insert to authenticated with check (user_id = auth.uid());
create policy "own prefs update" on public.notification_prefs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own prefs delete" on public.notification_prefs for delete to authenticated using (user_id = auth.uid());

create trigger notification_prefs_touch before update on public.notification_prefs
  for each row execute function public.touch_updated_at();
