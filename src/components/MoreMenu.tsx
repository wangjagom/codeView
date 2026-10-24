import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

export interface MenuItem { label: string; icon: string; hint?: string; onSelect: () => void }

/** ⋯ 더보기: 자주 안 쓰는 동작을 접어 두는 작은 메뉴. 바깥을 누르거나 Esc면 닫혀요. */
export function MoreMenu({ items, label = '더보기' }: { items: MenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    requestAnimationFrame(() => list.current?.querySelector<HTMLButtonElement>('button')?.focus());
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const move = (d: number) => {
    const btns = [...(list.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    const i = btns.indexOf(document.activeElement as HTMLButtonElement);
    btns[(i + d + btns.length) % btns.length]?.focus();
  };

  return (
    <span className="more" ref={wrap}>
      <button type="button" className="act-btn more-btn" aria-haspopup="menu" aria-expanded={open} aria-label={label} title={label} onClick={() => setOpen(!open)}>
        <Icon name="more" />
      </button>
      {open && (
        <div className="menu" role="menu" ref={list}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); setOpen(false); wrap.current?.querySelector<HTMLButtonElement>('.more-btn')?.focus(); }
            if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
            if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
          }}>
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" onClick={() => { setOpen(false); it.onSelect(); }}>
              <Icon name={it.icon} /><span className="menu-l">{it.label}</span>{it.hint && <span className="menu-h">{it.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
