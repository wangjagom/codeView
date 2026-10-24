import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** 움직임 줄이기 설정이면 JS 애니메이션도 건너뛰어요. (CSS 쪽은 styles.css에서 꺼요) */
export const reducedMotion = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

const EASE = 'cubic-bezier(.2, .8, .2, 1)';

/** 기다리는 동안 보여 주는 점 세 개 (…) */
export function Dots() {
  return <span className="dots" aria-hidden="true"><i /><i /><i /></span>;
}

/** "불러오는 중" + 움직이는 점 */
export function Loading({ text = '불러오는 중', className = '' }: { text?: string; className?: string }) {
  return <span className={`loading ${className}`} role="status">{text}<Dots /></span>;
}

/**
 * 열고 닫을 때 높이가 부드럽게 늘고 줄어요. 아래 내용도 같이 자연스럽게 밀려요.
 * 닫힐 때는 애니메이션이 끝난 뒤에 내용을 없애요.
 */
export function Expand({ open, children, className = '' }: { open: boolean; children: ReactNode; className?: string }) {
  const [shown, setShown] = useState(open);
  const ref = useRef<HTMLDivElement>(null);
  const anim = useRef<Animation | null>(null);
  const mounted = useRef(false);

  useEffect(() => { if (open) setShown(true); }, [open]);

  useLayoutEffect(() => {
    const el = ref.current;
    // 처음부터 열려 있던 건 (화면을 열 때) 움직이지 않아요. 열고 닫을 때만 움직여요.
    if (!mounted.current) { mounted.current = true; if (el) return; }
    if (!el) return;
    anim.current?.cancel();
    if (reducedMotion() || !el.animate) { if (!open) setShown(false); return; }
    const h = el.scrollHeight;
    el.style.overflow = 'hidden';
    const frames = open
      ? [{ height: '0px', opacity: 0 }, { height: `${h}px`, opacity: 1 }]
      : [{ height: `${el.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }];
    const a = el.animate(frames, { duration: open ? 220 : 170, easing: open ? EASE : 'ease-in' });
    anim.current = a;
    a.onfinish = () => {
      el.style.overflow = '';
      if (!open) setShown(false);
    };
  }, [open, shown]);

  if (!shown) return null;
  return <div ref={ref} className={`expand ${className}`}>{children}</div>;
}

/**
 * 목록 순서나 위치가 바뀌면 (필터 바꾸기, 항목 추가·삭제) 남아 있는 항목이 새 자리로 미끄러져 가요.
 * 움직일 항목에 data-flip="고유값"을 붙여요.
 */
export function useFlip<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const prev = useRef(new Map<string, { top: number; left: number }>());
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const next = new Map<string, { top: number; left: number }>();
    const skip = reducedMotion();
    for (const el of root.querySelectorAll<HTMLElement>('[data-flip]')) {
      const key = el.dataset.flip!;
      const pos = { top: el.offsetTop, left: el.offsetLeft };
      next.set(key, pos);
      const was = prev.current.get(key);
      if (!was || skip || !el.animate) continue;
      const dx = was.left - pos.left, dy = was.top - pos.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 240, easing: EASE });
      }
    }
    prev.current = next;
  });
  return ref;
}
