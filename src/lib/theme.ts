/** 화면 모드: 시스템을 따르거나 라이트·다크로 고정해요. 이 브라우저에만 기억해요 (index.html이 그리기 전에 먼저 붙여요). */
export type Theme = 'system' | 'light' | 'dark';

const KEY = 'cv-theme';
const BG = { light: '#f2f4f6', dark: '#0f1012' };

export function getTheme(): Theme {
  try { const t = localStorage.getItem(KEY); return t === 'light' || t === 'dark' ? t : 'system'; } catch { return 'system'; }
}

export function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === 'system') delete root.dataset.theme; else root.dataset.theme = t;
  const dark = t === 'dark' || (t === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? BG.dark : BG.light);
}

export function setTheme(t: Theme) {
  try { if (t === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, t); } catch { /* 저장 못 해도 지금 화면엔 적용돼요 */ }
  applyTheme(t);
}
