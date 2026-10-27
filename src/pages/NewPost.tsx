import { useEffect, useMemo, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { CodeEditor } from '../components/CodeEditor';
import { BackBar } from '../components/Layout';
import { addTeamTask, createPost, friendlyError, updatePostCode, updatePostMeta } from '../lib/api';
import { checkCode } from '../lib/checks';
import { LANGS, langFromCode, langFromFile } from '../lib/langs';
import { href, navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { Dots, Expand, useFlip } from '../components/Motion';
import { TASK_NAME_MAX, normTask, similarTasks, taskProblem } from '../lib/tasks';
import { TEMPLATE_SETS, templateSetFiles } from '../lib/templates';
import { filesOf, type Post, type PostKind, type Thread } from '../lib/types';
import { lineMapper } from '../lib/diff';
import { LangIcon } from '../components/LangIcon';
import { Picker } from '../components/Picker';
import { Runner } from '../components/Runner';
import { Icon } from '../components/Icon';
import { runKind } from '../lib/runner';

const DRAFT_KEY = 'codeview:draft';
const NEW_TASK = '__new_task__';
const MAX_FILES = 10;

/** 올리는 중인 파일 하나. langAuto면 파일 이름·코드를 보고 언어를 골라요. */
interface DraftFile { id: string; name: string; lang: string; code: string; langAuto: boolean; /** 고치기: 원래 글에서 몇 번째 파일이었는지 */ orig?: number }
interface Draft { title: string; task: string; ask: string; kind?: PostKind; files?: DraftFile[]; file?: string; lang?: string; code?: string }

let fileSeq = 0;
const newFile = (lang = 'ABAP', patch: Partial<DraftFile> = {}): DraftFile => ({ id: `f${Date.now().toString(36)}${fileSeq++}`, name: '', lang, code: '', langAuto: true, ...patch });

function loadDraft(): Draft | null {
  try { const s = localStorage.getItem(DRAFT_KEY); return s ? (JSON.parse(s) as Draft) : null; } catch { return null; }
}
function saveDraft(d: Draft | null) {
  try { if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); else localStorage.removeItem(DRAFT_KEY); } catch { /* 저장 못 해도 괜찮아요 */ }
}
/** 예전(파일 하나) 임시 저장도 그대로 불러와요. */
function draftFiles(d: Draft | null): DraftFile[] {
  if (d?.files?.length) return d.files.map((f) => ({ ...f, lang: LANGS.some((l) => l.id === f.lang) ? f.lang : 'ABAP' }));
  return [newFile(d?.lang && LANGS.some((l) => l.id === d.lang) ? d.lang : 'ABAP', { name: d?.file ?? '', code: d?.code ?? '', langAuto: !d?.lang })];
}
const sampleOf = (lang: string) => LANGS.find((l) => l.id === lang)?.sample ?? 'code.txt';

/** 고치기로 열 때 받는 원래 글 */
export interface EditTarget { post: Post; threads: Thread[] }

export function NewPost({ edit }: { edit?: EditTarget } = {}) {
  const { me, team, isOwner, profiles, refresh, reloadTeams, toast } = useStore();
  // 고치기는 임시 저장을 쓰지 않고 원래 글로 시작해요.
  const d: Draft | null = edit
    ? { title: edit.post.title, task: edit.post.task, ask: edit.post.ask, kind: edit.post.kind ?? 'review', files: filesOf(edit.post).map((f, i) => newFile(f.lang, { ...f, langAuto: false, orig: i })) }
    : loadDraft();
  const [title, setTitle] = useState(d?.title ?? '');
  const [task, setTask] = useState(d?.task && team.tasks.includes(d.task) ? d.task : edit ? edit.post.task : team.tasks[0] ?? '자유 질문');
  const [ask, setAsk] = useState(d?.ask ?? '');
  const [running, setRunning] = useState(false);
  const [kind, setKind] = useState<PostKind>(d?.kind === 'share' ? 'share' : 'review');
  const [files, setFiles] = useState<DraftFile[]>(() => draftFiles(d));
  const [active, setActive] = useState(0);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>(edit?.post.reviewer_ids ?? []);
  const [note, setNote] = useState('');
  /** 파일마다 달린 리뷰 수 (고치기에서 파일을 뺄 때 알려 줘요) */
  const reviewsIn = (f: DraftFile) => (edit && f.orig !== undefined ? edit.threads.filter((t) => t.line !== null && (t.file ?? 0) === f.orig).reduce((n, t) => n + t.comments.length, 0) : 0);
  const [busy, setBusy] = useState(false);
  const [newTask, setNewTask] = useState<string | null>(null);
  const [addingTask, setAddingTask] = useState(false);
  const tabsRef = useFlip<HTMLDivElement>();
  // 파일이 많아 탭이 옆으로 넘치면 고른 탭이 보이게 옮겨요.
  useEffect(() => { tabsRef.current?.querySelector('.ftab.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [active, tabsRef]);
  const share = kind === 'share';
  const mates = profiles.filter((p) => p.id !== me.id);
  const cur = files[Math.min(active, files.length - 1)];
  const allProblems = useMemo(() => files.map((f) => checkCode(f.code, f.lang)), [files]);
  const problems = allProblems[Math.min(active, files.length - 1)] ?? [];
  const e = problems.filter((p) => p.sev === 'e').length;
  const similar = newTask ? similarTasks(newTask, team.tasks) : [];

  const persist = (patch: Partial<Draft>) => { if (!edit) saveDraft({ title, task, ask, kind, files, ...patch }); };
  /** 지금 파일 고치기 */
  const patchFile = (patch: Partial<DraftFile>) => {
    const next = files.map((f, i) => (i === active ? { ...f, ...patch } : f));
    setFiles(next); persist({ files: next });
  };
  const setAllFiles = (next: DraftFile[], at = 0) => { setFiles(next); setActive(at); persist({ files: next }); };

  const addFile = () => {
    if (files.length >= MAX_FILES) { toast(`파일은 ${MAX_FILES}개까지 올릴 수 있어요`); return; }
    setAllFiles([...files, newFile(cur.lang)], files.length);
    requestAnimationFrame(() => document.getElementById('nFile')?.focus());
  };
  const removeFile = (i: number) => {
    const f = files[i];
    if ((f.code.trim() || reviewsIn(f) > 0) && confirmRemove !== f.id) { setConfirmRemove(f.id); return; }
    setConfirmRemove(null);
    const next = files.filter((_, j) => j !== i);
    setAllFiles(next.length ? next : [newFile()], Math.max(0, Math.min(active > i ? active - 1 : active, next.length - 1)));
  };
  // '빼기?'를 띄운 뒤 그 버튼 말고 다른 곳을 누르거나 Esc면 취소해요.
  useEffect(() => {
    if (!confirmRemove) return;
    const onDown = (e: PointerEvent) => { if (!(e.target as Element).closest?.(`[data-remove="${confirmRemove}"]`)) setConfirmRemove(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirmRemove(null); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [confirmRemove]);
  const applySet = (setId: string) => {
    const set = templateSetFiles(setId);
    // 비어 있는 파일은 세트로 바꾸고, 코드가 있는 파일은 그대로 앞에 둬요.
    const kept = files.filter((f) => f.code.trim());
    const room = MAX_FILES - kept.length;
    const taken = new Set(kept.map((f) => f.name.trim().toLowerCase()));
    const added = set.filter((f) => !taken.has(f.name.toLowerCase())).slice(0, room).map((f) => newFile(f.lang, { ...f, langAuto: false }));
    setAllFiles([...kept, ...added], kept.length);
    toast(`${TEMPLATE_SETS.find((s) => s.id === setId)?.label} 파일 ${added.length}개를 넣었어요`);
  };

  const pickTask = (t: string) => { setTask(t); persist({ task: t }); setNewTask(null); };
  const addTask = async () => {
    const name = (newTask ?? '').trim();
    const p = taskProblem(name, team.tasks);
    // 이미 있는 과제면 그걸 골라요.
    if (p === '이미 있는 과제예요.') { pickTask(team.tasks.find((t) => normTask(t) === normTask(name))!); return; }
    if (p) { toast(p); document.getElementById('nNewTask')?.focus(); return; }
    setAddingTask(true);
    try {
      const list = await addTeamTask(team.id, name, team.tasks, isOwner);
      await reloadTeams(team.id);
      pickTask(list.find((t) => normTask(t) === normTask(name)) ?? name);
      toast(`'${name}' 과제를 추가했어요`);
    } catch (err) { toast(friendlyError(err)); }
    setAddingTask(false);
  };

  const submit = async () => {
    if (!title.trim()) { toast('제목을 적어 주세요'); document.getElementById('nTitle')?.focus(); return; }
    // 여러 파일이면 비어 있는 파일·겹치는 이름을 먼저 알려 줘요.
    const ready = files.map((f) => ({ name: f.name.trim() || sampleOf(f.lang), lang: f.lang, code: f.code.replace(/\s+$/, '') }));
    const empty = ready.findIndex((f) => !f.code.trim());
    if (empty >= 0) { setActive(empty); toast(files.length > 1 ? `${empty + 1}번째 파일이 비어 있어요. 코드를 넣거나 파일을 빼 주세요` : '코드를 붙여넣어 주세요'); document.getElementById('nCode')?.focus(); return; }
    const dup = ready.findIndex((f, i) => ready.findIndex((g) => g.name.toLowerCase() === f.name.toLowerCase()) !== i);
    if (dup >= 0) { setActive(dup); toast(`같은 파일 이름이 있어요: ${ready[dup].name}`); document.getElementById('nFile')?.focus(); return; }
    setBusy(true);
    if (edit) {
      try { await saveEdit(edit, ready); } catch (err) { toast(friendlyError(err)); } finally { setBusy(false); }
      return;
    }
    try {
      const first = ready[0];
      const p = await createPost({ team_id: team.id, title: title.trim(), file_name: first.name, lang: first.lang, task, ask: ask.trim(), code: first.code, reviewer_ids: share ? [] : picked, kind, files: ready });
      saveDraft(null);
      await refresh();
      toast(share ? '코드를 공유했어요' : picked.length ? `${picked.map((id) => profiles.find((x) => x.id === id)?.name).join(', ')}님에게 리뷰를 요청했어요` : '코드를 올렸어요');
      navigate({ name: 'post', id: p.id });
    } catch (err) {
      toast(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  /** 고치기 저장: 제목·설명 등은 바로, 코드가 바뀌었으면 새 버전으로 (리뷰는 고친 줄을 따라가요) */
  const saveEdit = async ({ post, threads }: EditTarget, ready: { name: string; lang: string; code: string }[]) => {
    const meta: Partial<Pick<Post, 'title' | 'ask' | 'task' | 'reviewer_ids'>> = {};
    if (title.trim() !== post.title) meta.title = title.trim();
    if (ask.trim() !== post.ask) meta.ask = ask.trim();
    if (task !== post.task) meta.task = task;
    const rv = share ? [] : picked;
    if ([...rv].sort().join() !== [...post.reviewer_ids].sort().join()) meta.reviewer_ids = rv;
    const old = filesOf(post);
    const codeChanged = ready.length !== old.length || ready.some((f, i) => f.name !== old[i].name || f.lang !== old[i].lang || f.code !== old[i].code);
    if (!Object.keys(meta).length && !codeChanged) { toast('바뀐 내용이 없어요'); return; }
    if (Object.keys(meta).length) await updatePostMeta(post.id, meta);
    if (codeChanged) {
      // 줄 리뷰만 새 자리로 옮겨요. 글 전체 댓글(line 없음)은 그대로 남아요.
      const moved = threads.filter((t) => t.line !== null).map((t) => {
        const from = t.file ?? 0;
        const to = files.findIndex((f) => f.orig === from);
        if (to < 0) return { id: t.id, file: null, line: 1 };
        const line = lineMapper(old[from].code, ready[to].code)(t.line ?? 1);
        return { id: t.id, file: to, line: Math.min(line, ready[to].code.split('\n').length) };
      });
      await updatePostCode(post.id, ready, moved, note.trim() || '직접 수정');
    }
    await refresh();
    toast(codeChanged ? `고친 코드를 v${post.version + 1}로 올렸어요` : '글을 고쳤어요');
    navigate({ name: 'post', id: post.id });
  };

  const allEmpty = !edit && files.every((f) => !f.code.trim());

  const runFiles = files.map((f) => ({ name: f.name.trim() || sampleOf(f.lang), lang: f.lang, code: f.code }));
  return (
    <section>
      {edit ? <BackBar label="취소" to={href({ name: 'post', id: edit.post.id })} /> : <BackBar label="닫기" />}
      <h1 className="h-big tight">{edit ? '글 고치기' : '코드 올리기'}</h1>
      {edit ? <p className="muted small edit-kind">{share ? '코드 공유' : '리뷰 요청'} 글 · 지금 v{edit.post.version} · 코드를 고치면 새 버전으로 남고, 리뷰는 고친 줄을 따라가요</p> : <div className="seg kind-seg" role="radiogroup" aria-label="글 종류">
        <button type="button" role="radio" aria-checked={!share} aria-pressed={!share} onClick={() => { setKind('review'); persist({ kind: 'review' }); }}>
          <b>리뷰 요청</b><small>문제를 같이 봐 주세요</small></button>
        <button type="button" role="radio" aria-checked={share} aria-pressed={share} onClick={() => { setKind('share'); persist({ kind: 'share' }); }}>
          <b>코드 공유</b><small>만든 코드를 나눠요</small></button>
      </div>}
      <form className="form" id="newPostForm" onSubmit={(ev) => { ev.preventDefault(); submit(); }}>
        <div className="two">
          <div className="field"><label htmlFor="nTitle">제목</label><input id="nTitle" value={title} maxLength={120} placeholder={share ? '예: 판매 오더 조회 CDS View + Projection' : '예: 삭제 버튼을 누르면 다른 항목이 지워져요'} onChange={(ev) => { setTitle(ev.target.value); persist({ title: ev.target.value }); }} /></div>
          <div className="field"><label htmlFor="nTask">과제</label>
            <Picker variant="field" id="nTask" label="과제" value={newTask !== null ? NEW_TASK : task} onChange={(v) => {
              if (v === NEW_TASK) { setNewTask(''); return; }
              pickTask(v);
            }} options={[...team.tasks.map((t) => ({ value: t, label: t })), { value: NEW_TASK, label: '+ 새 과제 추가…' }]} />
            <Expand open={newTask !== null}>
              <div className="new-task">
                <div className="task-add">
                  <input id="nNewTask" autoFocus value={newTask ?? ''} maxLength={TASK_NAME_MAX} placeholder="새 과제 이름" autoComplete="off" aria-label="새 과제 이름"
                    onChange={(ev) => setNewTask(ev.target.value)}
                    onKeyDown={(ev) => { if (ev.key === 'Enter' && !ev.nativeEvent.isComposing) { ev.preventDefault(); addTask(); } if (ev.key === 'Escape') setNewTask(null); }} />
                  <button type="button" className="btn sm primary" disabled={addingTask || !newTask?.trim()} onClick={addTask}>{addingTask ? <>추가 중<Dots /></> : '추가'}</button>
                  <button type="button" className="btn sm ghost" onClick={() => setNewTask(null)}>취소</button>
                </div>
                {similar.length > 0 && (
                  <p className="task-similar small">혹시 이 과제인가요? {similar.map((t) => <button key={t} type="button" className="chip sm" onClick={() => pickTask(t)}>{t}</button>)}</p>
                )}
              </div>
            </Expand></div>
        </div>

        <div className="field">
          <span className="lbl">파일 <span className="muted">({files.length}/{MAX_FILES})</span></span>
          <div className="file-tabs" role="tablist" aria-label="파일" ref={tabsRef}>
            {files.map((f, i) => {
              const ps = allProblems[i] ?? [];
              const pe = ps.filter((p) => p.sev === 'e').length;
              return (
                <span key={f.id} data-flip={f.id} className={`ftab ${i === active ? 'on' : ''} ${confirmRemove === f.id ? 'confirm' : ''}`}>
                  <button type="button" role="tab" aria-selected={i === active} className="ftab-name" onClick={() => { setActive(i); setConfirmRemove(null); }}>
                    <LangIcon lang={f.lang} size={16} />{f.name.trim() || `파일 ${i + 1}`}
                    {pe > 0 ? <i className="ftab-dot e" aria-label={`오류 ${pe}`} /> : ps.length > 0 ? <i className="ftab-dot w" aria-label={`경고 ${ps.length}`} /> : null}
                  </button>
                  {files.length > 1 && <button type="button" className="ftab-x" data-remove={f.id} aria-label={confirmRemove === f.id ? `${f.name || `파일 ${i + 1}`} 정말 빼기` : `${f.name || `파일 ${i + 1}`} 빼기`} onClick={() => removeFile(i)}>{confirmRemove === f.id ? (reviewsIn(f) > 0 ? `리뷰 ${reviewsIn(f)}개도 빼기?` : '빼기?') : '×'}</button>}
                </span>
              );
            })}
            {files.length < MAX_FILES && <button type="button" className="ftab add" onClick={addFile}>+ 파일</button>}
          </div>
          {allEmpty && (
            <div className="sets">
              <p className="muted small">파일 세트로 시작하기 · 필요한 파일을 한 번에 넣어요</p>
              {(['UI5', 'ABAP'] as const).map((g) => (
                <div key={g} className="set-grp"><span className="set-g">{g}</span>
                  <span className="set-row">{TEMPLATE_SETS.filter((s) => s.group === g).map((s) => <button key={s.id} type="button" className="chip sm" title={`${s.detail} · 파일 ${s.ids.length}개`} onClick={() => applySet(s.id)}>{s.label}</button>)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="two">
          <div className="field"><label htmlFor="nFile">파일 이름</label><input id="nFile" value={cur.name} maxLength={80} placeholder={sampleOf(cur.lang)} onChange={(ev) => { const v = ev.target.value; const g = langFromFile(v); patchFile({ name: v, ...(g ? { lang: g, langAuto: false } : {}) }); }} /></div>
          <div className="field"><label htmlFor="nLang">언어</label>
            <Picker variant="field" id="nLang" label="언어" value={cur.lang} onChange={(v) => patchFile({ lang: v, langAuto: false })}
              options={LANGS.map((l) => ({ value: l.id, label: l.label, hint: l.course, icon: <LangIcon lang={l.id} size={20} /> }))} />
            {cur.langAuto && cur.code.trim() && <span className="muted small">자동 감지</span>}</div>
        </div>
        <div className="field">
          <div className="code-lbl">
            <label htmlFor="nCode">코드</label>
            {runKind(runFiles) && <button type="button" className="btn sm run-pre" onClick={() => setRunning(true)}><Icon name="play" />실행해 보기</button>}
          </div>
          <div className="paste">
            <CodeEditor key={cur.id} id="nCode" value={cur.code} lang={cur.lang} problems={problems} placeholder="코드 붙여넣기 (Ctrl/⌘ + V)" onToast={toast}
              fileName={cur.name} onTemplate={(f, l, c) => patchFile({ name: cur.name.trim() ? cur.name : f, lang: l, code: c, langAuto: false })}
              onChange={(v) => { const g = cur.langAuto ? langFromCode(v) : null; patchFile({ code: v, ...(g ? { lang: g } : {}) }); }} />
            <div className="check" aria-live="polite">
              {!cur.code.trim() ? <span className="muted">붙여넣으면 바로 검사해요</span>
                : !problems.length ? <span className="okmsg">✓ 검사 통과</span>
                : <>
                  <div className="check-h">검사 결과 {e > 0 && <span className="pill e">오류 {e}</span>}{problems.length - e > 0 && <span className="pill w">경고 {problems.length - e}</span>}</div>
                  <ul>{problems.map((p) => <li key={p.line + p.rule}><span className={`dot ${p.sev}`} /><span className="ln">{p.line}줄</span><span><b>{p.title}</b> · {p.easy}</span></li>)}</ul>
                </>}
            </div>
          </div>
        </div>
        <div className="field"><label htmlFor="nAsk">{share ? '설명' : '요청 사항'} <span className="muted">(선택)</span></label><textarea id="nAsk" rows={share ? 4 : 2} value={ask} maxLength={2000} placeholder={share ? '예: 무엇을 하는 코드인지, 쓰는 법, 참고한 자료' : '예: catch에서 500 오류가 안 잡혀요'} onChange={(ev) => { setAsk(ev.target.value); persist({ ask: ev.target.value }); }} /></div>
        <Expand open={!share}><div className="field"><span className="lbl">리뷰어</span>
          <div className="picks">
            {mates.length ? mates.map((p) => (
              <button key={p.id} type="button" className="pick" aria-pressed={picked.includes(p.id)} onClick={() => setPicked(picked.includes(p.id) ? picked.filter((x) => x !== p.id) : [...picked, p.id])}>
                <Avatar person={p} size="lg" />{p.name}
              </button>
            )) : <span className="muted">다른 팀원이 없어요 · <a href={href({ name: 'team' })}>초대하기</a></span>}
          </div>
        </div></Expand>
        {edit ? (
          <div className="field"><label htmlFor="nNote">고친 내용 <span className="muted">(선택 · 버전 기록에 남아요)</span></label><input id="nNote" value={note} maxLength={80} placeholder="예: 리뷰 반영해서 catch에서 throw 하도록" onChange={(ev) => setNote(ev.target.value)} /></div>
        ) : <p className="muted small">작성 중인 내용은 이 브라우저에 자동 저장돼요</p>}
      </form>
      <div className="dock"><div className="dock-in">
        <button className="btn primary wide" form="newPostForm" disabled={busy}>{busy ? <>{edit ? '저장하는 중' : '올리는 중'}<Dots /></> : edit ? '고친 내용 저장' : `${share ? '공유하기' : picked.length ? `${picked.length}명에게 리뷰 요청` : '올리기'}${files.length > 1 ? ` · 파일 ${files.length}개` : ''}`}</button>
      </div></div>
      {running && <Runner title={title.trim() || '미리보기'} files={runFiles} onClose={() => setRunning(false)} onGoto={(file) => { setRunning(false); setActive(file); }} />}
    </section>
  );
}
