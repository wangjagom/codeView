import { useState } from 'react';
import type { Profile, Thread } from '../lib/types';
import { AssistTextarea } from './AssistTextarea';
import { ThreadBox } from './CodeView';
import { Dots, Expand } from './Motion';
import { RichText } from './RichText';

/**
 * 글 전체에 다는 댓글. 리뷰 요청 글은 '전체 리뷰', 코드 공유 글은 '댓글'이라고 불러요.
 * 한 줄에 대한 이야기는 그 줄에 남기도록 안내해요.
 */
export function GeneralComments({ threads, share, lang, code, person, authorId, meId, isAuthor, readOnly, onAdd, onReply, onEdit, onDelete }: {
  threads: Thread[]; share: boolean; lang: string; code: string; person: (id: string) => Profile; authorId: string; meId: string; isAuthor: boolean; readOnly?: boolean;
  onAdd: (body: string) => Promise<boolean>; onReply: (threadId: string, body: string) => Promise<boolean>;
  onEdit: (commentId: string, body: string) => Promise<boolean>; onDelete: (commentId: string) => Promise<boolean>;
}) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const name = share ? '댓글' : '전체 리뷰';
  const count = threads.reduce((n, t) => n + t.comments.length, 0);
  const lines = code.split('\n');
  const submit = async () => {
    const v = body.trim(); if (!v || busy) return;
    setBusy(true); const ok = await onAdd(v); setBusy(false);
    if (ok) setBody('');
  };

  return (
    <section className="gen" aria-label={name}>
      <div className="sec-h"><h2>{name} {count > 0 && <span className="muted">{count}</span>}</h2><span className="muted small">{share ? '질문·감사 인사' : '코드 전체에 대한 이야기'}</span></div>
      <div className="gen-card">
        {threads.length ? threads.map((t) => (
          <ThreadBox key={t.id} thread={t} lines={lines} lang={lang} person={person} isAuthor={isAuthor} readOnly={readOnly} general authorId={authorId}
            onReply={(b) => onReply(t.id, b)} meId={meId} onEdit={onEdit} onDelete={onDelete} />
        )) : (
          <div className="gen-empty">
            <b>아직 {name === '댓글' ? '댓글이' : '전체 리뷰가'} 없어요</b>
            <span>{share ? '궁금한 점이나 고마운 마음을 남겨 주세요' : '구조·이름 규칙·과제 기준처럼 코드 전체에 대한 의견을 남겨 주세요'}</span>
          </div>
        )}
        {!readOnly && (
          <form className="gen-new" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <AssistTextarea lang={lang} context={code} id="gen-new" value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000}
              rows={Math.min(8, Math.max(2, body.split('\n').length))} aria-label={`${name} 쓰기`}
              placeholder={share ? '질문이나 감사 인사를 남겨요' : '코드 전체에 대한 리뷰를 남겨요'}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }} />
            <Expand open={/`/.test(body)}><div className="preview cm-text"><span className="preview-h">미리보기</span><RichText text={body} lang={lang} /></div></Expand>
            <div className="row-a">
              <span className="hint">한 줄에 대한 건 그 줄을 눌러 남겨요</span>
              <button className="btn primary sm" disabled={busy || !body.trim()}>{busy ? <>남기는 중<Dots /></> : '남기기'}</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
