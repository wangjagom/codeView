import { useEffect, useRef } from 'react';
import { fuzzy, type Item, type Kind } from '../lib/complete';

const KIND_ICON: Record<Kind, string> = { tpl: '▤', snip: '{}', kw: 'K', tag: '<>', attr: '=', prop: '#', val: 'v', fn: 'ƒ', cls: 'C', mod: 'N', word: 'ab' };
const KIND_NAME: Record<Kind, string> = { tpl: '기본 코드', snip: '스니펫', kw: '키워드', tag: '태그', attr: '속성', prop: '속성', val: '값', fn: '메서드', cls: '클래스', mod: '네임스페이스', word: '' };

/** VS Code 자동완성 목록 모양. 코드 입력칸과 리뷰 댓글에서 같이 써요. */
export function SuggestList({ id, items, index, prefix, style, onIndex, onPick }: {
  id: string; items: Item[]; index: number; prefix: string; style?: React.CSSProperties;
  onIndex: (i: number) => void; onPick: (item: Item) => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => { (listRef.current?.children[index] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' }); }, [index, items]);
  return (
    <div className="sg" style={style} onPointerDown={(e) => e.preventDefault()}>
      <ul id={id} role="listbox" ref={listRef} aria-label="자동완성">
        {items.map((it, i) => (
          <li key={it.kind + it.label} id={`${id}-${i}`} role="option" aria-selected={i === index}
            className={i === index ? 'on' : ''} onMouseMove={() => { if (index !== i) onIndex(i); }} onClick={() => onPick(it)}>
            <span className={`sg-ic k-${it.kind}`} aria-hidden="true">{KIND_ICON[it.kind]}</span>
            <span className="sg-l">{marked(it.label, prefix)}</span>
            <span className="sg-d">{it.detail ?? KIND_NAME[it.kind]}</span>
          </li>
        ))}
      </ul>
      <div className="sg-foot">Tab·Enter 넣기 · ↑↓ 고르기 · Esc 닫기</div>
    </div>
  );
}

/** 친 글자와 맞는 부분을 파랗게 */
function marked(label: string, prefix: string) {
  const hit = new Set(label.toLowerCase().startsWith(prefix.toLowerCase()) ? [...prefix].map((_, i) => i) : fuzzy(label, prefix) ?? []);
  if (!hit.size) return label;
  return [...label].map((c, i) => (hit.has(i) ? <b key={i}>{c}</b> : c));
}

/** 바꾼 글을 브라우저 입력처럼 넣어서 되돌리기(Ctrl+Z)가 되게 해요. sel은 넣은 글 안에서의 커서 위치예요. */
export function insertText(t: HTMLTextAreaElement, from: number, to: number, text: string, sel0 = text.length, sel1 = sel0, fallback?: (v: string) => void) {
  t.focus();
  t.setSelectionRange(from, to);
  let ok = false;
  try { ok = text ? document.execCommand('insertText', false, text) : document.execCommand('delete'); } catch { ok = false; }
  if (!ok || t.value.slice(from, from + text.length) !== text) {
    t.setRangeText(text, from, to, 'end');
    if (fallback) fallback(t.value);
    else t.dispatchEvent(new Event('input', { bubbles: true }));
  }
  t.setSelectionRange(from + sel0, from + sel1);
}
