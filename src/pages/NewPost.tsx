import { useMemo, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { CodeEditor } from '../components/CodeEditor';
import { BackBar } from '../components/Layout';
import { addTeamTask, createPost, friendlyError } from '../lib/api';
import { checkCode } from '../lib/checks';
import { LANGS, langFromCode, langFromFile } from '../lib/langs';
import { href, navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { Dots, Expand } from '../components/Motion';
import { TASK_NAME_MAX, normTask, similarTasks, taskProblem } from '../lib/tasks';
import type { PostKind } from '../lib/types';

const DRAFT_KEY = 'codeview:draft';

const NEW_TASK = '__new_task__';

interface Draft { title: string; file: string; lang: string; task: string; code: string; ask: string; kind?: PostKind }

function loadDraft(): Draft | null {
  try { const s = localStorage.getItem(DRAFT_KEY); return s ? (JSON.parse(s) as Draft) : null; } catch { return null; }
}
function saveDraft(d: Draft | null) {
  try { if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); else localStorage.removeItem(DRAFT_KEY); } catch { /* 저장 못 해도 괜찮아요 */ }
}

export function NewPost() {
  const { me, team, isOwner, profiles, refresh, reloadTeams, toast } = useStore();
  const [newTask, setNewTask] = useState<string | null>(null);
  const [addingTask, setAddingTask] = useState(false);
  const similar = newTask ? similarTasks(newTask, team.tasks) : [];
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
    } catch (e) { toast(friendlyError(e)); }
    setAddingTask(false);
  };
  const d = loadDraft();
  const [title, setTitle] = useState(d?.title ?? '');
  const [file, setFile] = useState(d?.file ?? '');
  const [lang, setLang] = useState(d?.lang && LANGS.some((l) => l.id === d.lang) ? d.lang : 'ABAP');
  // 언어를 직접 고르기 전까지는 파일 이름이나 코드를 보고 자동으로 골라요.
  const [langAuto, setLangAuto] = useState(!d?.lang);
  const [task, setTask] = useState(d?.task && team.tasks.includes(d.task) ? d.task : team.tasks[0] ?? '자유 질문');
  const [code, setCode] = useState(d?.code ?? '');
  const [ask, setAsk] = useState(d?.ask ?? '');
  const [picked, setPicked] = useState<string[]>([]);
  const [kind, setKind] = useState<PostKind>(d?.kind === 'share' ? 'share' : 'review');
  const share = kind === 'share';
  const [busy, setBusy] = useState(false);
  const mates = profiles.filter((p) => p.id !== me.id);
  const problems = useMemo(() => checkCode(code, lang), [code, lang]);
  const e = problems.filter((p) => p.sev === 'e').length;

  const persist = (patch: Partial<Draft>) => saveDraft({ title, file, lang, task, code, ask, kind, ...patch });

  const submit = async () => {
    if (!title.trim()) { toast('제목을 적어 주세요'); document.getElementById('nTitle')?.focus(); return; }
    if (!code.trim()) { toast('코드를 붙여넣어 주세요'); document.getElementById('nCode')?.focus(); return; }
    setBusy(true);
    try {
      const p = await createPost({ team_id: team.id, title: title.trim(), file_name: file.trim() || (LANGS.find((l) => l.id === lang)?.sample ?? 'code.txt'), lang, task, ask: ask.trim(), code: code.replace(/\s+$/, ''), reviewer_ids: share ? [] : picked, kind });
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

  return (
    <section>
      <BackBar label="닫기" />
      <h1 className="h-big tight">코드 올리기</h1>
      <div className="seg kind-seg" role="radiogroup" aria-label="글 종류">
        <button type="button" role="radio" aria-checked={!share} aria-pressed={!share} onClick={() => { setKind('review'); persist({ kind: 'review' }); }}>
          <b>리뷰 요청</b><small>문제를 같이 봐 주세요</small></button>
        <button type="button" role="radio" aria-checked={share} aria-pressed={share} onClick={() => { setKind('share'); persist({ kind: 'share' }); }}>
          <b>코드 공유</b><small>만든 코드를 나눠요</small></button>
      </div>
      <form className="form" id="newPostForm" onSubmit={(ev) => { ev.preventDefault(); submit(); }}>
        <div className="two">
          <div className="field"><label htmlFor="nTitle">제목</label><input id="nTitle" value={title} maxLength={120} placeholder={share ? '예: 판매 오더 조회 CDS View + Projection' : '예: 삭제 버튼을 누르면 다른 항목이 지워져요'} onChange={(ev) => { setTitle(ev.target.value); persist({ title: ev.target.value }); }} /></div>
          <div className="field"><label htmlFor="nTask">과제</label>
            <select id="nTask" value={newTask !== null ? NEW_TASK : task} onChange={(ev) => {
              if (ev.target.value === NEW_TASK) { setNewTask(''); requestAnimationFrame(() => document.getElementById('nNewTask')?.focus()); return; }
              pickTask(ev.target.value);
            }}>{team.tasks.map((t) => <option key={t}>{t}</option>)}<option value={NEW_TASK}>+ 새 과제 추가…</option></select>
            <Expand open={newTask !== null}>
              <div className="new-task">
                <div className="task-add">
                  <input id="nNewTask" value={newTask ?? ''} maxLength={TASK_NAME_MAX} placeholder="새 과제 이름" autoComplete="off" aria-label="새 과제 이름"
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); addTask(); } if (e.key === 'Escape') setNewTask(null); }} />
                  <button type="button" className="btn sm primary" disabled={addingTask || !newTask?.trim()} onClick={addTask}>{addingTask ? <>추가 중<Dots /></> : '추가'}</button>
                  <button type="button" className="btn sm ghost" onClick={() => setNewTask(null)}>취소</button>
                </div>
                {similar.length > 0 && (
                  <p className="task-similar small">혹시 이 과제인가요? {similar.map((t) => <button key={t} type="button" className="chip sm" onClick={() => pickTask(t)}>{t}</button>)}</p>
                )}
              </div>
            </Expand></div>
        </div>
        <div className="two">
          <div className="field"><label htmlFor="nFile">파일 이름</label><input id="nFile" value={file} maxLength={80} placeholder={LANGS.find((l) => l.id === lang)?.sample ?? "zr_report.prog.abap"} onChange={(ev) => { const v = ev.target.value; setFile(v); const g = langFromFile(v); if (g) { setLang(g); setLangAuto(false); } persist({ file: v, ...(g ? { lang: g } : {}) }); }} /></div>
          <div className="field"><label htmlFor="nLang">언어</label>
            <select id="nLang" value={lang} onChange={(ev) => { setLang(ev.target.value); setLangAuto(false); persist({ lang: ev.target.value }); }}>{LANGS.map((l) => <option key={l.id} value={l.id}>{l.label} · {l.course}</option>)}</select>
            {langAuto && code.trim() && <span className="muted small">자동 감지</span>}</div>
        </div>
        <div className="field">
          <label htmlFor="nCode">코드</label>
          <div className="paste">
            <CodeEditor id="nCode" value={code} lang={lang} problems={problems} placeholder="코드 붙여넣기 (Ctrl/⌘ + V)" onToast={toast}
              fileName={file} onTemplate={(f, l, c) => { const nf = file.trim() ? file : f; setFile(nf); setLang(l); setLangAuto(false); persist({ file: nf, lang: l, code: c }); }}
              onChange={(v) => { setCode(v); const g = langAuto ? langFromCode(v) : null; if (g) setLang(g); persist({ code: v, ...(g ? { lang: g } : {}) }); }} />
            <div className="check" aria-live="polite">
              {!code.trim() ? <span className="muted">붙여넣으면 바로 검사해요</span>
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
        <p className="muted small">작성 중인 내용은 이 브라우저에 자동 저장돼요</p>
      </form>
      <div className="dock"><div className="dock-in">
        <button className="btn primary wide" form="newPostForm" disabled={busy}>{busy ? <>올리는 중<Dots /></> : share ? '공유하기' : picked.length ? `${picked.length}명에게 리뷰 요청` : '올리기'}</button>
      </div></div>
    </section>
  );
}
