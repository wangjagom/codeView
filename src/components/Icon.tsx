import type React from "react";
/** 화면에 쓰는 작은 선 아이콘. 서비스 로고는 아직 없어서 넣지 않았어요. */
const PATHS: Record<string, React.ReactElement> = {
  home: <path fill="currentColor" d="M12 3.2 3 10.4V20a1 1 0 0 0 1 1h5.5v-6h5v6H20a1 1 0 0 0 1-1v-9.6l-9-7.2z" />,
  plus: <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><path d="M12 8v8M8 12h8" /></g>,
  team: <g fill="currentColor"><circle cx="9" cy="8" r="3.6" /><path d="M2.5 19.5c.6-3.7 3.2-5.8 6.5-5.8s5.9 2.1 6.5 5.8z" /><circle cx="17" cy="9" r="2.8" opacity=".55" /><path d="M15.8 13.7c3 .1 5.2 2 5.7 5.3h-4.3c-.2-2-.7-3.8-1.4-5.3z" opacity=".55" /></g>,
  me: <g fill="currentColor"><circle cx="12" cy="8" r="4" /><path d="M4 20.5c.7-4.2 3.9-6.6 8-6.6s7.3 2.4 8 6.6z" /></g>,
  down: <path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />,
  back: <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />,
  copy: <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><rect x="8.5" y="8.5" width="11" height="11" rx="2.5" /><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" /></g>,
  check: <path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M5 12.5l4.5 4.5L19 7.5" />,
  chat: <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z" /><path d="M8.5 9.5l-1.5 1.5 1.5 1.5M15.5 9.5l1.5 1.5-1.5 1.5" strokeLinecap="round" /></g>,
  link: <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></g>,
  download: <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M5 19h14" /></g>,
  zip: <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M11 3v2h2v2h-2v2h2v2h-2" strokeLinecap="round" /><rect x="10" y="13" width="4" height="4" rx="1" /></g>,
  more: <g fill="currentColor"><circle cx="5.5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="18.5" cy="12" r="1.8" /></g>,
  paste: <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><rect x="5" y="5" width="14" height="16" rx="2.5" /><path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" /><path d="M9 11h6M9 15h4" strokeLinecap="round" /></g>,
  trash: <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 7h15M10 4h4M6.5 7l1 13h9l1-13" /></g>,
  comment: <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round"><path d="M5 5h14v10H10l-4 4v-4H5z" /><path d="M12 8v4M10 10h4" strokeLinecap="round" /></g>,
  send: <path fill="currentColor" d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" />,
  chev: <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />,
};

export function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <svg className={`ic ${className}`} viewBox="0 0 24 24" aria-hidden="true">{PATHS[name]}</svg>;
}
