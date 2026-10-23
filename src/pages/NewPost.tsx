import { useMemo, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { createPost, friendlyError } from '../lib/api';
import { checkCode } from '../lib/checks';
import { LANGS, TASKS } from '../lib/config';
import { href, navigate } from '../lib/router';
import { useStore } from '../lib/store';

const DRAFT_KEY = 'jultalk:draft';

interface Draft { title: string; file: string; lang: string; task: string; code: string; ask: string }

function loadDraft(): Draft | null {
  try { const s = localStorage.getItem(DRAFT_KEY); return s ? (JSON.parse(s) as Draft) : null; } catch { return null; }
}
function saveDraft(d: Draft | null) {
  try { if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); else localStorage.removeItem(DRAFT_KEY); } catch { /* 저장 못 해도 괜찮아요 */ }
}

function guessLang(file: string): string | null {
  const ext = file.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = { js: 'JavaScript', mjs: 'JavaScript', ts: 'TypeScript', jsx: 'JSX', tsx: 'TSX', css: 'CSS', html: 'HTML', py: 'Python', java: 'Java', sql: 'SQL' };
  return ext ? map[ext] ?? null : null;
}

export function NewPost() {
  const { me, profiles, refresh, toast } = useStore();
  const d = loadDraft();
  const [title, setTitle] = useState(d?.title ?? '');
  const [file, setFile] = useState(d?.file ?? '');
  const [lang, setLang] = useState(d?.lang ?? 'JavaScript');
  const [task, setTask] = useState(d?.task ?? TASKS[0] ?? '자유 질문');
  const [code, setCode] = useState(d?.code ?? '');
  const [ask, setAsk] = useState(d?.ask ?? '');
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const mates = profiles.filter((p) => p.id !== me.id);
  const problems = useMemo(() => checkCode(code, lang), [code, lang]);
  const e = problems.filter((p) => p.sev === 'e').length;

  const persist = (patch: Partial<Draft>) => saveDraft({ title, file, lang, task, code, ask, ...patch });

  const submit = async () => {
    if (!title.trim()) { toast('제목을 적어 주세요'); document.getElementById('nTitle')?.focus(); return; }
    if (!code.trim()) { toast('코드를 붙여넣어 주세요'); document.getElementById('nCode')?.focus(); return; }
    setBusy(true);
    try {
      const p = await createPost({ title: title.trim(), file_name: file.trim() || 'code.js', lang, task, ask: ask.trim(), code: code.replace(/\s+$/, ''), reviewer_ids: picked });
      saveDraft(null);
      await refresh();
      toast(picked.length ? `${picked.map((id) => profiles.find((x) => x.id === id)?.name).join(', ')}님에게 리뷰를 요청했어요` : '코드를 올렸어요');
      navigate({ name: 'post', id: p.id });
    } catch (err) {
      toast(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <a className="back" href={href({ name: 'feed' })}>← 목록으로</a>
      <div className="head"><div><h1>코드 올리기</h1><p>붙여넣으면 흔한 실수를 먼저 짚어 줘요. 조원에게 리뷰를 부탁해 보세요.</p></div></div>
      <form className="form" onSubmit={(ev) => { ev.preventDefault(); submit(); }}>
        <div className="two">
          <div className="field"><label htmlFor="nTitle">제목</label><input id="nTitle" value={title} maxLength={120} placeholder="예: 삭제 버튼을 누르면 다른 항목이 지워져요" onChange={(ev) => { setTitle(ev.target.value); persist({ title: ev.target.value }); }} /></div>
          <div className="field"><label htmlFor="nTask">과제</label>
            <select id="nTask" value={task} onChange={(ev) => { setTask(ev.target.value); persist({ task: ev.target.value }); }}>{TASKS.map((t) => <option key={t}>{t}</option>)}</select></div>
        </div>
        <div className="two">
          <div className="field"><label htmlFor="nFile">파일 이름</label><input id="nFile" value={file} maxLength={80} placeholder="TodoList.jsx" onChange={(ev) => { const v = ev.target.value; setFile(v); const g = guessLang(v); if (g) setLang(g); persist({ file: v, ...(g ? { lang: g } : {}) }); }} /></div>
          <div className="field"><label htmlFor="nLang">언어</label>
            <select id="nLang" value={lang} onChange={(ev) => { setLang(ev.target.value); persist({ lang: ev.target.value }); }}>{LANGS.map((l) => <option key={l}>{l}</option>)}</select></div>
        </div>
        <div className="field">
          <label htmlFor="nCode">코드</label>
          <div className="paste">
            <textarea id="nCode" spellCheck={false} value={code} placeholder="여기에 코드를 붙여넣어요" maxLength={50000}
              onChange={(ev) => { setCode(ev.target.value); persist({ code: ev.target.value }); }}
              onKeyDown={(ev) => { if (ev.key === 'Tab' && !ev.shiftKey) { ev.preventDefault(); const t = ev.currentTarget; t.setRangeText('  ', t.selectionStart, t.selectionEnd, 'end'); setCode(t.value); } }} />
            <div className="check" aria-live="polite">
              {!code.trim() ? <span className="muted">코드를 붙여넣으면 바로 검사해요</span>
                : !problems.length ? <span className="okmsg">✓ 흔한 실수는 보이지 않아요</span>
                : <>
                  <div className="check-h">올리기 전에 확인해 보세요 {e > 0 && <span className="pill e">오류 {e}</span>}{problems.length - e > 0 && <span className="pill w">경고 {problems.length - e}</span>}</div>
                  <ul>{problems.map((p) => <li key={p.line + p.rule}><span className={`dot ${p.sev}`} /><span className="ln">{p.line}줄</span><span><b>{p.title}</b> · {p.easy}</span></li>)}</ul>
                </>}
            </div>
          </div>
        </div>
        <div className="field"><label htmlFor="nAsk">어떤 피드백을 받고 싶어요?</label><textarea id="nAsk" rows={2} value={ask} maxLength={2000} placeholder="예: 버튼을 누르기도 전에 화면이 멈춰요. 원인이 뭘까요?" onChange={(ev) => { setAsk(ev.target.value); persist({ ask: ev.target.value }); }} /></div>
        <div className="field"><span className="lbl">리뷰 부탁할 조원</span>
          <div className="picks">
            {mates.length ? mates.map((p) => (
              <button key={p.id} type="button" className="pick" aria-pressed={picked.includes(p.id)} onClick={() => setPicked(picked.includes(p.id) ? picked.filter((x) => x !== p.id) : [...picked, p.id])}>
                <Avatar person={p} size="xs" />{p.name}
              </button>
            )) : <span className="muted">아직 다른 조원이 가입하지 않았어요.</span>}
          </div>
        </div>
        <div className="form-foot">
          <span className="note">쓰는 중인 내용은 이 브라우저에 임시 저장돼요</span>
          <a className="btn ghost" href={href({ name: 'feed' })}>취소</a>
          <button className="btn primary" disabled={busy}>{busy ? '올리는 중…' : '리뷰 요청하기'}</button>
        </div>
      </form>
    </section>
  );
}
