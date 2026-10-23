import { useMemo, useRef } from 'react';
import type { Problem } from '../lib/checks';
import { highlight, highlightWithMark } from '../lib/highlight';
import { Icon } from './Icon';

interface Props {
  id: string;
  value: string;
  lang: string;
  problems: Problem[];
  placeholder?: string;
  onChange: (v: string) => void;
  onToast?: (msg: string) => void;
}

/**
 * VS Code(Dark Modern)처럼 보이는 코드 입력칸.
 * 투명한 textarea 뒤에 같은 글자를 색칠한 <pre>를 깔아서, 입력은 그대로 되고 색만 보여요.
 */
export function CodeEditor({ id, value, lang, problems, placeholder, onChange, onToast }: Props) {
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const lines = useMemo(() => value.split('\n'), [value]);
  const bad = useMemo(() => new Map(problems.map((p) => [p.line, p])), [problems]);

  const html = useMemo(() => lines.map((l, i) => {
    const p = bad.get(i + 1);
    return p ? highlightWithMark(l, p.match, p.sev, lang) : highlight(l, lang);
  }).join('\n') + '\n', [lines, bad, lang]);

  const sync = (t: HTMLTextAreaElement) => {
    if (preRef.current) { preRef.current.scrollTop = t.scrollTop; preRef.current.scrollLeft = t.scrollLeft; }
    if (gutterRef.current) gutterRef.current.scrollTop = t.scrollTop;
  };

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
          } catch { document.getElementById(id)?.focus(); onToast?.('여기를 길게 누르거나 Ctrl/⌘ + V로 붙여넣어 주세요'); }
        }}><Icon name="paste" />붙여넣기</button>
        {value && <button type="button" className="ed-act" onClick={() => { onChange(''); document.getElementById(id)?.focus(); }}><Icon name="trash" />지우기</button>}
      </div>
      <div className="ed-body" style={{ ['--ed-h' as string]: `${Math.min(560, Math.max(200, lines.length * 22.1 + 48))}px` }}>
        <div className="ed-gutter" ref={gutterRef} aria-hidden="true">
          {lines.map((_, i) => { const p = bad.get(i + 1); return <div key={i} className={p ? `g-${p.sev}` : ''}>{i + 1}</div>; })}
        </div>
        <div className="ed-main">
          <pre className="ed-hl" ref={preRef} aria-hidden="true"><code dangerouslySetInnerHTML={{ __html: html }} /></pre>
          <textarea
            id={id}
            className="ed-input"
            value={value}
            placeholder={placeholder}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            wrap="off"
            maxLength={50000}
            onChange={(e) => onChange(e.target.value)}
            onScroll={(e) => sync(e.currentTarget)}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                const t = e.currentTarget;
                t.setRangeText('  ', t.selectionStart, t.selectionEnd, 'end');
                onChange(t.value);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
