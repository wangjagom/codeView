import { supabase } from './supabase';

/** 로그인 이름 규칙: 한글·영문·숫자·_ . - 로 2~20자 (DB의 profiles_name_format과 같아요) */
export const NAME_RULE = /^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9_.-]{2,20}$/;
export const MIN_PASSWORD = 6;

export function normalizeName(raw: string): string {
  return raw.normalize('NFC').trim();
}

export function nameProblem(raw: string): string | null {
  const v = normalizeName(raw);
  if (!v) return '이름을 적어 주세요.';
  if (/\s/.test(v)) return '이름에는 띄어쓰기를 쓸 수 없어요.';
  if (v.length < 2 || v.length > 20) return '이름은 2~20자로 정해 주세요.';
  if (!NAME_RULE.test(v)) return '이름은 한글, 영문, 숫자와 _ . - 만 쓸 수 있어요.';
  return null;
}

/**
 * Supabase Auth는 이메일이 있어야 가입할 수 있어서, 이름으로 내부용 주소를 만들어요.
 * 한글 이름도 쓸 수 있게 해시로 바꾸고, 대소문자는 구분하지 않아요. 이 주소로 메일을 보내지는 않아요.
 */
export async function nameToEmail(raw: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalizeName(raw).toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
  return `u${hex.slice(0, 32)}@users.codeview.example.com`;
}

export async function signUpWithName(name: string, password: string, color: string) {
  const email = await nameToEmail(name);
  return supabase.auth.signUp({ email, password, options: { data: { username: normalizeName(name), color } } });
}

export async function signInWithName(name: string, password: string) {
  const email = await nameToEmail(name);
  return supabase.auth.signInWithPassword({ email, password });
}
