import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Expand, useFlip } from '../components/Motion';
import { Header, type Filter } from '../components/Layout';
import { checkCode } from '../lib/checks';
import { href } from '../lib/router';
import { isMyTurn, useStore } from '../lib/store';
import { STATUS_LABEL, isShare, type Post } from '../lib/types';
import { timeAgo } from '../lib/util';

const CHIPS: [Filter, string][] = [['all', '전체'], ['turn', '내 차례'], ['share', '공유'], ['wait', '리뷰 대기'], ['doing', '피드백 중'], ['done', '해결됨'], ['mine', '내 코드']];

export function Feed({ filter, task, onFilter, onTask, onTeam }: {
  filter: Filter; task: string; onFilter: (f: Filter) => void; onTask: (t: string) => void; onTeam: () => void;
}) {
  const { me, team, posts, comments, person, profiles } = useStore();
  const [showTasks, setShowTasks] = useState(Boolean(task));
  const listRef = useFlip<HTMLDivElement>();
  const turns = posts.filter((p) => isMyTurn(p, me.id, comments));

  const match = (p: Post, f: Filter) => f === 'all' || (f === 'turn' && isMyTurn(p, me.id, comments)) || (f === 'mine' && p.author_id === me.id)
    || (f === 'share' && isShare(p)) || (!isShare(p) && p.status === f);
  const inTask = posts.filter((p) => !task || p.task === task);
  const list = inTask.filter((p) => match(p, filter));

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

      <div className="sec-h">
        <h2>{task || '코드'}</h2>
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
        {list.length ? list.map((p) => <PostItem key={p.id} post={p} />) : (
          <div className="empty">
            {posts.length ? '해당하는 코드가 없어요' : <>올라온 코드가 없어요<br /><a href={href({ name: 'new' })}>코드 올리기</a>{profiles.length < 2 && <> · <a href={href({ name: 'team' })}>팀원 초대하기</a></>}</>}
          </div>
        )}
      </div>
    </section>
  );
}

function PostItem({ post }: { post: Post }) {
  const { comments, person } = useStore();
  const probs = checkCode(post.code, post.lang);
  const e = probs.filter((x) => x.sev === 'e').length, w = probs.length - e;
  const n = comments.filter((c) => c.post_id === post.id).length;
  const author = person(post.author_id);
  return (
    <a className="item" data-flip={post.id} href={href({ name: 'post', id: post.id })}>
      <Avatar person={author} size="lg" />
      <span className="body">
        <span className="t">{post.title}</span>
        <span className="m">{author.name} · {post.file_name} · {timeAgo(post.created_at)}</span>
        <span className="cnt">{e > 0 && <span className="e">오류 {e}</span>}{w > 0 && <span className="w">경고 {w}</span>}<span>리뷰 {n}</span>{post.version > 1 && <span>v{post.version}</span>}</span>
      </span>
      {isShare(post) ? <span className="st share">공유</span> : <span className={`st ${post.status}`}>{STATUS_LABEL[post.status]}</span>}
    </a>
  );
}
