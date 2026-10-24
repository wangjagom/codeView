import { useEffect, type ReactNode } from 'react';
import { href, navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { weekStart } from '../lib/util';
import { ROLE_LABEL } from '../lib/types';
import { Avatar } from './Avatar';
import { Icon } from './Icon';

export type Filter = 'all' | 'turn' | 'share' | 'mine' | 'done' | 'wait' | 'doing';

/** 하단 탭을 보여 줄 화면 (나머지는 뒤로 가기 + 화면 아래 버튼) */
const TAB_VIEWS = new Set(['feed', 'join', 'team', 'me']);
const TABS = [
  { view: 'feed', label: '홈', icon: 'home', to: href({ name: 'feed' }) },
  { view: 'new', label: '올리기', icon: 'plus', to: href({ name: 'new' }) },
  { view: 'team', label: '내 팀', icon: 'team', to: href({ name: 'team' }) },
  { view: 'me', label: '내 정보', icon: 'me', to: href({ name: 'me' }) },
] as const;

export function Layout({ view, sheet, onSheet, children }: {
  view: string; sheet: boolean; onSheet: (open: boolean) => void; children: ReactNode;
}) {
  const withTabs = TAB_VIEWS.has(view);
  useEffect(() => {
    document.body.dataset.page = view === 'new' || view === 'teams' ? 'form' : '';
    return () => { document.body.dataset.page = ''; };
  }, [view]);

  return (
    <>
      <div className={`app ${withTabs ? 'with-tabs' : ''}`} data-view={view}>{children}</div>
      {withTabs && (
        <nav className="tabbar" aria-label="메뉴">
          <div className="tabbar-in">
            {TABS.map((t) => (
              <a key={t.view} className="tab" href={t.to} aria-current={view === t.view || (t.view === 'feed' && view === 'join') ? 'page' : undefined}>
                <Icon name={t.icon} />{t.label}
              </a>
            ))}
          </div>
        </nav>
      )}
      {sheet && <TeamSheet onClose={() => onSheet(false)} />}
    </>
  );
}

/** 탭 화면 위쪽: 로고 자리(비워 둠) + 서비스 이름 + 팀 바꾸기 */
export function Header({ onTeam }: { onTeam: () => void }) {
  const { team } = useStore();
  return (
    <header className="hd">
      <a className="brand" href={href({ name: 'feed' })}><span className="logo-slot" aria-hidden="true" /><span className="wordmark">codeView</span></a>
      <span className="sp" />
      <button type="button" className="team-pill" onClick={onTeam} aria-haspopup="dialog">{team.name}<Icon name="down" /></button>
    </header>
  );
}

/** 뒤로 가기가 있는 화면 위쪽 */
export function BackBar({ label = '목록', to = href({ name: 'feed' }) }: { label?: string; to?: string }) {
  return <a className="back" href={to}><Icon name="back" />{label}</a>;
}

/** 아래에서 올라오는 팀 고르기 */
function TeamSheet({ onClose }: { onClose: () => void }) {
  const { team, teams, switchTeam } = useStore();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-label="팀 고르기">
        <h3>팀 고르기</h3>
        <div className="sheet-list">
          {teams.map((t) => (
            <button key={t.id} type="button" className="item" onClick={() => { onClose(); switchTeam(t.id); }}>
              <span className="body"><span className="t">{t.name}</span><span className="m">{ROLE_LABEL[t.role] ?? '팀원'}</span></span>
              {t.id === team.id && <span className="check-mark" aria-label="지금 보는 팀">✓</span>}
            </button>
          ))}
        </div>
        <button type="button" className="btn soft wide" onClick={() => { onClose(); navigate({ name: 'teams' }); }}>초대 코드로 참여 · 새 팀 만들기</button>
        <button type="button" className="btn wide" onClick={() => { onClose(); navigate({ name: 'team' }); }}>{team.name} 설정 · 초대하기</button>
      </div>
    </div>
  );
}

/** 이번 주 팀 현황 (내 팀 화면에서 보여 줘요) */
export function WeekStats() {
  const { profiles, posts, comments } = useStore();
  const since = weekStart();
  const inWeek = (iso: string) => new Date(iso) >= since;
  const authorOf = new Map(posts.map((p) => [p.id, p.author_id]));
  const weekComments = comments.filter((c) => inWeek(c.created_at));
  const given = (id: string) => weekComments.filter((c) => c.author_id === id && authorOf.get(c.post_id) !== id).length;
  const end = new Date(since); end.setDate(end.getDate() + 6);
  const md = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  const top = [...profiles].sort((a, b) => given(b.id) - given(a.id))[0];

  return (
    <>
      <div className="sec-h"><h2>이번 주</h2><span className="muted small">{md(since)} – {md(end)}</span></div>
      <div className="card stats">
        <div><b>{posts.filter((p) => p.kind !== 'share' && inWeek(p.created_at)).length}</b><small>리뷰 요청</small></div>
        <div><b>{weekComments.length}</b><small>남긴 리뷰</small></div>
        <div><b>{posts.filter((p) => p.status === 'done' && inWeek(p.updated_at)).length}</b><small>해결</small></div>
      </div>
      {top && given(top.id) > 0 && (
        <p className="cheer"><Avatar person={top} size="xs" /><span>리뷰 1위 <b>{top.name}</b> · {given(top.id)}개</span></p>
      )}
    </>
  );
}

export function reviewsGivenThisWeek(profileId: string, posts: { id: string; author_id: string }[], comments: { post_id: string; author_id: string; created_at: string }[]) {
  const since = weekStart();
  const authorOf = new Map(posts.map((p) => [p.id, p.author_id]));
  return comments.filter((c) => new Date(c.created_at) >= since && c.author_id === profileId && authorOf.get(c.post_id) !== profileId).length;
}
