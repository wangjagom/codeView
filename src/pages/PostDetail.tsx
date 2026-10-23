import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, StatusPill } from '../components/Avatar';
import { CodeView } from '../components/CodeView';
import { addLineComment, applySuggestion, deletePost, friendlyError, getPost, setResolved, setStatus } from '../lib/api';
import { checkCode } from '../lib/checks';
import { FENCE } from '../lib/config';
import { href, navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { STATUS_LABEL, type Post, type Status, type Suggestion, type Thread, type Version } from '../lib/types';
import { copyText, timeAgo } from '../lib/util';

export function PostDetail({ id }: { id: string }) {
  const { me, person, tick, refresh, toast } = useStore();
  const [data, setData] = useState<{ post: Post; threads: Thread[]; versions: Version[] } | null>(null);
  const [error, setError] = useState('');
  const [viewVersion, setViewVersion] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    try { setData(await getPost(id)); setError(''); }
    catch (e) { setError(friendlyError(e)); }
  }, [id]);
  useEffect(() => { load(); }, [load, tick]);
  useEffect(() => { setViewVersion(null); setConfirmDelete(false); }, [id]);

  const post = data?.post;
  const shownCode = viewVersion && data ? data.versions.find((v) => v.version === viewVersion)?.code ?? post?.code ?? '' : post?.code ?? '';
  const problems = useMemo(() => (post ? checkCode(shownCode, post.lang) : []), [shownCode, post]);

  if (error) return <section><a className="back" href={href({ name: 'feed' })}>← 목록으로</a><div className="empty">{error}</div></section>;
  if (!data || !post) return <section><div className="empty">불러오는 중…</div></section>;

  const author = person(post.author_id);
  const isAuthor = post.author_id === me.id;
  const e = problems.filter((p) => p.sev === 'e').length, w = problems.length - e;
  const reviewCount = data.threads.reduce((n, t) => n + t.comments.length, 0);
  const readOnly = viewVersion !== null && viewVersion !== post.version;

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try { await fn(); await Promise.all([load(), refresh()]); if (ok) toast(ok); return true; }
    catch (err) { toast(friendlyError(err)); return false; }
  };
  const onComment = (line: number, body: string, s: Suggestion | null, threadId?: string) =>
    run(() => addLineComment(post.id, line, body, s, threadId), '리뷰를 남겼어요');
  const onResolve = (tid: string, r: boolean) => { run(() => setResolved(tid, r), r ? '대화를 해결로 표시했어요' : '대화를 다시 열었어요'); };
  const onApply = (cid: string) => { run(() => applySuggestion(cid), '제안을 적용했어요'); };
  const onStatus = (s: Status) => { run(() => setStatus(post.id, s), `'${STATUS_LABEL[s]}'(으)로 바꿨어요`); };

  const copyCode = async () => toast((await copyText(shownCode)) ? '코드를 복사했어요' : '복사가 막혀 있어요. 코드를 직접 선택해 복사해 주세요');
  const copyDiscord = async () => {
    const link = location.href.split('#')[0] + href({ name: 'post', id: post.id });
    const summary = `${e || w ? `오류 ${e} · 경고 ${w} · ` : ''}리뷰 ${reviewCount}`;
    const text = `**${post.title}** (${post.file_name} · v${post.version})\n\`\`\`${FENCE[post.lang] ?? ''}\n${shownCode}\n\`\`\`\n${summary}\n${link}`;
    toast((await copyText(text)) ? '디스코드에 붙여넣을 내용을 복사했어요' : '복사가 막혀 있어요');
  };

  return (
    <section>
      <a className="back" href={href({ name: 'feed' })}>← 목록으로</a>
      <div className="d-head">
        <div className="d-row"><h1>{post.title}</h1><StatusPill status={post.status} /></div>
        <div className="d-by">
          <Avatar person={author} size="xs" /><b>{author.name}</b><span>{timeAgo(post.created_at)}</span>
          <span className="file">{post.file_name}</span><span>{post.lang}</span><span className="pill task">{post.task}</span>
        </div>
        {post.ask && <div className="ask"><Avatar person={author} /><div><b>받고 싶은 피드백</b><span className="body">{post.ask}</span></div></div>}
      </div>
      <div className="d-bar">
        {e > 0 && <span className="pill e">오류 {e}</span>}
        {w > 0 && <span className="pill w">경고 {w}</span>}
        {!e && !w && <span className="pill okp">자동 검사 통과</span>}
        <span className="pill cmc">리뷰 {reviewCount}</span>
        {post.reviewer_ids.length > 0 && <span className="revs">리뷰어 {post.reviewer_ids.map((rid) => <Avatar key={rid} person={person(rid)} size="xs" />)}</span>}
        <span className="sp" />
        {isAuthor ? (
          <span className="seg" role="group" aria-label="상태 바꾸기">
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <button key={s} type="button" aria-pressed={post.status === s} onClick={() => onStatus(s)}>{STATUS_LABEL[s]}</button>)}
          </span>
        ) : <span className="muted small">상태는 {author.name}님이 바꿔요</span>}
      </div>

      <div className="d-grid">
        <div className="code">
          <div className="code-bar">
            {readOnly ? <span><b>v{viewVersion}</b>을 보고 있어요 · 지난 버전에는 리뷰를 달 수 없어요</span>
              : <span>줄 번호 왼쪽의 <b>+</b>를 눌러 그 줄에 리뷰를 남겨요</span>}
            <span className="sp" />
            <button type="button" className="btn sm" onClick={copyCode}>코드 복사</button>
            <button type="button" className="btn sm" onClick={copyDiscord}>디스코드용 복사</button>
          </div>
          <CodeView code={shownCode} lang={post.lang} problems={problems} threads={readOnly ? [] : data.threads} person={person}
            isAuthor={isAuthor} readOnly={readOnly} onComment={onComment} onResolve={onResolve} onApply={onApply} />
          {!readOnly && data.threads.length === 0 && (
            <div className="no-review">{isAuthor ? '아직 리뷰가 없어요. 조원이 리뷰를 남기면 여기에 바로 나타나요.'
              : <>아직 리뷰가 없어요. {problems[0] ? <><a href={`#L${problems[0].line}`} onClick={(ev) => { ev.preventDefault(); document.getElementById(`L${problems[0].line}`)?.scrollIntoView({ block: 'center' }); }}>{problems[0].line}번째 줄</a>부터 봐 주면 좋아요.</> : '첫 리뷰를 남겨 보세요.'}</>}</div>
          )}
        </div>

        <div className="panel">
          <h2>버전 <span>{data.versions.length}개</span></h2>
          <ul className="vers">
            {[...data.versions].reverse().map((v) => {
              const current = v.version === post.version;
              const active = (viewVersion ?? post.version) === v.version;
              return (
                <li key={v.version} className={active ? 'cur' : ''}>
                  <button type="button" onClick={() => setViewVersion(current ? null : v.version)}>
                    <span className="vd" />
                    <span>v{v.version} · {v.note}{current ? ' (지금)' : ''}<small>{person(v.created_by).name} · {timeAgo(v.created_at)}</small></span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {isAuthor && (
          <div className="danger">
            {confirmDelete ? (
              <><span>이 코드와 리뷰를 모두 지울까요? 되돌릴 수 없어요.</span><button type="button" className="btn sm" onClick={() => setConfirmDelete(false)}>취소</button>
                <button type="button" className="btn sm danger-btn" onClick={async () => { try { await deletePost(post.id); await refresh(); toast('삭제했어요'); navigate({ name: 'feed' }); } catch (err) { toast(friendlyError(err)); } }}>삭제</button></>
            ) : <button type="button" className="btn ghost sm" onClick={() => setConfirmDelete(true)}>이 글 삭제</button>}
          </div>
        )}
      </div>
    </section>
  );
}
