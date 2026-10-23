import type React from "react";
/** 화면에 쓰는 작은 선 아이콘. 서비스 로고는 아직 없어서 넣지 않았어요. */
const PATHS: Record<string, React.ReactElement> = {
  home: <path fill="currentColor" d="M12 3.2 3 10.4V20a1 1 0 0 0 1 1h5.5v-6h5v6H20a1 1 0 0 0 1-1v-9.6l-9-7.2z" />,
  plus: <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><path d="M12 8v8M8 12h8" /></g>,
  team: <g fill="currentColor"><circle cx="9" cy="8" r="3.6" /><path d="M2.5 19.5c.6-3.7 3.2-5.8 6.5-5.8s5.9 2.1 6.5 5.8z" /><circle cx="17" cy="9" r="2.8" opacity=".55" /><path d="M15.8 13.7c3 .1 5.2 2 5.7 5.3h-4.3c-.2-2-.7-3.8-1.4-5.3z" opacity=".55" /></g>,
  me: <g fill="currentColor"><circle cx="12" cy="8" r="4" /><path d="M4 20.5c.7-4.2 3.9-6.6 8-6.6s7.3 2.4 8 6.6z" /></g>,
  down: <path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />,
  back: <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />,
  chev: <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />,
};

export function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <svg className={`ic ${className}`} viewBox="0 0 24 24" aria-hidden="true">{PATHS[name]}</svg>;
}
