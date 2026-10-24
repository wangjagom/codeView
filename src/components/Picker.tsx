import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

export interface PickOption<T extends string> { value: T; label: string; hint?: string; count?: number; icon?: ReactNode; disabled?: boolean }

/**
 * 버튼 바로 아래 뜨는 작은 선택 메뉴 (기본 select 대신 써요).
 * 메뉴는 body에 띄워서 카드·코드 영역의 overflow에 잘리지 않고, 아래 자리가 모자라면 위로 열려요.
 * 바깥을 누르거나 Esc면 닫히고, 화살표·Home/End·Enter로도 골라요.
 * variant: pill(목록 위 작은 버튼) · soft(흰 카드 안) · field(입력칸과 같은 크기) · mini(코드 제안 머리글)
 */
export function Picker<T extends string>({ value, options, onChange, label, title, id, variant = 'pill', align = 'right', className = '' }: {
  value: T; options: PickOption<T>[]; onChange: (v: T) => void; label: string; title?: string; id?: string;
  variant?: 'pill' | 'soft' | 'field' | 'mini'; align?: 'left' | 'right'; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<CSSProperties | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const below = vh - r.bottom - 12, above = r.top - 12;
    const up = below < 220 && above > below;
    const p: CSSProperties = { maxHeight: Math.min(360, (up ? above : below) - 6), minWidth: variant === 'field' ? r.width : undefined };
    if (up) p.bottom = vh - r.top + 6; else p.top = r.bottom + 6;
    if (align === 'left' || variant === 'field') p.left = Math.max(16, Math.min(r.left, vw - 216));
    else p.right = Math.max(16, vw - r.right);
    p.transformOrigin = `${up ? 'bottom' : 'top'} ${p.left !== undefined ? 'left' : 'right'}`;
    setPos(p);
  }, [align, variant]);

  useLayoutEffect(() => { if (open) place(); }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!btn.current?.contains(t) && !list.current?.contains(t)) setOpen(false);
    };
    const onMove = () => place();
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    requestAnimationFrame(() => {
      const on = list.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]') ?? list.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
      on?.focus({ preventScroll: true }); on?.scrollIntoView({ block: 'nearest' });
    });
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open, place]);

  const close = () => { setOpen(false); btn.current?.focus(); };
  const move = (to: number | 'first' | 'last') => {
    const btns = [...(list.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
    const i = btns.indexOf(document.activeElement as HTMLButtonElement);
    const j = to === 'first' ? 0 : to === 'last' ? btns.length - 1 : (i + to + btns.length) % btns.length;
    btns[j]?.focus();
  };

  return (
    <span className={`pk pk-${variant} ${className}`}>
      <button type="button" id={id} ref={btn} className="pk-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${current?.label ?? ''}`}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !open) { e.preventDefault(); setOpen(true); } }}>
        {current?.icon}<span className="pk-v">{current?.label}</span><Icon name="down" />
      </button>
      {open && pos && createPortal(
        <div className={`pk-pop pk-pop-${variant}`} role="listbox" aria-label={label} ref={list} style={pos}
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
            <button key={o.value} type="button" role="option" aria-selected={o.value === value} disabled={o.disabled}
              onClick={() => { close(); if (o.value !== value) onChange(o.value); }}>
              {o.icon}
              <span className="pk-l"><span className="pk-t">{o.label}</span>{o.hint && <span className="pk-hint">{o.hint}</span>}</span>
              {o.count !== undefined && <span className="pk-n">{o.count}</span>}
              <span className="pk-ck">{o.value === value && <Icon name="check" />}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </span>
  );
}
