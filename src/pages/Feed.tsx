import { useMemo, useState } from 'react';
import { searchPosts, type SearchHit } from '../lib/search';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Expand, useFlip } from '../components/Motion';
import { Header, type Filter, type Kind, type StatusFilter, type View } from '../components/Layout';
import { matchFilter, matchKind, matchStatus } from '../lib/feed';
import { checkCode } from '../lib/checks';
import { href } from '../lib/router';
import { isMyTurn, useStore } from '../lib/store';
import { STATUS_LABEL, filesOf, isShare, type Post } from '../lib/types';
import { timeAgo } from '../lib/util';
import { LangIcon } from '../components/LangIcon';
import { Picker } from '../components/Picker';

const KINDS: [Kind, string][] = [['all', '전체'], ['review', '리뷰 요청'], ['share', '코드 공유']];
const STATUSES: [StatusFilter, string][] = [['all', '전체'], ['wait', '대기'], ['doing', '피드백 중'], ['done', '해결됨']];
const VIEW_LABEL: Record<View, string> = { turn: '내 리뷰 차례', saved: '저장한 코드', mine: '내가 올린 코드' };

export function Feed({ filter, task, onFilter, onTask, onTeam }: {
  filter: Filter; task: string; onFilter: (f: Filter) => void; onTask: (t: string) => void; onTeam: () => void;
}) {
  const { me, team, posts, comments, person, profiles, likes, bookmarks } = useStore();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'new' | 'liked'>('new');
  const hits = useMemo(() => searchPosts(posts, query, (id) => person(id).name), [posts, query, person]);
  const likeCount = useMemo(() => { const m = new Map<string, number>(); for (const l of likes) m.set(l.post_id, (m.get(l.post_id) ?? 0) + 1); return m; }, [likes]);
  const listRef = useFlip<HTMLDivElement>();
  const ctx = { meId: me.id, comments, bookmarks };
  const turns = posts.filter((p) => isMyTurn(p, me.id, comments));

  const searching = query.trim().length > 0;
  const taskBase = posts.filter((p) => (!searching || hits.has(p.id)) && matchFilter(p, filter, ctx));
  const inTask = posts.filter((p) => (!task || p.task === task) && (!searching || hits.has(p.id)));
  const list = inTask.filter((p) => matchFilter(p, filter, ctx));
  if (sort === 'liked') list.sort((a, b) => (likeCount.get(b.id) ?? 0) - (likeCount.get(a.id) ?? 0) || b.created_at.localeCompare(a.created_at));
  const reviews = inTask.filter((p) => !isShare(p));
  const unit = filter.view ? '' : filter.kind === 'review' ? '리뷰 요청 ' : filter.kind === 'share' ? '공유 ' : '코드 ';

  return (
    <section>
      <Header onTeam={onTeam} />
      {turns.length > 0 && !filter.view && (
        <section className="turn-card" aria-label="내 리뷰 차례">
          <div className="turn-h">
            <span className="lab">내 리뷰 차례 {turns.length}</span>
            {turns.length > 1 && <button type="button" onClick={() => onFilter({ ...filter, view: 'turn' })}>모두 보기<Icon name="chev" /></button>}
          </div>
          {turns.slice(0, 1).map((p) => (
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

      {filter.view ? (
        <div className="view-bar">
          <b>{VIEW_LABEL[filter.view]}</b>
          <button type="button" className="chip sm" onClick={() => onFilter({ ...filter, view: undefined })}>전체 글로<Icon name="close" /></button>
        </div>
      ) : (
        <>
          <div className="seg seg3 feed-tabs" role="tablist" aria-label="글 종류">
            {KINDS.map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={filter.kind === k} aria-pressed={filter.kind === k} onClick={() => onFilter({ kind: k, status: 'all' })}>
                {l} <span className="chip-n">{inTask.filter((p) => matchKind(p, k)).length}</span>
              </button>
            ))}
          </div>
          <Expand open={filter.kind === 'review'}>
            <div className="chips st-chips" role="group" aria-label="리뷰 상태">
              {STATUSES.map(([v, l]) => (
                <button key={v} type="button" className={`chip sm st-${v}`} aria-pressed={filter.status === v} onClick={() => onFilter({ ...filter, status: v })}>
                  {l} <span className="chip-n">{reviews.filter((p) => matchStatus(p, v)).length}</span>
                </button>
              ))}
            </div>
          </Expand>
        </>
      )}

      <div className="list-bar">
        <span className="lb-n muted small">{searching ? `'${query.trim()}' 검색 ` : unit}{list.length}개</span>
        {team.tasks.length > 0 && (
          <Picker label="과제" title="과제" className="pk-task" value={task} onChange={onTask}
            options={[{ value: '', label: '과제 전체', count: taskBase.length }, ...team.tasks.map((t) => ({ value: t, label: t, count: taskBase.filter((p) => p.task === t).length }))]} />
        )}
        <Picker label="정렬" value={sort} onChange={setSort}
          options={[{ value: 'new', label: '최신순', hint: '새로 올라온 글부터' }, { value: 'liked', label: '도움순', hint: '도움됐어요가 많은 글부터' }]} />
      </div>

      <div className="card list" ref={listRef}>
        {list.length ? list.map((p) => <PostItem key={p.id} post={p} hit={searching ? hits.get(p.id) : undefined} likes={likeCount.get(p.id) ?? 0} saved={bookmarks.has(p.id)} />) : (
          <div className="empty">
            {searching ? <>찾는 코드가 없어요<br /><span className="muted small">다른 낱말로 찾거나 과제를 '과제 전체'로 바꿔 보세요</span></>
              : filter.view === 'saved' ? <>저장한 코드가 없어요<br /><span className="muted small">글 상세에서 저장을 누르면 여기 모여요</span></>
              : filter.view === 'turn' ? '지금 리뷰할 코드가 없어요'
              : posts.length ? '해당하는 코드가 없어요'
              : <>올라온 코드가 없어요<br /><a href={href({ name: 'new' })}>코드 올리기</a>{profiles.length < 2 && <> · <a href={href({ name: 'team' })}>팀원 초대하기</a></>}</>}
          </div>
        )}
      </div>
    </section>
  );
}

/** 코드 목록 한 줄 (홈, 내 정보의 저장한 코드에서 써요) */
export function PostItem({ post, hit, likes, saved }: { post: Post; hit?: SearchHit; likes: number; saved: boolean }) {
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
