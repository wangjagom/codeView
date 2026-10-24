import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
/** 움직임 줄이기 설정이면 JS 애니메이션도 건너뛰어요. (CSS 쪽은 styles.css에서 꺼요) */
export const reducedMotion = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
const EASE = 'cubic-bezier(.2, .8, .2, 1)';
/** 기다리는 동안 보여 주는 점 세 개 (…) */
export function Dots() {
    return _jsxs("span", { className: "dots", "aria-hidden": "true", children: [_jsx("i", {}), _jsx("i", {}), _jsx("i", {})] });
}
/** "불러오는 중" + 움직이는 점 */
export function Loading({ text = '불러오는 중', className = '' }) {
    return _jsxs("span", { className: `loading ${className}`, role: "status", children: [text, _jsx(Dots, {})] });
}
/**
 * 열고 닫을 때 높이가 부드럽게 늘고 줄어요. 아래 내용도 같이 자연스럽게 밀려요.
 * 닫힐 때는 애니메이션이 끝난 뒤에 내용을 없애요.
 */
export function Expand({ open, children, className = '' }) {
    const [shown, setShown] = useState(open);
    const ref = useRef(null);
    const anim = useRef(null);
    const mounted = useRef(false);
    useEffect(() => { if (open)
        setShown(true); }, [open]);
    useLayoutEffect(() => {
        const el = ref.current;
        // 처음부터 열려 있던 건 (화면을 열 때) 움직이지 않아요. 열고 닫을 때만 움직여요.
        if (!mounted.current) {
            mounted.current = true;
            if (el)
                return;
        }
        if (!el)
            return;
        const from = el.getBoundingClientRect().height; // 열리거나 닫히는 중이면 지금 높이에서 이어가요
        anim.current?.cancel();
        el.style.height = '';
        el.style.opacity = '';
        if (reducedMotion() || !el.animate) {
            if (!open)
                setShown(false);
            return;
        }
        el.style.overflow = 'hidden';
        const frames = open
            ? [{ height: `${anim.current ? from : 0}px`, opacity: anim.current ? 1 : 0 }, { height: `${el.scrollHeight}px`, opacity: 1 }]
            : [{ height: `${from}px`, opacity: 1 }, { height: '0px', opacity: 0 }];
        const a = el.animate(frames, { duration: open ? 220 : 170, easing: open ? EASE : 'ease-in' });
        anim.current = a;
        a.onfinish = () => {
            anim.current = null;
            if (open) {
                el.style.overflow = '';
                return;
            }
            // 끝난 뒤 한 프레임이라도 원래 높이로 돌아가면 깜빡여요. 접힌 채로 두고 내용을 없애요.
            el.style.height = '0px';
            el.style.opacity = '0';
            setShown(false);
        };
    }, [open, shown]);
    if (!shown)
        return null;
    return _jsx("div", { ref: ref, className: `expand ${className}`, children: children });
}
/**
 * 목록 순서나 위치가 바뀌면 (필터 바꾸기, 항목 추가·삭제) 남아 있는 항목이 새 자리로 미끄러져 가요.
 * 움직일 항목에 data-flip="고유값"을 붙여요.
 */
export function useFlip() {
    const ref = useRef(null);
    const prev = useRef(new Map());
    useLayoutEffect(() => {
        const root = ref.current;
        if (!root)
            return;
        const next = new Map();
        const skip = reducedMotion();
        for (const el of root.querySelectorAll('[data-flip]')) {
            const key = el.dataset.flip;
            const pos = { top: el.offsetTop, left: el.offsetLeft };
            next.set(key, pos);
            const was = prev.current.get(key);
            if (!was || skip || !el.animate)
                continue;
            const dx = was.left - pos.left, dy = was.top - pos.top;
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 240, easing: EASE });
            }
        }
        prev.current = next;
    });
    return ref;
}
