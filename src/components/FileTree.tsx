import { useMemo, useState, type ReactNode } from 'react';
import { folderCount, splitPath, treeRows } from '../lib/tree';
import { Icon } from './Icon';
import { LangIcon } from './LangIcon';
import { Expand } from './Motion';

interface Props {
  files: { name: string; lang: string }[];
  active: number;
  onPick: (i: number) => void;
  /** 파일마다 붙는 숫자 (리뷰 수). 폴더를 접으면 안의 숫자를 더해서 보여 줘요. */
  badge?: (i: number) => number;
  /** 오류·경고 점 */
  dot?: (i: number) => 'e' | 'w' | null;
  /** 파일 줄 끝에 붙일 것 (글 올리기의 빼기 버튼) */
  extra?: (i: number) => ReactNode;
  /** drop: 경로 줄을 눌러 펼치는 트리 (휴대폰·글 올리기), side: 늘 펼친 탐색기 (PC 글 보기) */
  variant: 'drop' | 'side';
  defaultOpen?: boolean;
  className?: string;
}

const untitled = (i: number) => `파일 ${i + 1}`;

/** VS Code 탐색기처럼 폴더 안에 파일을 보여 줘요. 파일 아이콘은 언어별 아이콘(LangIcon)을 써요. */
export function FileTree({ files, active, onPick, badge, dot, extra, variant, defaultOpen = false, className = '' }: Props) {
  const [closed, setClosed] = useState<Set<string>>(() => new Set());
  const [open, setOpen] = useState(defaultOpen);
  const rows = useMemo(() => treeRows(files, closed, untitled), [files, closed]);
  const cur = files[active];
  const { dirs, base } = splitPath(cur?.name ?? '');
  const toggle = (key: string) => setClosed((c) => { const n = new Set(c); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const list = (
    <div className="ft-list" role="tree" aria-label="파일">
      {rows.map((r) => {
        if (r.kind === 'folder') {
          const isOpen = !closed.has(r.key);
          const sum = !isOpen && badge ? r.inside.reduce((k, i) => k + badge(i), 0) : 0;
          return (
            <div key={`d:${r.key}`} className="ft-row folder" role="treeitem" aria-expanded={isOpen} style={{ ['--d' as string]: r.depth }}>
              <button type="button" className="ft-btn" onClick={() => toggle(r.key)}>
                <Icon name="chev" className={`ft-chev ${isOpen ? 'open' : ''}`} />
                <Icon name="folder" className="ft-folder" />
                <span className="ft-name">{r.label}</span>
                <span className="sp" />
                {sum > 0 ? <span className="ftab-n" aria-label={`리뷰 ${sum}개`}>{sum}</span> : <span className="ft-count">{r.inside.length}</span>}
              </button>
            </div>
          );
        }
        const i = r.index;
        const n = badge?.(i) ?? 0;
        const d = dot?.(i);
        return (
          <div key={`f:${r.key}`} className={`ft-row file ${i === active ? 'on' : ''}`} role="treeitem" aria-selected={i === active} style={{ ['--d' as string]: r.depth }}>
            <button type="button" className="ft-btn" onClick={() => { onPick(i); if (variant === 'drop') setOpen(false); }}>
              <LangIcon lang={files[i].lang} size={16} />
              <span className="ft-name">{r.label}</span>
              {d && <i className={`ftab-dot ${d}`} aria-label={d === 'e' ? '오류' : '경고'} />}
              <span className="sp" />
              {n > 0 && <span className="ftab-n" aria-label={`리뷰 ${n}개`}>{n}</span>}
            </button>
            {extra?.(i)}
          </div>
        );
      })}
    </div>
  );

  if (variant === 'side') {
    return (
      <nav className={`ft side ${className}`} aria-label="탐색기">
        <div className="ft-head">
          <span>탐색기</span>
          <button type="button" className="ft-collapse" aria-label="폴더 모두 접기" title="폴더 모두 접기"
            onClick={() => setClosed(new Set(rows.filter((r) => r.kind === 'folder' && r.depth === 0).map((r) => r.key)))}><Icon name="collapse" /></button>
        </div>
        {list}
      </nav>
    );
  }

  return (
    <div className={`ft drop ${open ? 'open' : ''} ${className}`}>
      <button type="button" className="ft-crumb" aria-expanded={open} onClick={() => setOpen(!open)}>
        {cur && <LangIcon lang={cur.lang} size={18} />}
        <span className="ft-path">{dirs.length > 0 && <span className="ft-dirs">{dirs.join(' › ')} › </span>}<b>{base || untitled(active)}</b></span>
        <span className="sp" />
        <span className="ft-sum">파일 {files.length} · 폴더 {folderCount(files)}</span>
        <Icon name="down" className={`ft-caret ${open ? 'open' : ''}`} />
      </button>
      <Expand open={open}>{list}</Expand>
    </div>
  );
}
