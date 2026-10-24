import type { ReactElement } from 'react';
import { langLabel } from '../lib/langs';

/** 언어별 그림 (10×10 칸 기준). 파일 모양 안쪽 아래에 들어가요. */
const GLYPHS: Record<string, ReactElement> = {
  ABAP: <path d="M1 9.5 L4.2 0.6 H5.8 L9 9.5 H6.9 L6.25 7.5 H3.75 L3.1 9.5 Z M4.25 5.9 H5.75 L5 3.5 Z" fill="#1f6fd1" fillRule="evenodd" />,
  CDS: <><path d="M5 0.5 L9.6 2.9 L5 5.3 L0.4 2.9 Z" fill="#0e8f86" /><path d="M0.6 5.3 L5 7.6 L9.4 5.3 M0.6 7.5 L5 9.8 L9.4 7.5" fill="none" stroke="#0e8f86" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></>,
  SQLScript: <><ellipse cx="5" cy="2" rx="4.2" ry="1.6" fill="#b0458b" /><path d="M0.8 2 V8 C0.8 9.1 2.7 9.8 5 9.8 C7.3 9.8 9.2 9.1 9.2 8 V2 M0.8 5 C0.8 6.1 2.7 6.8 5 6.8 C7.3 6.8 9.2 6.1 9.2 5" fill="none" stroke="#b0458b" strokeWidth="1.3" /></>,
  XML: <path d="M3.1 1.8 L0.6 5 L3.1 8.2 M6.9 1.8 L9.4 5 L6.9 8.2 M5.9 1 L4.1 9" fill="none" stroke="#e66a12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
  JavaScript: <><rect x="0.3" y="0.3" width="9.4" height="9.4" rx="1.6" fill="#f5c518" /><text x="9" y="8.9" textAnchor="end" fontFamily="'JetBrains Mono', ui-monospace, monospace" fontSize="4.9" fontWeight="800" fill="#1d1d1f">JS</text></>,
  HTML: <><path d="M0.7 0.5 H9.3 L8.5 8.6 L5 9.8 L1.5 8.6 Z" fill="#e44d26" /><path d="M4.1 3.2 L2.7 5 L4.1 6.8 M5.9 3.2 L7.3 5 L5.9 6.8" fill="none" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" /></>,
  CSS: <path d="M3.7 0.9 L2.6 9.1 M7.4 0.9 L6.3 9.1 M1.1 3.5 H9.1 M0.9 6.5 H8.9" fill="none" stroke="#6a3fb5" strokeWidth="1.5" strokeLinecap="round" />,
  JSON: <path d="M3.6 0.9 C2 0.9 2.4 2.3 2.4 3.4 C2.4 4.4 2 5 1 5 C2 5 2.4 5.6 2.4 6.6 C2.4 7.7 2 9.1 3.6 9.1 M6.4 0.9 C8 0.9 7.6 2.3 7.6 3.4 C7.6 4.4 8 5 9 5 C8 5 7.6 5.6 7.6 6.6 C7.6 7.7 8 9.1 6.4 9.1" fill="none" stroke="#d48806" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />,
  /** 예전 글의 다른 언어 (TypeScript 등) */
  other: <path d="M1 1.5 H9 M1 4.2 H9 M1 6.9 H6.5" fill="none" stroke="#8b95a1" strokeWidth="1.4" strokeLinecap="round" />,
};
// 예전 글 언어는 가까운 그림으로 보여 줘요.
const ALIAS: Record<string, string> = { TypeScript: 'JavaScript', JSX: 'JavaScript', TSX: 'JavaScript', SQL: 'SQLScript' };

/** 파일 언어 아이콘 (접힌 문서 + 안쪽 아래 언어 그림). 종이·테두리 색은 CSS 변수로 바꿔요. */
export function LangIcon({ lang, size = 18, className = '' }: { lang: string; size?: number; className?: string }) {
  const g = GLYPHS[lang] ?? GLYPHS[ALIAS[lang]] ?? GLYPHS.other;
  return (
    <svg className={`fi ${className}`} width={size} height={size} viewBox="0 0 20 20" role="img" aria-label={langLabel(lang)}>
      <path className="fi-paper" d="M4.5 1h8.2L17 5.3V18a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" strokeWidth={size <= 20 ? 1.15 : 0.9} />
      <path className="fi-fold" d="M12.7 1v3.3a1 1 0 0 0 1 1H17" fill="none" strokeWidth={size <= 20 ? 1.15 : 0.9} />
      <g transform="translate(5.3 7.6) scale(0.98)">{g}</g>
    </svg>
  );
}
