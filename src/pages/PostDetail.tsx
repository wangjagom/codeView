import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, StatusPill } from '../components/Avatar';
import { CopyButton } from '../components/CopyButton';
import { Icon } from '../components/Icon';
import { BackBar } from '../components/Layout';
import { CodeView } from '../components/CodeView';
import { addLineComment, applySuggestion, deleteComment, deletePost, friendlyError, getPost, setResolved, setStatus, updateComment } from '../lib/api';
import { checkCode } from '../lib/checks';
import { fenceOf, langLabel } from '../lib/langs';
import { href, navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { STATUS_LABEL, isShare, type Post, type Status, type Suggestion, type Thread, type Version } from '../lib/types';
import { timeAgo } from '../lib/util';
import { Loading } from '../components/Motion';
import { RichText } from '../components/RichText';
import { download, makeZip, safeName } from '../lib/zip';

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

  if (error) return <section><BackBar /><div className="empty">{error}</div></section>;
  if (!data || !post) return <section><div className="empty"><Loading /></div></section>;

  const author = person(post.author_id);
  const isAuthor = post.author_id === me.id;
  const e = problems.filter((p) => p.sev === 'e').length, w = problems.length - e;
  const reviewCount = data.threads.reduce((n, t) => n + t.comments.length, 0);
  const readOnly = viewVersion !== null && viewVersion !== post.version;

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try { await fn(); await Promise.all([load(), refresh()]); if (ok) toast(ok); return true; }
    catch (err) { toast(friendlyError(err)); return false; }
  };
  const share = isShare(post);
  const onComment = (line: number, body: string, s: Suggestion | null, threadId?: string) =>
    run(() => addLineComment(post.id, line, body, s, threadId), share ? '의견을 남겼어요' : '리뷰를 남겼어요');
  const onResolve = (tid: string, r: boolean) => { run(() => setResolved(tid, r), r ? '대화를 해결로 표시했어요' : '대화를 다시 열었어요'); };
  const onApply = (cid: string) => { run(() => applySuggestion(cid), '제안을 적용했어요'); };
  const onEdit = (cid: string, body: string) => run(() => updateComment(cid, body), '리뷰를 고쳤어요');
  const onDelete = (cid: string) => run(() => deleteComment(cid), '리뷰를 지웠어요');
  const onStatus = (s: Status) => { run(() => setStatus(post.id, s), `'${STATUS_LABEL[s]}'(으)로 바꿨어요`); };

  const postLink = () => location.href.split('#')[0] + href({ name: 'post', id: post.id });
  const chatText = () => {
    const summary = share ? (post.ask ? `${post.ask}\n` : '') + `질문·의견 ${reviewCount}` : `${e || w ? `오류 ${e} · 경고 ${w} · ` : ''}리뷰 ${reviewCount}`;
    return `**${share ? '[공유] ' : ''}${post.title}** (${post.file_name} · v${post.version})\n\`\`\`${fenceOf(post.lang)}\n${shownCode}\n\`\`\`\n${summary}\n${postLink()}`;
  };
  const fileName = safeName(post.file_name, 'code.txt');
  const saveFile = () => download(fileName, shownCode, 'text/plain;charset=utf-8');
  const saveZip = () => {
    const readme = [
      `# ${post.title}`, '',
      `- 작성: ${author.name} · ${post.created_at.slice(0, 10)}`,
      `- 과제: ${post.task}`, `- 언어: ${langLabel(post.lang)}`, `- 버전: v${viewVersion ?? post.version}`, `- 링크: ${postLink()}`,
      ...(post.ask ? ['', share ? '## 설명' : '## 요청 사항', '', post.ask] : []), '',
    ].join('\n');
    download(`${safeName(post.title, 'codeview')}.zip`, makeZip([{ name: fileName, text: shownCode.endsWith('\n') ? shownCode : `${shownCode}\n` }, { name: 'README.md', text: readme }]), 'application/zip');
  };

  return (
    <section>
      <BackBar />
      <div className="meta-row"><Avatar person={author} size="xs" /><b>{author.name}</b><span className="dot" />{timeAgo(post.created_at)}<span className="dot" />{post.task}</div>
      <h1 className="h-big tight">{post.title}</h1>
      {post.ask && <div className="ask"><span className="lbl">{share ? '설명' : '요청 사항'}</span><span className="body cm-text"><RichText text={post.ask} lang={post.lang} /></span></div>}
      {share ? (
        <div className="card status-card"><div className="status-row"><span className="st share">코드 공유</span><span className="sp" /><span className="muted small">질문·의견 {reviewCount}</span></div></div>
      ) : <div className="card status-card">
        <div className="status-row">
          <StatusPill status={post.status} />
          {post.reviewer_ids.length > 0 && <span className="revs">리뷰어 {post.reviewer_ids.map((rid) => <Avatar key={rid} person={person(rid)} size="xs" />)}</span>}
          <span className="sp" />
          <span className="muted small">리뷰 {reviewCount}</span>
        </div>
        {isAuthor ? (
          <div className="seg seg3" role="group" aria-label="상태 바꾸기">
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <button key={s} type="button" aria-pressed={post.status === s} onClick={() => onStatus(s)}>{STATUS_LABEL[s]}</button>)}
          </div>
        ) : null}
      </div>}

      <div className="d-grid">
        <div className="code">
          <div className="code-h">
            <span className="file">{post.file_name}</span><span className="muted small">{langLabel(post.lang)}</span>
            {e > 0 && <span className="pill e">오류 {e}</span>}
            {w > 0 && <span className="pill w">경고 {w}</span>}
            {!e && !w && <span className="pill ok">검사 통과</span>}
          </div>
          <div className="code-tools" role="group" aria-label="복사">
            <CopyButton text={() => shownCode} label="코드 복사" onFail={toast} />
            <CopyButton text={chatText} label="채팅용 복사" icon="chat" onFail={toast} />
            <CopyButton text={postLink} label="링크 복사" icon="link" onFail={toast} />
            <button type="button" className="act-btn" onClick={saveFile} title={`${fileName}로 저장`}><Icon name="download" />파일 저장</button>
            <button type="button" className="act-btn" onClick={saveZip} title="코드와 설명(README.md)을 zip으로"><Icon name="zip" />zip 저장</button>
          </div>
          <p className="code-hint">{readOnly ? <><b>v{viewVersion}</b> 보는 중 · 지난 버전에는 리뷰를 달 수 없어요</> : <>{share ? '줄 번호를 눌러 질문·의견을 남겨요' : '줄 번호를 눌러 리뷰를 남겨요'}</>}</p>
          <CodeView code={shownCode} lang={post.lang} problems={problems} threads={readOnly ? [] : data.threads} person={person}
            isAuthor={isAuthor} readOnly={readOnly} onComment={onComment} onResolve={onResolve} onApply={onApply} meId={me.id} onEdit={onEdit} onDelete={onDelete} />
          {!readOnly && data.threads.length === 0 && (
            <div className="no-review">{share ? '질문·의견 없음' : isAuthor || !problems[0] ? '리뷰 없음'
              : <>리뷰 없음 · 검사 결과: <a href={`#L${problems[0].line}`} onClick={(ev) => { ev.preventDefault(); document.getElementById(`L${problems[0].line}`)?.scrollIntoView({ block: 'center' }); }}>{problems[0].line}번째 줄</a></>}</div>
          )}
        </div>

        <div>
          <div className="sec-h"><h2>버전</h2><span className="muted small">{data.versions.length}개</span></div>
          <div className="card list">
            {[...data.versions].reverse().map((v) => {
              const current = v.version === post.version;
              const active = (viewVersion ?? post.version) === v.version;
              return (
                <button key={v.version} type="button" className={`item ${active ? 'active' : ''}`} onClick={() => setViewVersion(current ? null : v.version)}>
                  <span className="body"><span className="t">v{v.version} · {v.note}</span><span className="m">{person(v.created_by).name} · {timeAgo(v.created_at)}</span></span>
                  {current ? <span className="pill n">지금</span> : active ? <span className="pill ok">보는 중</span> : <Icon name="chev" className="chev" />}
                </button>
              );
            })}
          </div>
        </div>

        {isAuthor && (
          <div className="danger">
            {confirmDelete ? (
              <><span>이 코드와 리뷰를 모두 지울까요? 되돌릴 수 없어요.</span><button type="button" className="btn sm" onClick={() => setConfirmDelete(false)}>취소</button>
                <button type="button" className="btn sm danger-btn" onClick={async () => { try { await deletePost(post.id); await refresh(); toast('삭제했어요'); navigate({ name: 'feed' }); } catch (err) { toast(friendlyError(err)); } }}>삭제</button></>
            ) : <button type="button" className="txt-btn red with-ic" onClick={() => setConfirmDelete(true)}><Icon name="trash" />이 글 삭제</button>}
          </div>
        )}
      </div>
    </section>
  );
}
