import { useMemo, useState } from 'react';
import { searchPosts, type SearchHit } from '../lib/search';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Expand, useFlip } from '../components/Motion';
import { Header, type Filter } from '../components/Layout';
import { checkCode } from '../lib/checks';
import { href } from '../lib/router';
import { isMyTurn, useStore } from '../lib/store';
import { STATUS_LABEL, filesOf, isShare, type Post } from '../lib/types';
import { timeAgo } from '../lib/util';
import { LangIcon } from '../components/LangIcon';

const CHIPS: [Filter, string][] = [['all', '전체'], ['turn', '내 차례'], ['share', '공유'], ['saved', '저장'], ['wait', '리뷰 대기'], ['doing', '피드백 중'], ['done', '해결됨'], ['mine', '내 코드']];

export function Feed({ filter, task, onFilter, onTask, onTeam }: {
  filter: Filter; task: string; onFilter: (f: Filter) => void; onTask: (t: string) => void; onTeam: () => void;
}) {
  const { me, team, posts, comments, person, profiles, likes, bookmarks } = useStore();
  const [showTasks, setShowTasks] = useState(Boolean(task));
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'new' | 'liked'>('new');
  const hits = useMemo(() => searchPosts(posts, query, (id) => person(id).name), [posts, query, person]);
  const likeCount = useMemo(() => { const m = new Map<string, number>(); for (const l of likes) m.set(l.post_id, (m.get(l.post_id) ?? 0) + 1); return m; }, [likes]);
  const listRef = useFlip<HTMLDivElement>();
  const turns = posts.filter((p) => isMyTurn(p, me.id, comments));

  const match = (p: Post, f: Filter) => f === 'all' || (f === 'turn' && isMyTurn(p, me.id, comments)) || (f === 'mine' && p.author_id === me.id)
    || (f === 'share' && isShare(p)) || (f === 'saved' && bookmarks.has(p.id)) || (!isShare(p) && p.status === f);
  const searching = query.trim().length > 0;
  const inTask = posts.filter((p) => (!task || p.task === task) && (!searching || hits.has(p.id)));
  const list = inTask.filter((p) => match(p, filter));
  if (sort === 'liked') list.sort((a, b) => (likeCount.get(b.id) ?? 0) - (likeCount.get(a.id) ?? 0) || b.created_at.localeCompare(a.created_at));

  return (
    <section>
      <Header onTeam={onTeam} />
      {turns.length > 0 && (
        <section className="turn-card" aria-label="내 리뷰 차례">
          <span className="lab">내 리뷰 차례</span>
          {turns.slice(0, 3).map((p) => (
            <a key={p.id} className="turn-item" href={href({ name: 'post', id: p.id })}>
              <Avatar person={person(p.author_id)} />
              <span className="body"><span className="t">{p.title}</span><span className="m">{person(p.author_id).name} · {timeAgo(p.created_at)}</span></span>
              <span className="btn sm primary" aria-hidden="true">리뷰하기</span>
            </a>
          ))}
        </section>
      )}

      <div className="search" role="search">
        <Icon name="search" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="제목·코드·파일 이름으로 찾기 (예: READ TABLE)" aria-label="코드 검색" enterKeyHint="search" />
        {searching && <button type="button" className="search-x" aria-label="검색 지우기" onClick={() => setQuery('')}><Icon name="close" /></button>}
      </div>

      <div className="sec-h">
        <h2>{searching ? `'${query.trim()}' 검색 ${list.length}개` : task || '코드'}</h2>
        <button type="button" className="sort-btn" aria-pressed={sort === 'liked'} onClick={() => setSort(sort === 'new' ? 'liked' : 'new')} title="정렬 바꾸기">
          {sort === 'new' ? '최신순' : '도움순'}
        </button>
        <button type="button" aria-expanded={showTasks} onClick={() => { if (showTasks) onTask(''); setShowTasks(!showTasks); }}>
          {showTasks ? '과제 닫기' : '과제별'}<Icon name={showTasks ? 'down' : 'chev'} />
        </button>
      </div>
      <Expand open={showTasks}>
        <div className="chips" role="group" aria-label="과제">
          {team.tasks.map((t) => <button key={t} type="button" className="chip" aria-pressed={task === t} onClick={() => onTask(task === t ? '' : t)}>{t}</button>)}
        </div>
      </Expand>
      <div className="chips" role="group" aria-label="상태">
        {CHIPS.map(([v, l]) => { const n = inTask.filter((p) => match(p, v)).length; return <button key={v} type="button" className="chip" aria-pressed={filter === v} onClick={() => onFilter(v)}>{l} <span className="chip-n">{n}</span></button>; })}
      </div>

      <div className="card list" ref={listRef}>
        {list.length ? list.map((p) => <PostItem key={p.id} post={p} hit={searching ? hits.get(p.id) : undefined} likes={likeCount.get(p.id) ?? 0} saved={bookmarks.has(p.id)} />) : (
          <div className="empty">
            {searching ? <>찾는 코드가 없어요<br /><span className="muted small">다른 낱말로 찾거나 칩을 '전체'로 바꿔 보세요</span></> : filter === 'saved' ? <>저장한 코드가 없어요<br /><span className="muted small">글 상세에서 저장을 누르면 여기 모여요</span></> : posts.length ? '해당하는 코드가 없어요' : <>올라온 코드가 없어요<br /><a href={href({ name: 'new' })}>코드 올리기</a>{profiles.length < 2 && <> · <a href={href({ name: 'team' })}>팀원 초대하기</a></>}</>}
          </div>
        )}
      </div>
    </section>
  );
}

function PostItem({ post, hit, likes, saved }: { post: Post; hit?: SearchHit; likes: number; saved: boolean }) {
  const { comments, person } = useStore();
  const files = filesOf(post);
  const probs = files.flatMap((f) => checkCode(f.code, f.lang));
  const e = probs.filter((x) => x.sev === 'e').length, w = probs.length - e;
  const n = comments.filter((c) => c.post_id === post.id).length;
  const author = person(post.author_id);
  return (
    <a className="item" data-flip={post.id} href={href({ name: 'post', id: post.id })}>
      <Avatar person={author} size="lg" />
      <span className="body">
        <span className="t">{saved && <Icon name="bookmarkOn" className="t-saved" />}{post.title}</span>
        <span className="m">{author.name} · <span className="m-file"><LangIcon lang={post.lang} size={15} />{post.file_name}</span>{files.length > 1 ? ` 외 ${files.length - 1}개` : ''} · {timeAgo(post.created_at)}</span>
        {hit?.where === 'code' && (
          <span className="hit"><span className="hit-at">{hit.file}:{hit.line}</span><code>{hit.text}</code></span>
        )}
        {hit?.where === 'ask' && <span className="hit"><span className="hit-at">설명</span><span className="hit-txt">{hit.text}</span></span>}
        <span className="cnt">{e > 0 && <span className="e">오류 {e}</span>}{w > 0 && <span className="w">경고 {w}</span>}<span>{isShare(post) ? '의견' : '리뷰'} {n}</span>{likes > 0 && <span className="likes"><Icon name="thumbOn" />{likes}</span>}{post.version > 1 && <span>v{post.version}</span>}</span>
      </span>
      {isShare(post) ? <span className="st share">공유</span> : <span className={`st ${post.status}`}>{STATUS_LABEL[post.status]}</span>}
    </a>
  );
}
