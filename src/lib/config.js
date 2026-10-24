const env = import.meta.env;
/** 'https://xxx.supabase.co/rest/v1/'처럼 경로가 붙어 있어도 주소 부분만 써요. */
export function normalizeSupabaseUrl(raw) {
    const v = (raw ?? '').trim().replace(/^['"]|['"]$/g, '');
    if (!v)
        return '';
    try {
        return new URL(/^https?:\/\//.test(v) ? v : `https://${v}`).origin;
    }
    catch {
        return v;
    }
}
export const SUPABASE_URL = normalizeSupabaseUrl(env.VITE_SUPABASE_URL);
export const SUPABASE_ANON_KEY = (env.VITE_SUPABASE_ANON_KEY ?? '').trim().replace(/^['"]|['"]$/g, '');
export const DEFAULT_TASKS = ['자유 질문'];
export const PALETTE = ['#4f6bd8', '#c0583e', '#2f8f6a', '#a0559f', '#b98500', '#2b8aa6', '#c2477a', '#6b7d2a'];
export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
