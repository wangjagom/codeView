const env = import.meta.env;

export const SUPABASE_URL: string = env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY: string = env.VITE_SUPABASE_ANON_KEY ?? '';
export const TEAM_NAME: string = env.VITE_TEAM_NAME || '우리 조 코드방';
export const TASKS: string[] = (env.VITE_TASKS || '4주차 · Todo 앱,3주차 · 쇼핑몰,2주차 · 로그인,자유 질문')
  .split(',')
  .map((t: string) => t.trim())
  .filter(Boolean);

export const LANGS = ['JavaScript', 'TypeScript', 'JSX', 'TSX', 'CSS', 'HTML', 'Python', 'Java', 'SQL'] as const;

export const FENCE: Record<string, string> = {
  JavaScript: 'js', TypeScript: 'ts', JSX: 'jsx', TSX: 'tsx', CSS: 'css', HTML: 'html', Python: 'py', Java: 'java', SQL: 'sql',
};

export const PALETTE = ['#4f6bd8', '#c0583e', '#2f8f6a', '#a0559f', '#b98500', '#2b8aa6', '#c2477a', '#6b7d2a'];

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
