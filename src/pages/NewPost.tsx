import { useMemo, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { CodeEditor } from '../components/CodeEditor';
import { BackBar } from '../components/Layout';
import { createPost, friendlyError } from '../lib/api';
import { checkCode } from '../lib/checks';
import { LANGS, langFromCode, langFromFile } from '../lib/langs';
import { href, navigate } from '../lib/router';
import { useStore } from '../lib/store';

const DRAFT_KEY = 'codeview:draft';

interface Draft { title: string; file: string; lang: string; task: string; code: string; ask: string }

function loadDraft(): Draft | null {
  try { const s = localStorage.getItem(DRAFT_KEY); return s ? (JSON.parse(s) as Draft) : null; } catch { return null; }
}
function saveDraft(d: Draft | null) {
  try { if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); else localStorage.removeItem(DRAFT_KEY); } catch { /* 저장 못 해도 괜찮아요 */ }
}

export function NewPost() {
  const { me, team, profiles, refresh, toast } = useStore();
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
      const p = await createPost({ team_id: team.id, title: title.trim(), file_name: file.trim() || (LANGS.find((l) => l.id === lang)?.sample ?? 'code.txt'), lang, task, ask: ask.trim(), code: code.replace(/\s+$/, ''), reviewer_ids: picked });
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
      <BackBar label="닫기" />
      <h1 className="h-big tight">어떤 코드를<br />봐 드릴까요?</h1>
      <form className="form" id="newPostForm" onSubmit={(ev) => { ev.preventDefault(); submit(); }}>
        <div className="two">
          <div className="field"><label htmlFor="nTitle">제목</label><input id="nTitle" value={title} maxLength={120} placeholder="예: 삭제 버튼을 누르면 다른 항목이 지워져요" onChange={(ev) => { setTitle(ev.target.value); persist({ title: ev.target.value }); }} /></div>
          <div className="field"><label htmlFor="nTask">과제</label>
            <select id="nTask" value={task} onChange={(ev) => { setTask(ev.target.value); persist({ task: ev.target.value }); }}>{team.tasks.map((t) => <option key={t}>{t}</option>)}</select></div>
        </div>
        <div className="two">
          <div className="field"><label htmlFor="nFile">파일 이름</label><input id="nFile" value={file} maxLength={80} placeholder={LANGS.find((l) => l.id === lang)?.sample ?? "zr_report.prog.abap"} onChange={(ev) => { const v = ev.target.value; setFile(v); const g = langFromFile(v); if (g) { setLang(g); setLangAuto(false); } persist({ file: v, ...(g ? { lang: g } : {}) }); }} /></div>
          <div className="field"><label htmlFor="nLang">언어</label>
            <select id="nLang" value={lang} onChange={(ev) => { setLang(ev.target.value); setLangAuto(false); persist({ lang: ev.target.value }); }}>{LANGS.map((l) => <option key={l.id} value={l.id}>{l.label} · {l.course}</option>)}</select>
            {langAuto && code.trim() && <span className="muted small">붙여넣은 코드를 보고 골랐어요</span>}</div>
        </div>
        <div className="field">
          <label htmlFor="nCode">코드</label>
          <div className="paste">
            <CodeEditor id="nCode" value={code} lang={lang} problems={problems} placeholder="여기에 코드를 붙여넣거나, 위에서 기본 코드를 골라요" onToast={toast}
              fileName={file} onTemplate={(f, l, c) => { const nf = file.trim() ? file : f; setFile(nf); setLang(l); setLangAuto(false); persist({ file: nf, lang: l, code: c }); }}
              onChange={(v) => { setCode(v); const g = langAuto ? langFromCode(v) : null; if (g) setLang(g); persist({ code: v, ...(g ? { lang: g } : {}) }); }} />
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
        <div className="field"><span className="lbl">누구에게 부탁할까요?</span>
          <div className="picks">
            {mates.length ? mates.map((p) => (
              <button key={p.id} type="button" className="pick" aria-pressed={picked.includes(p.id)} onClick={() => setPicked(picked.includes(p.id) ? picked.filter((x) => x !== p.id) : [...picked, p.id])}>
                <Avatar person={p} size="lg" />{p.name}
              </button>
            )) : <span className="muted">아직 다른 조원이 없어요. <a href={href({ name: 'team' })}>초대 링크</a>를 보내 보세요.</span>}
          </div>
        </div>
        <p className="muted small">쓰는 중인 내용은 이 브라우저에 임시 저장돼요.</p>
      </form>
      <div className="dock"><div className="dock-in">
        <button className="btn primary wide" form="newPostForm" disabled={busy}>{busy ? '올리는 중…' : picked.length ? `${picked.map((id) => profiles.find((x) => x.id === id)?.name).join(', ')}님에게 리뷰 요청하기` : '리뷰 요청하기'}</button>
      </div></div>
    </section>
  );
}
