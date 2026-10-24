import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Problem } from '../lib/checks';
import { PAIRS, caseFor, expand, newline, shouldPair, suggest, type Item, type Suggestion } from '../lib/complete';
import { highlight, highlightWithMark } from '../lib/highlight';
import { fillTemplate, templatesFor, type Template } from '../lib/templates';
import { Icon } from './Icon';
import { registerHoverSource } from './Hover';
import { SuggestList, insertText } from './SuggestList';

interface Props {
  id: string;
  value: string;
  lang: string;
  problems: Problem[];
  placeholder?: string;
  /** 파일 이름 (기본 코드의 클래스·뷰 이름에 써요) */
  fileName?: string;
  onChange: (v: string) => void;
  /** 기본 코드를 골랐을 때. 파일 이름이 비어 있으면 채워 줄 수 있게 알려 줘요. */
  onTemplate?: (fileName: string, lang: string, code: string) => void;
  onToast?: (msg: string) => void;
}

const LINE_H = 13 * 1.7;
const PAD_TOP = 10, PAD_LEFT = 4;

/**
 * VS Code(Dark Modern)처럼 보이는 코드 입력칸.
 * 투명한 textarea 뒤에 같은 글자를 색칠한 <pre>를 깔아서, 입력은 그대로 되고 색만 보여요.
 * 언어별 자동완성, 괄호 닫기, 들여쓰기도 VS Code처럼 해 줘요.
 */
export function CodeEditor({ id, value, lang, problems, placeholder, fileName = '', onChange, onTemplate, onToast }: Props) {
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const measRef = useRef<HTMLSpanElement>(null);
  const mute = useRef(false);
  const [cw, setCw] = useState(7.8);
  const [sg, setSg] = useState<(Suggestion & { i: number }) | null>(null);
  const [, setScroll] = useState(0);
  const lines = useMemo(() => value.split('\n'), [value]);
  const bad = useMemo(() => new Map(problems.map((p) => [p.line, p])), [problems]);

  const html = useMemo(() => lines.map((l, i) => {
    const p = bad.get(i + 1);
    return p ? highlightWithMark(l, p.match, p.sev, lang) : highlight(l, lang);
  }).join('\n') + '\n', [lines, bad, lang]);

  useLayoutEffect(() => { const w = measRef.current?.getBoundingClientRect().width; if (w) setCw(w / 20); }, []);
  useEffect(() => { setSg(null); }, [lang]);

  // 마우스를 올린 글자 위치를 계산해서 설명 창(Hover)에 알려 줘요.
  const live = useRef({ value, lang, cw, open: false });
  live.current = { value, lang, cw, open: Boolean(sg) };
  useEffect(() => {
    const t = taRef.current; if (!t) return;
    return registerHoverSource(t, (x, y) => {
      const { value: v, lang: l, cw: w, open: busy } = live.current;
      if (busy) return null;
      const r = t.getBoundingClientRect();
      const px = x - r.left - PAD_LEFT + t.scrollLeft, py = y - r.top - PAD_TOP + t.scrollTop;
      if (px < 0 || py < 0) return null;
      const all = v.split('\n');
      const row = Math.floor(py / LINE_H), col = Math.floor(px / w);
      const line = all[row];
      if (line === undefined || col >= line.length) return null;
      const top = r.top + PAD_TOP + row * LINE_H - t.scrollTop;
      return { lang: l, line, col, code: v, lineNo: row, rect: { left: r.left + PAD_LEFT + col * w - t.scrollLeft, top, bottom: top + LINE_H, width: w } };
    });
  }, []);

  const sync = (t: HTMLTextAreaElement) => {
    if (preRef.current) { preRef.current.scrollTop = t.scrollTop; preRef.current.scrollLeft = t.scrollLeft; }
    if (gutterRef.current) gutterRef.current.scrollTop = t.scrollTop;
  };

  /** 글을 바꾸되 되돌리기(Ctrl+Z)가 되도록 브라우저 입력처럼 넣어요. sel은 넣은 글 안에서의 커서 위치예요. */
  const edit = (from: number, to: number, text: string, sel0 = text.length, sel1 = sel0) => {
    const t = taRef.current; if (!t) return;
    mute.current = true;
    try { insertText(t, from, to, text, sel0, sel1, onChange); } finally { mute.current = false; }
  };

  const open = (v: string, pos: number, force = false) => {
    const r = suggest(v, pos, lang, force, fileName);
    setSg(r ? { ...r, i: 0 } : null);
  };

  const accept = (item: Item) => {
    const t = taRef.current; if (!t || !sg) return;
    const pos = t.selectionStart;
    const ls = t.value.lastIndexOf('\n', sg.from - 1) + 1;
    const indent = /^[ \t]*/.exec(t.value.slice(ls, sg.from))![0];
    const x = expand(item.insert, indent, caseFor(lang, sg.prefix, item));
    setSg(null);
    edit(sg.from, pos, x.text, x.start, x.end);
  };

  const pickTemplate = (tp: Template) => {
    const f = fillTemplate(tp, fileName);
    const x = expand(f.body, '');
    setSg(null);
    edit(0, taRef.current?.value.length ?? 0, x.text, x.start, x.end);
    onTemplate?.(f.file, tp.lang, x.text);
  };
  const tpls = templatesFor(lang);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    const t = e.currentTarget;
    const a = t.selectionStart, b = t.selectionEnd, v = t.value;
    if (sg) {
      const n = sg.items.length;
      if (e.key === 'ArrowDown') { e.preventDefault(); setSg({ ...sg, i: (sg.i + 1) % n }); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSg({ ...sg, i: (sg.i - 1 + n) % n }); return; }
      if (e.key === 'PageDown') { e.preventDefault(); setSg({ ...sg, i: Math.min(n - 1, sg.i + 7) }); return; }
      if (e.key === 'PageUp') { e.preventDefault(); setSg({ ...sg, i: Math.max(0, sg.i - 7) }); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); accept(sg.items[sg.i]); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setSg(null); return; }
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) setSg(null);
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === ' ' || e.code === 'Space')) { e.preventDefault(); open(v, a, true); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // 줄 앞 들여쓰기 두 칸 빼기
        const ls = v.lastIndexOf('\n', a - 1) + 1;
        const cut = /^ {1,2}/.exec(v.slice(ls))?.[0].length ?? 0;
        if (cut) edit(ls, ls + cut, '', 0), t.setSelectionRange(Math.max(ls, a - cut), Math.max(ls, b - cut));
      } else edit(a, b, '  ');
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && a === b) {
      e.preventDefault();
      const r = newline(v, a, lang);
      edit(a, b, r.text, r.caret);
      return;
    }
    if (e.key === 'Backspace' && a === b && a > 0) {
      const pair = PAIRS[v[a - 1]];
      if (pair && v[a] === pair) { e.preventDefault(); edit(a - 1, a + 1, ''); setSg(null); return; }
      return;
    }
    if (e.key.length !== 1) return;
    const ch = e.key;
    // 선택한 글을 괄호·따옴표로 감싸기
    if (a !== b && ch in PAIRS && !(lang === 'ABAP' && ch === '"')) {
      e.preventDefault();
      const sel = v.slice(a, b);
      edit(a, b, ch + sel + PAIRS[ch], 1, 1 + sel.length);
      return;
    }
    // 이미 있는 닫는 괄호 위로 지나가기
    if (a === b && ')]}"\'`'.includes(ch) && v[a] === ch) {
      e.preventDefault();
      t.setSelectionRange(a + 1, a + 1);
      setSg(null);
      return;
    }
    if (a === b && shouldPair(ch, v, a, lang)) {
      e.preventDefault();
      edit(a, b, ch + PAIRS[ch], 1);
      setSg(null);
      return;
    }
    // <Tag ...> 를 닫으면 </Tag>를 붙여 줘요
    if (a === b && ch === '>' && (lang === 'XML' || lang === 'HTML')) {
      const line = v.slice(v.lastIndexOf('\n', a - 1) + 1, a);
      const m = /<([\w:.-]+)(?:[^<>"']|"[^"]*"|'[^']*')*$/.exec(line);
      const voidTag = lang === 'HTML' && m && /^(img|input|br|meta|link|hr|source)$/i.test(m[1]);
      if (m && !line.endsWith('/') && !voidTag && !v.startsWith(`</${m[1]}>`, a)) {
        e.preventDefault();
        edit(a, b, `></${m[1]}>`, 1);
        setSg(null);
      }
    }
  };

  // 목록 위치: 낱말 첫 글자 바로 아래 (아래 자리가 없으면 위로)
  let pop: React.CSSProperties | undefined;
  if (sg && taRef.current && mainRef.current) {
    const t = taRef.current;
    const before = value.slice(0, sg.from);
    const row = (before.match(/\n/g) ?? []).length;
    const col = sg.from - (before.lastIndexOf('\n') + 1);
    const mainW = mainRef.current.clientWidth;
    const w = Math.min(340, mainW + 40);
    const left = Math.max(-40, Math.min(PAD_LEFT + col * cw - t.scrollLeft - 26, mainW - w));
    const top = PAD_TOP + (row + 1) * LINE_H - t.scrollTop;
    const h = Math.min(sg.items.length, 8) * 28 + 30;
    const screenTop = mainRef.current.getBoundingClientRect().top + top;
    const up = screenTop + h > window.innerHeight - 100 && screenTop - LINE_H - h > 60;
    pop = { left, width: w, ...(up ? { top: top - LINE_H - h - 2 } : { top: top + 2 }) };
  }

  return (
    <div className="editor">
      <div className="ed-bar">
        <span className="ed-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="ed-info">{value ? `${lines.length}줄` : '비어 있어요'}</span>
        <span className="ed-sp" />
        <button type="button" className="ed-act" onClick={async () => {
          try {
            const t = await navigator.clipboard.readText();
            if (t) { onChange(t); document.getElementById(id)?.focus(); } else onToast?.('클립보드가 비어 있어요');
          } catch { document.getElementById(id)?.focus(); onToast?.('Ctrl/⌘ + V로 붙여넣어 주세요'); }
        }}><Icon name="paste" />붙여넣기</button>
        {value && <button type="button" className="ed-act" onClick={() => { onChange(''); setSg(null); document.getElementById(id)?.focus(); }}><Icon name="trash" />지우기</button>}
      </div>
      {!value && tpls.length > 0 && (
        <div className="ed-tpl">
          <span className="ed-tpl-h">기본 코드</span>
          {tpls.map((tp) => <button key={tp.id} type="button" className="ed-chip" title={`${tp.from}에서 만들어 주는 코드`} onClick={() => pickTemplate(tp)}>{tp.label}</button>)}
        </div>
      )}
      <div className="ed-body" style={{ ['--ed-h' as string]: `${Math.min(560, Math.max(200, lines.length * 22.1 + 48))}px` }}>
        <div className="ed-gutter" ref={gutterRef} aria-hidden="true">
          {lines.map((_, i) => { const p = bad.get(i + 1); return <div key={i} className={p ? `g-${p.sev}` : ''}>{i + 1}</div>; })}
        </div>
        <div className="ed-main" ref={mainRef}>
          <span className="ed-meas" ref={measRef} aria-hidden="true">00000000000000000000</span>
          <pre className="ed-hl" ref={preRef} aria-hidden="true"><code dangerouslySetInnerHTML={{ __html: html }} /></pre>
          <textarea
            id={id}
            ref={taRef}
            className="ed-input"
            value={value}
            placeholder={placeholder}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            wrap="off"
            maxLength={50000}
            role="combobox"
            aria-expanded={Boolean(sg)}
            aria-controls={`${id}-sg`}
            aria-autocomplete="list"
            aria-activedescendant={sg ? `${id}-sg-${sg.i}` : undefined}
            onChange={(e) => {
              const t = e.currentTarget;
              onChange(t.value);
              if (mute.current) return;
              const it = (e.nativeEvent as InputEvent).inputType;
              if (it === 'insertText' || (it === 'deleteContentBackward' && sg)) open(t.value, t.selectionStart);
              else setSg(null);
            }}
            onScroll={(e) => { sync(e.currentTarget); if (sg) setScroll((n) => n + 1); }}
            onKeyDown={onKeyDown}
            onMouseDown={() => setSg(null)}
            onBlur={() => setSg(null)}
          />
          {sg && <SuggestList id={`${id}-sg`} items={sg.items} index={sg.i} prefix={sg.prefix} style={pop} onIndex={(i) => setSg({ ...sg, i })} onPick={accept} />}
        </div>
      </div>
    </div>
  );
}
