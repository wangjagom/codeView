import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
/** ⋯ 더보기: 자주 안 쓰는 동작을 접어 두는 작은 메뉴. 바깥을 누르거나 Esc면 닫혀요. */
export function MoreMenu({ items, label = '더보기' }) {
    const [open, setOpen] = useState(false);
    const wrap = useRef(null);
    const list = useRef(null);
    useEffect(() => {
        if (!open)
            return;
        const onDown = (e) => { if (!wrap.current?.contains(e.target))
            setOpen(false); };
        document.addEventListener('pointerdown', onDown);
        requestAnimationFrame(() => list.current?.querySelector('button')?.focus());
        return () => document.removeEventListener('pointerdown', onDown);
    }, [open]);
    const move = (d) => {
        const btns = [...(list.current?.querySelectorAll('button') ?? [])];
        const i = btns.indexOf(document.activeElement);
        btns[(i + d + btns.length) % btns.length]?.focus();
    };
    return (_jsxs("span", { className: "more", ref: wrap, children: [_jsx("button", { type: "button", className: "act-btn more-btn", "aria-haspopup": "menu", "aria-expanded": open, "aria-label": label, title: label, onClick: () => setOpen(!open), children: _jsx(Icon, { name: "more" }) }), open && (_jsx("div", { className: "menu", role: "menu", ref: list, onKeyDown: (e) => {
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        setOpen(false);
                        wrap.current?.querySelector('.more-btn')?.focus();
                    }
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        move(1);
                    }
                    if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        move(-1);
                    }
                }, children: items.map((it) => (_jsxs("button", { type: "button", role: "menuitem", onClick: () => { setOpen(false); it.onSelect(); }, children: [_jsx(Icon, { name: it.icon }), _jsx("span", { className: "menu-l", children: it.label }), it.hint && _jsx("span", { className: "menu-h", children: it.hint })] }, it.label))) }))] }));
}
