import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

export interface PickOption<T extends string> { value: T; label: string; hint?: string; count?: number }

/** 버튼 바로 아래 뜨는 작은 선택 메뉴 (과제·정렬). 바깥을 누르거나 Esc면 닫히고, 화살표·Enter로도 골라요. */
export function Picker<T extends string>({ value, options, onChange, label, title, className = '' }: {
  value: T; options: PickOption<T>[]; onChange: (v: T) => void; label: string; title?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    requestAnimationFrame(() => {
      const on = list.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]') ?? list.current?.querySelector<HTMLButtonElement>('button');
      on?.focus(); on?.scrollIntoView({ block: 'nearest' });
    });
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const close = () => { setOpen(false); wrap.current?.querySelector<HTMLButtonElement>('.pk-btn')?.focus(); };
  const move = (to: number | 'first' | 'last') => {
    const btns = [...(list.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    const i = btns.indexOf(document.activeElement as HTMLButtonElement);
    const j = to === 'first' ? 0 : to === 'last' ? btns.length - 1 : (i + to + btns.length) % btns.length;
    btns[j]?.focus();
  };

  return (
    <span className={`pk ${className}`} ref={wrap}>
      <button type="button" className="pk-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${current.label}`}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !open) { e.preventDefault(); setOpen(true); } }}>
        <span className="pk-v">{current.label}</span><Icon name="down" />
      </button>
      {open && (
        <div className="pk-pop" role="listbox" aria-label={label} ref={list}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); close(); }
            else if (e.key === 'Tab') setOpen(false);
            else if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
            else if (e.key === 'Home') { e.preventDefault(); move('first'); }
            else if (e.key === 'End') { e.preventDefault(); move('last'); }
          }}>
          {title && <div className="pk-h">{title}</div>}
          {options.map((o) => (
            <button key={o.value} type="button" role="option" aria-selected={o.value === value}
              onClick={() => { onChange(o.value); close(); }}>
              <span className="pk-l">{o.label}{o.hint && <span className="pk-hint">{o.hint}</span>}</span>
              {o.count !== undefined && <span className="pk-n">{o.count}</span>}
              <span className="pk-ck">{o.value === value && <Icon name="check" />}</span>
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
