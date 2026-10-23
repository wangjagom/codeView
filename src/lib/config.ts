const env = import.meta.env;

export const SUPABASE_URL: string = env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY: string = env.VITE_SUPABASE_ANON_KEY ?? '';
export const DEFAULT_TASKS = ['자유 질문'];

export const LANGS = ['JavaScript', 'TypeScript', 'JSX', 'TSX', 'CSS', 'HTML', 'Python', 'Java', 'SQL'] as const;

export const FENCE: Record<string, string> = {
  JavaScript: 'js', TypeScript: 'ts', JSX: 'jsx', TSX: 'tsx', CSS: 'css', HTML: 'html', Python: 'py', Java: 'java', SQL: 'sql',
};

export const PALETTE = ['#4f6bd8', '#c0583e', '#2f8f6a', '#a0559f', '#b98500', '#2b8aa6', '#c2477a', '#6b7d2a'];

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
