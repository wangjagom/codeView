import { useState } from 'react';
import { Avatar, StatusPill } from '../components/Avatar';
import type { Filter } from '../components/Layout';
import { checkCode } from '../lib/checks';
import { href } from '../lib/router';
import { isMyTurn, useStore } from '../lib/store';
import type { Post, Status } from '../lib/types';
import { timeAgo } from '../lib/util';

const TITLES: Record<Filter, string> = { all: '전체 리뷰', turn: '내 리뷰 차례', mine: '내가 올린 코드', done: '해결됨' };

export function Feed({ filter, task }: { filter: Filter; task: string }) {
  const { me, team, posts, comments, person, profiles } = useStore();
  const [status, setStatus] = useState<Status | ''>('');
  const turns = posts.filter((p) => isMyTurn(p, me.id, comments));

  const list = posts.filter((p) =>
    (filter === 'all' || (filter === 'turn' && isMyTurn(p, me.id, comments)) || (filter === 'mine' && p.author_id === me.id) || (filter === 'done' && p.status === 'done'))
    && (!status || p.status === status) && (!task || p.task === task));

  return (
    <section>
      <div className="head">
        <div><h1>{TITLES[filter]}{task ? ` · ${task}` : ''}</h1><p>{team.name}에서 올린 코드와 피드백이 모여요.</p></div>
      </div>
      {turns.length > 0 && filter !== 'turn' && (
        <div className="turn">
          <Avatar person={person(turns[0].author_id)} />
          <span><b>{person(turns[0].author_id).name}</b>님이 리뷰를 기다리고 있어요 · {turns[0].title}{turns.length > 1 ? ` 외 ${turns.length - 1}개` : ''}</span>
          <span className="sp" />
          <a className="btn primary sm" href={href({ name: 'post', id: turns[0].id })}>리뷰하러 가기</a>
        </div>
      )}
      <div className="filters">
        {([['', '모든 상태'], ['wait', '리뷰 대기'], ['doing', '피드백 중'], ['done', '해결됨']] as const).map(([v, label]) => (
          <button key={v} type="button" className="chip" aria-pressed={status === v} onClick={() => setStatus(v)}>{label}</button>
        ))}
      </div>
      <div className="feed">
        {list.length ? list.map((p) => <PostCard key={p.id} post={p} turn={isMyTurn(p, me.id, comments)} />)
          : <div className="empty">{posts.length ? '여기에 해당하는 코드가 없어요.' : <>아직 올라온 코드가 없어요. <a href={href({ name: 'new' })}>첫 코드를 올려 보세요</a>.{profiles.length < 2 && <> 조원들에게 <a href={href({ name: 'team' })}>초대 링크</a>도 보내 보세요.</>}</>}</div>}
      </div>
    </section>
  );
}

function PostCard({ post, turn }: { post: Post; turn: boolean }) {
  const { comments, person } = useStore();
  const probs = checkCode(post.code, post.lang);
  const e = probs.filter((x) => x.sev === 'e').length, w = probs.length - e;
  const n = comments.filter((c) => c.post_id === post.id).length;
  const author = person(post.author_id);
  return (
    <a className={`post ${turn ? 'mine-turn' : ''}`} href={href({ name: 'post', id: post.id })}>
      <Avatar person={author} size="lg" />
      <span className="post-main">
        <span className="post-top"><b>{author.name}</b><span>{timeAgo(post.created_at)}</span><span className="file">{post.file_name}</span></span>
        <span className="post-title">{post.title}</span>
        {post.ask && <span className="post-q">{post.ask}</span>}
        <span className="post-meta">
          <span className="pill task">{post.task}</span>
          {e > 0 && <span className="pill e">오류 {e}</span>}
          {w > 0 && <span className="pill w">경고 {w}</span>}
          <span className="pill cmc">리뷰 {n}</span>
          {post.version > 1 && <span className="pill cmc">v{post.version}</span>}
        </span>
      </span>
      <span className="post-side">
        <StatusPill status={post.status} />
        {post.reviewer_ids.length > 0 && <span className="revs">리뷰어 {post.reviewer_ids.map((id) => <Avatar key={id} person={person(id)} size="xs" />)}</span>}
      </span>
    </a>
  );
}
