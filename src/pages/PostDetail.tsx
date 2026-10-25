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
import { STATUS_LABEL, filesOf, isShare, versionFiles, type Post, type Status, type Suggestion, type Thread, type Version } from '../lib/types';
import { timeAgo } from '../lib/util';
import { Loading } from '../components/Motion';
import { RichText } from '../components/RichText';
import { MoreMenu } from '../components/MoreMenu';
import { copyText, readPref, writePref } from '../lib/util';
import { CodeFull } from '../components/CodeFull';
import { discordText, plainText, type ShareInput } from '../lib/share';
import { download, makeZip, safeName } from '../lib/zip';
import { LangIcon } from '../components/LangIcon';

export function PostDetail({ id }: { id: string }) {
  const { me, person, tick, refresh, toast, likes, bookmarks, toggleLike, toggleBookmark } = useStore();
  const [data, setData] = useState<{ post: Post; threads: Thread[]; versions: Version[] } | null>(null);
  const [error, setError] = useState('');
  const [viewVersion, setViewVersion] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fileIdx, setFileIdx] = useState(0);
  // 코드 보기 설정은 이 브라우저에 기억해요.
  const [wrap, setWrap] = useState(() => readPref('cv-wrap') !== '0');
  const [big, setBig] = useState(false);
  const closeBig = useCallback(() => setBig(false), []);
  const toggleWrap = () => { const v = !wrap; setWrap(v); writePref('cv-wrap', v ? null : '0'); };

  const load = useCallback(async () => {
    try { setData(await getPost(id)); setError(''); }
    catch (e) { setError(friendlyError(e)); }
  }, [id]);
  useEffect(() => { load(); }, [load, tick]);
  useEffect(() => { setViewVersion(null); setConfirmDelete(false); setFileIdx(0); }, [id]);

  const post = data?.post;
  // 보고 있는 버전의 파일들과, 그중 지금 연 파일
  const shownFiles = useMemo(() => {
    if (!post || !data) return [];
    const v = viewVersion ? data.versions.find((x) => x.version === viewVersion) : null;
    return v ? versionFiles(v, post) : filesOf(post);
  }, [post, data, viewVersion]);
  const fi = Math.min(fileIdx, Math.max(0, shownFiles.length - 1));
  useEffect(() => { document.querySelector('.file-tabs.view .ftab.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [fi]);
  const curFile = shownFiles[fi] ?? { name: post?.file_name ?? '', lang: post?.lang ?? 'JavaScript', code: post?.code ?? '' };
  const shownCode = curFile.code;
  const allProblems = useMemo(() => shownFiles.map((f) => checkCode(f.code, f.lang)), [shownFiles]);
  const problems = allProblems[fi] ?? [];
  useEffect(() => { setBig(false); }, [id]);

  if (error) return <section><BackBar /><div className="empty">{error}</div></section>;
  if (!data || !post) return <section><div className="empty"><Loading /></div></section>;

  const author = person(post.author_id);
  const isAuthor = post.author_id === me.id;
  const e = problems.filter((p) => p.sev === 'e').length, w = problems.length - e;
  const reviewCount = data.threads.reduce((n, t) => n + t.comments.length, 0);
  const readOnly = viewVersion !== null && viewVersion !== post.version;

  const codeView = (fontPx?: number) => (
    <CodeView key={`${fi}-${viewVersion ?? 'now'}`} code={shownCode} lang={curFile.lang} problems={problems} threads={readOnly ? [] : data.threads.filter((t) => (t.file ?? 0) === fi)} person={person}
      isAuthor={isAuthor} readOnly={readOnly} onComment={onComment} onResolve={onResolve} onApply={onApply} meId={me.id} onEdit={onEdit} onDelete={onDelete}
      wrap={wrap} fontPx={fontPx} />
  );

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try { await fn(); await Promise.all([load(), refresh()]); if (ok) toast(ok); return true; }
    catch (err) { toast(friendlyError(err)); return false; }
  };
  const share = isShare(post);
  const likeN = likes.filter((l) => l.post_id === post.id).length;
  const liked = likes.some((l) => l.post_id === post.id && l.user_id === me.id);
  const saved = bookmarks.has(post.id);
  const onComment = (line: number, body: string, s: Suggestion | null, threadId?: string) =>
    run(() => addLineComment(post.id, line, body, s, threadId, fi), share ? '의견을 남겼어요' : '리뷰를 남겼어요');
  const onResolve = (tid: string, r: boolean) => { run(() => setResolved(tid, r), r ? '대화를 해결로 표시했어요' : '대화를 다시 열었어요'); };
  const onApply = (cid: string) => { run(() => applySuggestion(cid), '제안을 적용했어요'); };
  const onEdit = (cid: string, body: string) => run(() => updateComment(cid, body), '리뷰를 고쳤어요');
  const onDelete = (cid: string) => run(() => deleteComment(cid), '리뷰를 지웠어요');
  const onStatus = (s: Status) => { run(() => setStatus(post.id, s), `'${STATUS_LABEL[s]}'(으)로 바꿨어요`); };

  const postLink = () => location.href.split('#')[0] + href({ name: 'post', id: post.id });
  const shareInput = (): ShareInput => ({
    title: post.title, share, status: share ? undefined : STATUS_LABEL[post.status], author: author.name,
    file: curFile.name, lang: langLabel(curFile.lang), fence: fenceOf(curFile.lang), version: post.version, code: shownCode, ask: post.ask,
    errors: e, warnings: w, reviews: reviewCount, otherFiles: shownFiles.filter((_, i) => i !== fi).map((f) => f.name), link: postLink(),
  });
  const copyChat = async (text: string, where: string) =>
    toast((await copyText(text)) ? `${where}에 붙여 넣으면 돼요` : '복사가 막혀 있어요. 코드를 길게 눌러 직접 복사해 주세요');
  const fileName = safeName(curFile.name, 'code.txt');
  const saveFile = () => download(fileName, shownCode, 'text/plain;charset=utf-8');
  const saveZip = () => {
    const readme = [
      `# ${post.title}`, '',
      `- 작성: ${author.name} · ${post.created_at.slice(0, 10)}`,
      `- 과제: ${post.task}`, `- 버전: v${viewVersion ?? post.version}`, `- 링크: ${postLink()}`,
      '', '## 파일', '', ...shownFiles.map((f) => `- \`${f.name}\` (${langLabel(f.lang)})`),
      ...(post.ask ? ['', share ? '## 설명' : '## 요청 사항', '', post.ask] : []), '',
    ].join('\n');
    const entries = shownFiles.map((f) => ({ name: safeName(f.name, 'code.txt'), text: f.code.endsWith('\n') ? f.code : `${f.code}\n` }));
    if (!entries.some((x) => x.name.toLowerCase() === 'readme.md')) entries.push({ name: 'README.md', text: readme });
    download(`${safeName(post.title, 'codeview')}.zip`, makeZip(entries), 'application/zip');
  };

  return (
    <section>
      <BackBar />
      <div className="meta-row"><Avatar person={author} size="xs" /><b>{author.name}</b><span className="dot" />{timeAgo(post.created_at)}<span className="dot" />{post.task}</div>
      <h1 className="h-big tight">{post.title}</h1>
      <div className="post-acts">
        <button type="button" className={`pill-btn ${liked ? 'on' : ''}`} aria-pressed={liked} onClick={() => toggleLike(post.id)}>
          <Icon name={liked ? 'thumbOn' : 'thumb'} />도움됐어요{likeN > 0 && <b>{likeN}</b>}
        </button>
        <button type="button" className={`pill-btn ${saved ? 'on' : ''}`} aria-pressed={saved} onClick={() => toggleBookmark(post.id)}>
          <Icon name={saved ? 'bookmarkOn' : 'bookmark'} />{saved ? '저장됨' : '저장'}
        </button>
        {isAuthor && <a className="pill-btn" href={href({ name: 'edit', id: post.id })}><Icon name="edit" />수정</a>}
      </div>
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
          {shownFiles.length > 1 && (
            <div className="file-tabs view" role="tablist" aria-label={`파일 ${shownFiles.length}개`}>
              {shownFiles.map((f, i) => {
                const ps = allProblems[i] ?? [];
                const pe = ps.filter((p) => p.sev === 'e').length;
                const n = readOnly ? 0 : data.threads.filter((t) => (t.file ?? 0) === i).reduce((k, t) => k + t.comments.length, 0);
                return (
                  <span key={f.name} className={`ftab ${i === fi ? 'on' : ''}`}>
                    <button type="button" role="tab" aria-selected={i === fi} className="ftab-name" onClick={() => setFileIdx(i)}>
                      <LangIcon lang={f.lang} size={16} />{f.name}
                      {pe > 0 ? <i className="ftab-dot e" aria-label={`오류 ${pe}`} /> : ps.length > 0 ? <i className="ftab-dot w" aria-label={`경고 ${ps.length}`} /> : null}
                      {n > 0 && <span className="ftab-n" aria-label={`리뷰 ${n}개`}>{n}</span>}
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <div className="code-h">
            <span className="file"><LangIcon lang={curFile.lang} size={20} />{curFile.name}</span><span className="muted small">{langLabel(curFile.lang)}{shownFiles.length > 1 ? ` · ${fi + 1}/${shownFiles.length}` : ''}</span>
            {e > 0 && <span className="pill e">오류 {e}</span>}
            {w > 0 && <span className="pill w">경고 {w}</span>}
            {!e && !w && <span className="pill ok">검사 통과</span>}
          </div>
          <div className="code-tools" role="group" aria-label="복사">
            <CopyButton text={() => shownCode} label="코드 복사" onFail={toast} />
            <CopyButton text={postLink} label="링크 복사" icon="link" onFail={toast} />
            <MoreMenu items={[
              { label: '크게 보기', icon: 'expand', hint: '코드만 화면 가득', onSelect: () => setBig(true) },
              { label: wrap ? '줄바꿈 끄기' : '줄바꿈 켜기', icon: 'wrap', hint: wrap ? '긴 줄을 옆으로 밀어서 봐요' : '긴 줄을 화면 폭에 맞춰 꺾어요', onSelect: toggleWrap },
              { label: '디스코드용 복사', icon: 'chat', hint: '코드 블록 + 링크 (앞 15줄)', onSelect: () => copyChat(discordText(shareInput()), '디스코드') },
              { label: '카톡·메신저용 복사', icon: 'chat', hint: '글자만 · 짧게 (앞 8줄)', onSelect: () => copyChat(plainText(shareInput()), '카톡·메신저') },
              { label: '파일 저장', icon: 'download', hint: fileName, onSelect: saveFile },
              { label: shownFiles.length > 1 ? `zip 저장 (${shownFiles.length}개)` : 'zip 저장', icon: 'zip', hint: '모든 파일 + README.md', onSelect: saveZip },
            ]} />
          </div>
          <p className="code-hint">{readOnly ? <><b>v{viewVersion}</b> 보는 중 · 지난 버전에는 리뷰를 달 수 없어요</> : <>줄을 누르고 왼쪽 <b className="hint-plus">+</b> 로 {share ? '질문·의견을' : '리뷰를'} 남겨요</>}</p>
          {big ? <div className="code-away muted small">크게 보기로 보는 중이에요</div> : codeView()}
          {!readOnly && !data.threads.some((t) => (t.file ?? 0) === fi) && (
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
      {big && (
        <CodeFull name={curFile.name} lang={curFile.lang} index={fi} total={shownFiles.length} wrap={wrap} onWrap={toggleWrap}
          onFile={setFileIdx} onClose={closeBig}>
          {(fs) => codeView(fs)}
        </CodeFull>
      )}
    </section>
  );
}
