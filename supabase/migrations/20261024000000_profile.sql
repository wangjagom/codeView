-- 프로필 사진과 한 줄 소개 (둘 다 선택).
-- 사진은 앱에서 160×160 JPEG로 줄여 data URL로 저장해요. 그래서 Storage 버킷을 따로 만들 필요가 없어요.

alter table public.profiles
  add column if not exists avatar text,
  add column if not exists bio text;

alter table public.profiles
  add constraint profiles_avatar_format check (
    avatar is null or (length(avatar) <= 150000 and avatar ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$')
  ),
  add constraint profiles_bio_length check (bio is null or char_length(bio) <= 80);

-- 이름은 그대로 못 바꾸고, 색·사진·소개만 바꿀 수 있어요.
grant update (avatar, bio) on public.profiles to authenticated;
