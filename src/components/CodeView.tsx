import { useMemo, useState } from 'react';
import type { Problem } from '../lib/checks';
import { highlight, highlightWithMark } from '../lib/highlight';
import type { Profile, Suggestion, Thread } from '../lib/types';
import { timeAgo } from '../lib/util';
import { Avatar, RichText } from './Avatar';
import { Icon } from './Icon';

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
}

export function CodeView({ code, lang, problems, threads, person, isAuthor, readOnly, onComment, onResolve, onApply }: Props) {
  const lines = useMemo(() => code.split('\n'), [code]);
  const [composer, setComposer] = useState<number | null>(null);

  // 줄 번호가 코드 길이를 넘는 스레드는 마지막 줄에 붙여요.
  const byLine = useMemo(() => {
    const m = new Map<number, Thread[]>();
    for (const t of threads) {
      const ln = Math.min(Math.max(1, t.line), lines.length);
      m.set(ln, [...(m.get(ln) ?? []), t]);
    }
    return m;
  }, [threads, lines.length]);

  return (
    <div className="rows">
      {lines.map((text, i) => {
        const ln = i + 1;
        const prob = problems.find((p) => p.line === ln);
        const ts = byLine.get(ln) ?? [];
        const count = ts.reduce((n, t) => n + t.comments.length, 0);
        const html = prob ? highlightWithMark(text, prob.match, prob.sev, lang) : highlight(text, lang);
        return (
          <div key={ln}>
            <div className={`row ${prob ? prob.sev : ''}`} id={`L${ln}`}>
              <div className="gut">
                {!readOnly && (
                  <button
                    type="button"
                    className={count ? 'cnt' : ''}
                    aria-label={count ? `${ln}번째 줄 리뷰 ${count}개, 리뷰 추가` : `${ln}번째 줄에 리뷰 남기기`}
                    onClick={() => setComposer(composer === ln ? null : ln)}
                  >
                    {count || '+'}
                  </button>
                )}
              </div>
              {readOnly ? <div className="num">{ln}</div>
                : <button type="button" className="num" tabIndex={-1} aria-hidden="true" onClick={() => setComposer(composer === ln ? null : ln)}>{ln}</button>}
              <div className="txt" dangerouslySetInnerHTML={{ __html: html || ' ' }} />
            </div>
            {(prob || ts.length > 0 || composer === ln) && (
              <div className="inl">
                {prob && (
                  <div className={`prob ${prob.sev}`}>
                    <span className="ic">{prob.sev === 'e' ? '오류' : '경고'}</span>
                    <div><b>{prob.title}</b><br />{prob.easy}</div>
                    <small>{prob.rule}</small>
                  </div>
                )}
                {ts.map((t) => (
                  <ThreadBox key={t.id} thread={t} lines={lines} person={person} isAuthor={isAuthor} readOnly={readOnly}
                    onReply={(body) => onComment?.(t.line, body, null, t.id) ?? Promise.resolve(false)}
                    onResolve={onResolve} onApply={onApply} />
                ))}
                {composer === ln && onComment && (
                  <Composer line={ln} lines={lines} onCancel={() => setComposer(null)}
                    onSubmit={async (body, s) => { const ok = await onComment(ln, body, s, ts.find((t) => !t.resolved)?.id); if (ok) setComposer(null); return ok; }} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function suggestionState(s: Suggestion, lines: string[]): 'ok' | 'stale' {
  for (let i = 0; i < s.count; i++) if (lines[s.from - 1 + i] !== s.original[i]) return 'stale';
  return 'ok';
}

function ThreadBox({ thread, lines, person, isAuthor, readOnly, onReply, onResolve, onApply }: {
  thread: Thread; lines: string[]; person: (id: string) => Profile; isAuthor: boolean; readOnly?: boolean;
  onReply: (body: string) => Promise<boolean>; onResolve?: (id: string, r: boolean) => void; onApply?: (id: string) => void;
}) {
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className={`thread ${thread.resolved ? 'resolved' : ''}`}>
      {thread.comments.map((c) => {
        const who = person(c.author_id);
        const s = c.suggestion;
        const state = s && !c.applied_at ? suggestionState(s, lines) : null;
        return (
          <div className="cm" key={c.id}>
            <Avatar person={who} />
            <div style={{ minWidth: 0 }}>
              <div className="cm-h"><b>{who.name}</b><time dateTime={c.created_at}>{timeAgo(c.created_at)}</time></div>
              <p className="body"><RichText text={c.body} /></p>
              {s && (
                <div className="sugg">
                  <div className="sugg-h">
                    <span>수정 제안 · {s.from}{s.count > 1 ? `–${s.from + s.count - 1}` : ''}줄</span>
                    <span className="sp" />
                    {c.applied_at ? <span className="applied">적용됨</span>
                      : state === 'stale' ? <span>코드가 바뀌어 적용할 수 없어요</span>
                      : isAuthor && !readOnly ? <button type="button" className="btn primary sm with-ic" onClick={() => onApply?.(c.id)}><Icon name="check" />제안 적용</button>
                      : <span>글쓴이가 적용할 수 있어요</span>}
                  </div>
                  <div className="diff">
                    {s.original.map((t, i) => <div className="d" key={'d' + i}>{t || ' '}</div>)}
                    {s.to.map((t, i) => <div className="a" key={'a' + i}>{t || ' '}</div>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
      {readOnly ? null : thread.resolved ? (
        <div className="reply"><span className="applied">✓ 해결된 대화</span><span className="sp" /><button type="button" className="act-btn" onClick={() => onResolve?.(thread.id, false)}>다시 열기</button></div>
      ) : (
        <form className="reply" onSubmit={async (e) => {
          e.preventDefault();
          const v = reply.trim(); if (!v || busy) return;
          setBusy(true); const ok = await onReply(v); setBusy(false);
          if (ok) setReply('');
        }}>
          <input id={`reply-${thread.id}`} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="답글 달기" aria-label="답글" maxLength={5000} />
          <button className="btn primary sm with-ic" disabled={busy || !reply.trim()} aria-label="답글 보내기"><Icon name="send" />보내기</button>
          <button type="button" className="act-btn ok" onClick={() => onResolve?.(thread.id, true)}><Icon name="check" />해결</button>
        </form>
      )}
    </div>
  );
}

function Composer({ line, lines, onCancel, onSubmit }: {
  line: number; lines: string[]; onCancel: () => void; onSubmit: (body: string, s: Suggestion | null) => Promise<boolean>;
}) {
  const [body, setBody] = useState('');
  const [suggest, setSuggest] = useState(false);
  const [count, setCount] = useState(1);
  const max = Math.min(10, lines.length - line + 1);
  const original = lines.slice(line - 1, line - 1 + count);
  const [to, setTo] = useState(original.join('\n'));
  const [busy, setBusy] = useState(false);

  const changeCount = (n: number) => { setCount(n); setTo(lines.slice(line - 1, line - 1 + n).join('\n')); };
  const submit = async () => {
    const v = body.trim(); if (!v || busy) return;
    const s: Suggestion | null = suggest && to !== original.join('\n') ? { from: line, count, original, to: to.split('\n') } : null;
    setBusy(true); await onSubmit(v, s); setBusy(false);
  };

  return (
    <form className="composer" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <textarea id={`cmp-${line}`} autoFocus value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000}
        placeholder={`${line}번째 줄에 대한 리뷰를 남겨 주세요. 코드는 \`백틱\`으로 감싸요.`}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }} />
      <label className="sugg-toggle"><input type="checkbox" checked={suggest} onChange={(e) => setSuggest(e.target.checked)} /> 고친 코드도 제안하기</label>
      {suggest && (
        <div className="sugg-edit">
          <div className="sugg-h">
            <span>{line}번째 줄부터</span>
            <select value={count} onChange={(e) => changeCount(Number(e.target.value))} aria-label="바꿀 줄 수">
              {Array.from({ length: max }, (_, i) => <option key={i} value={i + 1}>{i + 1}줄</option>)}
            </select>
            <span>을 이렇게 바꿔요</span>
          </div>
          <textarea className="mono" value={to} onChange={(e) => setTo(e.target.value)} spellCheck={false} aria-label="제안할 코드" rows={Math.max(2, to.split('\n').length)} />
        </div>
      )}
      <div className="row-a">
        <span className="hint">⌘/Ctrl + Enter로 등록</span>
        <button type="button" className="btn ghost sm" onClick={onCancel}>취소</button>
        <button className="btn primary sm" disabled={busy || !body.trim()}>리뷰 남기기</button>
      </div>
    </form>
  );
}
