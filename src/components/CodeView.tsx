import { useMemo, useRef, useState } from 'react';
import type React from 'react';
import type { Problem } from '../lib/checks';
import { highlight, highlightWithMark } from '../lib/highlight';
import { fenceOf } from '../lib/langs';
import type { Profile, Suggestion, Thread } from '../lib/types';
import { timeAgo } from '../lib/util';
import { Avatar } from './Avatar';
import { RichText } from './RichText';
import { AssistTextarea } from './AssistTextarea';
import { Icon } from './Icon';
import { Expand } from './Motion';
import { Picker } from './Picker';

const langFence = (id: string) => (id === 'CDS' ? 'cds' : id === 'SQLScript' ? 'sql' : fenceOf(id));

interface Props {
  code: string;
  lang: string;
  problems: Problem[];
  threads: Thread[];
  person: (id: string) => Profile;
  isAuthor: boolean;
  readOnly?: boolean;
  onComment?: (line: number, body: string, suggestion: Suggestion | null, threadId?: string) => Promise<boolean>;
  onResolve?: (threadId: string, resolved: boolean) => void;
  onApply?: (commentId: string) => void;
  /** 내 아이디 (내 리뷰만 고치고 지울 수 있어요) */
  meId?: string;
  onEdit?: (commentId: string, body: string) => Promise<boolean>;
  onDelete?: (commentId: string) => Promise<boolean>;
  /** 줄바꿈 (끄면 옆으로 밀어서 봐요) */
  wrap?: boolean;
  /** 글자 크기 px (크게 보기) */
  fontPx?: number;
}

/** 꺾인 줄을 들여쓰기에 맞춰 안쪽에서 이어 가려고 앞 공백 폭을 재요 (탭은 2칸, 너무 깊으면 12칸까지만). */
const indentOf = (s: string) => {
  let n = 0;
  for (const ch of s) { if (ch === ' ') n += 1; else if (ch === '\t') n += 2; else break; }
  return Math.min(n, 12);
};
/** 단어 중간보다 . / , ( 뒤에서 먼저 꺾이게 (<wbr>은 복사할 때 글자로 안 남아요) */
const softBreaks = (html: string) => html.split(/(<[^>]+>)/).map((part) => (part.startsWith('<') ? part : part.replace(/([./,(])(?=\S)/g, '$1<wbr>'))).join('');

export function CodeView({ code, lang, problems, threads, person, isAuthor, readOnly, onComment, onResolve, onApply, meId, onEdit, onDelete, wrap = true, fontPx }: Props) {
  const lines = useMemo(() => code.split('\n'), [code]);
  const [composer, setComposer] = useState<number | null>(null);
  // 줄을 누르면 그 줄에만 + 가 떠요. 같은 줄을 다시 누르면 풀려요.
  const [sel, setSel] = useState<number | null>(null);
  const pick = (ln: number) => setSel((cur) => (cur === ln ? null : ln));
  const fs = fontPx ?? 13;
  const gut = `${Math.ceil(String(lines.length).length * fs * 0.62) + 32}px`;

  // 줄 번호가 코드 길이를 넘는 스레드는 마지막 줄에 붙여요.
  const byLine = useMemo(() => {
    const m = new Map<number, Thread[]>();
    for (const t of threads) {
      if (t.line === null) continue; // 글 전체 댓글은 코드 아래 따로 보여요
      const ln = Math.min(Math.max(1, t.line), lines.length);
      m.set(ln, [...(m.get(ln) ?? []), t]);
    }
    return m;
  }, [threads, lines.length]);

  return (
    <div className={`rows dm ${wrap ? '' : 'nowrap'}`} data-lang={lang} data-code-all="row"
      style={{ '--gut': gut, ...(fontPx ? { fontSize: fontPx } : {}) } as React.CSSProperties}>
      <div className="rows-in">
      {lines.map((text, i) => {
        const ln = i + 1;
        const prob = problems.find((p) => p.line === ln);
        const ts = byLine.get(ln) ?? [];
        const count = ts.reduce((n, t) => n + t.comments.length, 0);
        const raw = prob ? highlightWithMark(text, prob.match, prob.sev, lang) : highlight(text, lang);
        const html = wrap ? softBreaks(raw) : raw;
        const on = !readOnly && sel === ln;
        return (
          <div key={ln}>
            <div className={`row ${prob ? prob.sev : ''} ${on ? 'sel' : ''} ${count ? 'has-cm' : ''}`} id={`L${ln}`}>
              <div className="ln">
                {on && (
                  <button type="button" className="ln-add" aria-label={`${ln}번째 줄에 리뷰 남기기`} aria-expanded={composer === ln}
                    onClick={() => setComposer(composer === ln ? null : ln)} />
                )}
                {readOnly ? <span className="num">{ln}</span>
                  : <button type="button" className="num" aria-pressed={on} aria-label={`${ln}번째 줄 고르기${count ? ` · 리뷰 ${count}개` : ''}`} onClick={() => pick(ln)}>{ln}</button>}
              </div>
              <div className="txt" data-code="row" style={{ '--ind': indentOf(text) } as React.CSSProperties}
                onClick={readOnly ? undefined : () => { if (!window.getSelection()?.toString()) pick(ln); }}
                dangerouslySetInnerHTML={{ __html: html || ' ' }} />
            </div>
            {/* 비어 있으면 CSS(:empty)로 숨겨요. 늘 그려 둬야 리뷰 입력칸이 닫힐 때도 부드럽게 접혀요. */}
            <div className="inl">
                {prob && (
                  <div className={`prob ${prob.sev}`}>
                    <span className="ic">{prob.sev === 'e' ? '오류' : '경고'}</span>
                    <div><b>{prob.title}</b><br />{prob.easy}</div>
                    <small>{prob.rule}</small>
                  </div>
                )}
                {ts.map((t) => (
                  <ThreadBox key={t.id} thread={t} lines={lines} lang={lang} person={person} isAuthor={isAuthor} readOnly={readOnly}
                    onReply={(body) => onComment?.(ln, body, null, t.id) ?? Promise.resolve(false)}
                    onResolve={onResolve} onApply={onApply} meId={meId} onEdit={onEdit} onDelete={onDelete} />
                ))}
                {onComment && (
                  <Expand open={composer === ln}>
                    <Composer line={ln} lines={lines} lang={lang} onCancel={() => setComposer(null)}
                      onSubmit={async (body, s) => { const ok = await onComment(ln, body, s, ts.find((t) => !t.resolved)?.id); if (ok) setComposer(null); return ok; }} />
                  </Expand>
                )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

function suggestionState(s: Suggestion, lines: string[]): 'ok' | 'stale' {
  for (let i = 0; i < s.count; i++) if (lines[s.from - 1 + i] !== s.original[i]) return 'stale';
  return 'ok';
}

/** 한 대화(첫 댓글 + 답글). general이면 글 전체 댓글: 해결 표시가 없고, 답글 칸은 '답글'을 눌러야 열려요. */
export function ThreadBox({ thread, lines, lang, person, isAuthor, readOnly, onReply, onResolve, onApply, meId, onEdit, onDelete, general, authorId }: {
  thread: Thread; lines: string[]; lang: string; person: (id: string) => Profile; isAuthor: boolean; readOnly?: boolean;
  onReply: (body: string) => Promise<boolean>; onResolve?: (id: string, r: boolean) => void; onApply?: (id: string) => void;
  meId?: string; onEdit?: (id: string, body: string) => Promise<boolean>; onDelete?: (id: string) => Promise<boolean>;
  general?: boolean; authorId?: string;
}) {
  const [reply, setReply] = useState('');
  const [replyOpen, setReplyOpen] = useState(!general);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const saveEdit = async (id: string) => {
    const v = draft.trim(); if (!v || busy) return;
    setBusy(true); const ok = await onEdit?.(id, v); setBusy(false);
    if (ok) setEditing(null);
  };
  return (
    <div className={`thread ${thread.resolved ? 'resolved' : ''}`}>
      {thread.comments.map((c) => {
        const who = person(c.author_id);
        const s = c.suggestion;
        const state = s && !c.applied_at ? suggestionState(s, lines) : null;
        const mine = !readOnly && Boolean(meId) && c.author_id === meId && Boolean(onEdit);
        return (
          <div className="cm" key={c.id} id={`cm-${c.id}`}>
            <Avatar person={who} />
            <div style={{ minWidth: 0 }}>
              <div className="cm-h">
                <b>{who.name}</b>{authorId && c.author_id === authorId && <span className="by-author">글쓴이</span>}<time dateTime={c.created_at}>{timeAgo(c.created_at)}</time>
                {c.edited_at && <span className="edited" title={new Date(c.edited_at).toLocaleString()}>수정됨</span>}
                {mine && editing !== c.id && confirmDel !== c.id && (
                  <span className="cm-acts">
                    <button type="button" className="txt-btn" onClick={() => { setEditing(c.id); setDraft(c.body); setConfirmDel(null); }}>수정</button>
                    <button type="button" className="txt-btn" onClick={() => { setConfirmDel(c.id); setEditing(null); }}>삭제</button>
                  </span>
                )}
              </div>
              <Expand open={confirmDel === c.id}>
                <div className="cm-del">
                  <span>{general ? (thread.comments.length === 1 ? '이 댓글을 지울까요?' : '이 댓글을 지울까요? 답글은 남아요.') : thread.comments.length === 1 ? '이 리뷰를 지울까요? 대화도 같이 없어져요.' : '이 리뷰를 지울까요?'}</span>
                  <button type="button" className="btn sm" onClick={() => setConfirmDel(null)}>취소</button>
                  <button type="button" className="btn sm danger-btn" disabled={busy} onClick={async () => { setBusy(true); const ok = await onDelete?.(c.id); setBusy(false); if (ok) setConfirmDel(null); }}>삭제</button>
                </div>
              </Expand>
              {editing === c.id ? (
                <form className="cm-edit" onSubmit={(e) => { e.preventDefault(); saveEdit(c.id); }}>
                  <AssistTextarea lang={lang} context={lines.join('\n')} autoFocus value={draft} maxLength={5000} aria-label="리뷰 고치기"
                    rows={Math.min(10, Math.max(2, draft.split('\n').length))} onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveEdit(c.id); }
                      if (e.key === 'Escape') { e.preventDefault(); setEditing(null); }
                    }} />
                  <Expand open={/`/.test(draft)}><div className="preview cm-text"><span className="preview-h">미리보기</span><RichText text={draft} lang={lang} /></div></Expand>
                  <div className="row-a">
                    {s && <span className="hint">수정 제안 코드는 그대로 남아요</span>}
                    <button type="button" className="btn ghost sm" onClick={() => setEditing(null)}>취소</button>
                    <button className="btn primary sm" disabled={busy || !draft.trim() || draft.trim() === c.body}>저장</button>
                  </div>
                </form>
              ) : <div className="cm-text"><RichText text={c.body} lang={lang} /></div>}
              {s && (
                <div className="sugg">
                  <div className="sugg-h">
                    <span>수정 제안 · {s.from}{s.count > 1 ? `–${s.from + s.count - 1}` : ''}줄</span>
                    <span className="sp" />
                    {c.applied_at ? <span className="applied">적용됨</span>
                      : state === 'stale' ? <span>코드가 바뀌어 적용 불가</span>
                      : isAuthor && !readOnly ? <button type="button" className="btn primary sm with-ic" onClick={() => onApply?.(c.id)}><Icon name="check" />제안 적용</button>
                      : <span>작성자만 적용 가능</span>}
                  </div>
                  <div className="diff dm" data-lang={lang} data-code-all="diff">
                    {s.original.map((t, i) => <div className="d" data-code="diff" key={'d' + i} dangerouslySetInnerHTML={{ __html: highlight(t, lang) || ' ' }} />)}
                    {s.to.map((t, i) => <div className="a" data-code="diff" key={'a' + i} dangerouslySetInnerHTML={{ __html: highlight(t, lang) || ' ' }} />)}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
      {readOnly ? null : general && !replyOpen ? (
        <div className="reply-open"><button type="button" className="txt-btn" onClick={() => { setReplyOpen(true); requestAnimationFrame(() => document.getElementById(`reply-${thread.id}`)?.focus()); }}>답글 달기</button></div>
      ) : !general && thread.resolved ? (
        <div className="reply"><span className="applied">✓ 해결된 대화</span><span className="sp" /><button type="button" className="act-btn" onClick={() => onResolve?.(thread.id, false)}>다시 열기</button></div>
      ) : (
        <form className="reply" onSubmit={async (e) => {
          e.preventDefault();
          const v = reply.trim(); if (!v || busy) return;
          setBusy(true); const ok = await onReply(v); setBusy(false);
          if (ok) { setReply(''); if (general) setReplyOpen(false); }
        }}>
          <AssistTextarea lang={lang} context={lines.join('\n')} id={`reply-${thread.id}`} rows={Math.min(8, Math.max(1, reply.split('\n').length))} value={reply} onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
            placeholder="답글 달기" aria-label="답글" maxLength={5000} />
          <button className="btn primary sm with-ic" disabled={busy || !reply.trim()} aria-label="답글 보내기"><Icon name="send" />보내기</button>
          {general ? <button type="button" className="act-btn" onClick={() => { setReplyOpen(false); setReply(''); }}>취소</button>
            : <button type="button" className="act-btn ok" onClick={() => onResolve?.(thread.id, true)}><Icon name="check" />해결</button>}
          <Expand open={/`/.test(reply)} className="full"><div className="preview cm-text"><span className="preview-h">미리보기</span><RichText text={reply} lang={lang} /></div></Expand>
        </form>
      )}
    </div>
  );
}

function Composer({ line, lines, lang, onCancel, onSubmit }: {
  line: number; lines: string[]; lang: string; onCancel: () => void; onSubmit: (body: string, s: Suggestion | null) => Promise<boolean>;
}) {
  const [body, setBody] = useState('');
  const [suggest, setSuggest] = useState(false);
  const [count, setCount] = useState(1);
  const max = Math.min(10, lines.length - line + 1);
  const original = lines.slice(line - 1, line - 1 + count);
  const [to, setTo] = useState(original.join('\n'));
  const [busy, setBusy] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  /** 고른 글자를 `코드` 또는 ```블록```으로 감싸요. 고른 게 없으면 빈 틀만 넣고 커서를 그 안에 둬요. */
  const wrap = (block: boolean) => {
    const t = areaRef.current; if (!t) return;
    const a = t.selectionStart, b = t.selectionEnd;
    const sel = body.slice(a, b);
    const lead = block && a > 0 && body[a - 1] !== '\n' ? '\n' : '';
    const open = block ? `${lead}\`\`\`${langFence(lang)}\n` : '`';
    const close = block ? '\n```\n' : '`';
    const next = body.slice(0, a) + open + sel + close + body.slice(b);
    setBody(next);
    // 고른 글자가 있으면 닫는 표시 뒤로, 없으면 빈 틀 안으로 커서를 옮겨요.
    const pos = sel ? a + open.length + sel.length + close.length : a + open.length;
    requestAnimationFrame(() => { t.focus(); t.setSelectionRange(pos, pos); });
  };

  const changeCount = (n: number) => { setCount(n); setTo(lines.slice(line - 1, line - 1 + n).join('\n')); };
  const submit = async () => {
    const v = body.trim(); if (!v || busy) return;
    const s: Suggestion | null = suggest && to !== original.join('\n') ? { from: line, count, original, to: to.split('\n') } : null;
    setBusy(true); await onSubmit(v, s); setBusy(false);
  };

  return (
    <form className="composer" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <div className="fmt-bar" role="group" aria-label="코드 넣기">
        <button type="button" className="act-btn sm" onClick={() => wrap(false)}><code>`</code>한 줄 코드</button>
        <button type="button" className="act-btn sm" onClick={() => wrap(true)}><code>```</code>코드 블록</button>
      </div>
      <AssistTextarea lang={lang} context={lines.join('\n')} areaRef={areaRef} id={`cmp-${line}`} autoFocus value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000}
        placeholder={`${line}번째 줄 리뷰`}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }} />
      <Expand open={/`/.test(body)}><div className="preview cm-text"><span className="preview-h">미리보기</span><RichText text={body} lang={lang} /></div></Expand>
      <label className="sugg-toggle"><input type="checkbox" checked={suggest} onChange={(e) => setSuggest(e.target.checked)} /> 고친 코드도 제안하기</label>
      <Expand open={suggest}>
        <div className="sugg-edit">
          <div className="sugg-h">
            <span>{line}번째 줄부터</span>
            <Picker variant="mini" align="left" label="바꿀 줄 수" value={String(count)} onChange={(v) => changeCount(Number(v))}
              options={Array.from({ length: max }, (_, i) => ({ value: String(i + 1), label: `${i + 1}줄` }))} />
            <span>바꿀 코드</span>
          </div>
          <AssistTextarea lang={lang} context={lines.join('\n')} mode="code" className="mono" value={to} onChange={(e) => setTo(e.target.value)} spellCheck={false} aria-label="제안할 코드" rows={Math.max(2, to.split('\n').length)} />
        </div>
      </Expand>
      <div className="row-a">
        <span className="hint">⌘/Ctrl + Enter로 등록</span>
        <button type="button" className="btn ghost sm" onClick={onCancel}>취소</button>
        <button className="btn primary sm" disabled={busy || !body.trim()}>리뷰 남기기</button>
      </div>
    </form>
  );
}
