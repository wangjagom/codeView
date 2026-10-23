import { useEffect, useRef, useState, type ReactNode } from 'react';
import { href, navigate } from '../lib/router';
import { isMyTurn, useStore } from '../lib/store';
import { weekStart } from '../lib/util';
import { Avatar } from './Avatar';

export type Filter = 'all' | 'turn' | 'mine' | 'done';

export function Layout({ view, filter, task, onFilter, onTask, children }: {
  view: string; filter: Filter; task: string; onFilter: (f: Filter) => void; onTask: (t: string) => void; children: ReactNode;
}) {
  const { me, team, posts, comments, isAnonymous } = useStore();
  const turns = posts.filter((p) => isMyTurn(p, me.id, comments)).length;
  const items: { f: Filter; label: string; n: number; hot?: boolean }[] = [
    { f: 'all', label: '전체', n: posts.length },
    { f: 'turn', label: '내 리뷰 차례', n: turns, hot: true },
    { f: 'mine', label: '내가 올린 코드', n: posts.filter((p) => p.author_id === me.id).length },
    { f: 'done', label: '해결됨', n: posts.filter((p) => p.status === 'done').length },
  ];
  const go = (f: Filter) => { onFilter(f); navigate({ name: 'feed' }); };

  return (
    <div className="shell" data-view={view}>
      <aside className="nav">
        <a className="brand" href={href({ name: 'feed' })}><span className="mark">cv</span>codeView</a>
        <TeamSwitcher />
        <a className="btn primary wide" href={href({ name: 'new' })}>+ 코드 올리기</a>
        <nav className="menu" aria-label="보기">
          {items.map((it) => (
            <button key={it.f} type="button" aria-current={view === 'feed' && filter === it.f} onClick={() => go(it.f)}>
              <span>{it.label}</span>
              {(!it.hot || it.n > 0) && <span className={`badge ${it.hot ? 'hot' : ''}`}>{it.n}</span>}
            </button>
          ))}
        </nav>
        <div className="menu-h">과제</div>
        <div className="tasks">
          {team.tasks.map((t) => (
            <button key={t} type="button" aria-pressed={task === t} onClick={() => { onTask(task === t ? '' : t); navigate({ name: 'feed' }); }}>{t}</button>
          ))}
        </div>
        <a className="me-link" href={href({ name: 'me' })}><Avatar person={me} size="xs" />{me.name}<span className={`me-hint ${isAnonymous ? 'warn' : ''}`}>{isAnonymous ? '이메일 연결하기' : '내 정보'}</span></a>
      </aside>
      <main>{children}</main>
      <RightPanel />
    </div>
  );
}

function TeamSwitcher() {
  const { team, teams, profiles, switchTeam } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);

  return (
    <div className="team" ref={ref}>
      <button type="button" className="team-btn" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>
        <span className="team-txt"><b>{team.name}</b><small>{profiles.length}명 · {team.role === 'owner' ? '조장' : '조원'}</small></span>
        <span className="caret" aria-hidden="true">▾</span>
      </button>
      <div className="faces">{profiles.slice(0, 8).map((p) => <Avatar key={p.id} person={p} size="xs" />)}</div>
      {open && (
        <div className="team-menu" role="menu">
          {teams.map((t) => (
            <button key={t.id} type="button" role="menuitemradio" aria-checked={t.id === team.id} onClick={() => { setOpen(false); switchTeam(t.id); }}>
              <span>{t.name}</span>{t.id === team.id && <span aria-hidden="true">✓</span>}
            </button>
          ))}
          <hr />
          <a role="menuitem" href={href({ name: 'team' })} onClick={() => setOpen(false)}>조 설정 · 초대하기</a>
          <a role="menuitem" href={href({ name: 'teams' })} onClick={() => setOpen(false)}>다른 조 만들기 · 참여하기</a>
        </div>
      )}
    </div>
  );
}

function RightPanel() {
  const { profiles, posts, comments } = useStore();
  const since = weekStart();
  const inWeek = (iso: string) => new Date(iso) >= since;
  const authorOf = new Map(posts.map((p) => [p.id, p.author_id]));
  const weekComments = comments.filter((c) => inWeek(c.created_at));
  const given = (id: string) => weekComments.filter((c) => c.author_id === id && authorOf.get(c.post_id) !== id).length;
  const max = Math.max(1, ...profiles.map((p) => given(p.id)));
  const end = new Date(since); end.setDate(end.getDate() + 6);
  const md = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

  return (
    <aside className="right">
      <div className="panel">
        <h2>이번 주 <span>{md(since)} – {md(end)}</span></h2>
        <div className="stats">
          <div><b>{posts.filter((p) => inWeek(p.created_at)).length}</b><small>리뷰 요청</small></div>
          <div><b>{weekComments.length}</b><small>남긴 리뷰</small></div>
          <div><b>{posts.filter((p) => p.status === 'done' && inWeek(p.updated_at)).length}</b><small>해결</small></div>
        </div>
      </div>
      <div className="panel">
        <h2>조원 <span>이번 주 리뷰 수</span></h2>
        <ul className="mates">
          {profiles.map((p) => (
            <li key={p.id}>
              <Avatar person={p} />
              <span>{p.name}<small>올린 코드 {posts.filter((x) => x.author_id === p.id).length}개</small></span>
              <span className="mate-n"><span className="bar"><i style={{ width: `${(given(p.id) / max) * 100}%` }} /></span><b>{given(p.id)}</b></span>
            </li>
          ))}
        </ul>
      </div>
      <div className="panel">
        <h2>우리 조 리뷰 규칙</h2>
        <ol className="rule">
          <li>리뷰 요청은 24시간 안에 한 명 이상 답해요</li>
          <li>지적할 땐 이유와 고친 코드를 같이 남겨요</li>
          <li>해결되면 올린 사람이 해결됨으로 바꿔요</li>
        </ol>
      </div>
    </aside>
  );
}
