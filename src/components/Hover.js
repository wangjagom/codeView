import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { inCommentOrString } from '../lib/complete';
import { findDecl, lookup, wordAt } from '../lib/docs';
import { highlight } from '../lib/highlight';
const sources = new WeakMap();
/** 코드 입력칸처럼 DOM 글자가 아닌 곳은 직접 위치를 계산해 알려 줘요. */
export function registerHoverSource(el, fn) {
    sources.set(el, fn);
    return () => { sources.delete(el); };
}
/** VS Code처럼 코드 위에 마우스를 올리면 설명을 보여 줘요. 앱에 하나만 두면 돼요. */
export function HoverLayer() {
    const [shown, setShown] = useState(null);
    const [pos, setPos] = useState(null);
    const boxRef = useRef(null);
    const shownRef = useRef(false);
    const lastKeyRef = useRef('');
    shownRef.current = Boolean(shown);
    useEffect(() => {
        if (window.matchMedia?.('(hover: none)').matches)
            return; // 휴대폰은 마우스가 없어요
        let raf = 0, showT = 0, hideT = 0;
        let last = null;
        const hide = () => { window.clearTimeout(showT); lastKeyRef.current = ''; setShown(null); };
        const tick = () => {
            raf = 0;
            const e = last;
            if (!e)
                return;
            const target = e.target;
            if (!target || boxRef.current?.contains(target)) {
                window.clearTimeout(hideT);
                return;
            }
            const hit = hitAt(e.clientX, e.clientY, target);
            const info = hit && resolve(hit);
            const key = info ? `${info.lang}|${info.word}|${Math.round(info.top)}|${Math.round(info.left)}` : '';
            if (key === lastKeyRef.current)
                return;
            lastKeyRef.current = key;
            window.clearTimeout(showT);
            if (!info) {
                window.clearTimeout(hideT);
                hideT = window.setTimeout(() => setShown(null), 250);
                return;
            }
            window.clearTimeout(hideT);
            showT = window.setTimeout(() => setShown(info), shownRef.current ? 80 : 450);
        };
        const onMove = (e) => { last = e; if (!raf)
            raf = requestAnimationFrame(tick); };
        const onDown = (e) => { if (!boxRef.current?.contains(e.target))
            hide(); };
        const onKey = () => hide();
        document.addEventListener('mousemove', onMove, { passive: true });
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        window.addEventListener('scroll', hide, { passive: true, capture: true });
        return () => {
            cancelAnimationFrame(raf);
            window.clearTimeout(showT);
            window.clearTimeout(hideT);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', hide, { capture: true });
        };
    }, []);
    useLayoutEffect(() => {
        const b = boxRef.current;
        if (!shown || !b) {
            setPos(null);
            return;
        }
        const w = b.offsetWidth, h = b.offsetHeight;
        const left = Math.max(8, Math.min(shown.left, window.innerWidth - w - 8));
        const top = shown.top - h - 4 >= 8 ? shown.top - h - 4 : shown.bottom + 4;
        setPos({ left, top });
    }, [shown]);
    if (!shown)
        return null;
    const { doc, decl, lang } = shown;
    return (_jsxs("div", { className: "hov", ref: boxRef, role: "tooltip", style: pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0 }, onMouseLeave: () => { lastKeyRef.current = ''; setShown(null); }, children: [doc?.sig && _jsx("pre", { className: "hov-sig dm", children: _jsx("code", { dangerouslySetInnerHTML: { __html: doc.sig.split('\n').map((l) => highlight(l, sigLang(doc.sig, lang))).join('\n') } }) }), _jsxs("div", { className: "hov-b", children: [doc?.title && _jsx("div", { className: "hov-t", children: doc.title }), doc && _jsx("p", { children: doc.text }), decl && (_jsxs("div", { className: "hov-decl", children: [_jsxs("span", { children: [decl.line + 1, "\uBC88\uC9F8 \uC904\uC5D0\uC11C \uC120\uC5B8\uD588\uC5B4\uC694"] }), _jsx("code", { className: "dm", dangerouslySetInnerHTML: { __html: highlight(decl.text, lang) } })] })), doc?.link && _jsx("a", { href: doc.link, target: "_blank", rel: "noreferrer", children: "\uACF5\uC2DD \uBB38\uC11C \uC5F4\uAE30 \u2197" })] })] }));
}
/** 설명 예시가 XML 모양이면 XML 색으로 칠해요. */
const sigLang = (sig, lang) => (/^\s*</.test(sig) ? 'XML' : lang === 'XML' && /^[\w:.-]+="/.test(sig) ? 'XML' : lang === 'XML' ? 'JavaScript' : lang);
function resolve(hit) {
    const w = wordAt(hit.line, hit.col, hit.lang);
    if (!w)
        return null;
    if (hit.lang !== 'JSON' && inCommentOrString(hit.line.slice(0, w.start), hit.lang))
        return null; // 주석·문자열 안
    const doc = lookup(w, hit.lang);
    let decl = findDecl(hit.code, w.word, hit.lang);
    if (decl && decl.line === hit.lineNo)
        decl = null; // 지금 줄이 선언이면 굳이 보여 주지 않아요
    if (!doc && !decl)
        return null;
    const left = hit.rect.left - (hit.col - w.start) * hit.rect.width;
    return { doc, decl, lang: hit.lang, left, top: hit.rect.top, bottom: hit.rect.bottom, word: w.word };
}
/** 보통 코드 화면: 마우스 아래 글자를 브라우저에게 물어봐요. */
function hitAt(x, y, target) {
    for (let el = target; el; el = el.parentElement) {
        const s = sources.get(el);
        if (s)
            return s(x, y);
    }
    const root = target.closest('[data-code]');
    if (!root)
        return null;
    const lang = root.closest('[data-lang]')?.dataset.lang;
    if (!lang)
        return null;
    const cp = caretAt(x, y);
    if (!cp || !(cp.node instanceof Text) || !root.contains(cp.node))
        return null;
    // 글자 위에 정말 마우스가 있는지 (줄 끝 빈 곳이 아닌지) 확인해요.
    let off = cp.offset;
    let rect = charRect(cp.node, off);
    if (!rect || !inside(rect, x, y)) {
        off -= 1;
        rect = charRect(cp.node, off);
    }
    if (!rect || !inside(rect, x, y))
        return null;
    // root 안에서의 위치
    let abs = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n && n !== cp.node; n = walker.nextNode())
        abs += n.data.length;
    abs += off;
    const text = root.textContent ?? '';
    const ls = text.lastIndexOf('\n', abs - 1) + 1;
    const le = text.indexOf('\n', abs);
    const line = text.slice(ls, le < 0 ? text.length : le);
    const innerLine = (text.slice(0, ls).match(/\n/g) ?? []).length;
    // 같은 코드의 다른 줄들 (코드 화면은 줄마다 요소가 따로 있어요)
    const group = root.dataset.code;
    const all = root.closest(`[data-code-all="${group}"]`);
    let code = text, lineNo = innerLine;
    if (all) {
        const parts = [...all.querySelectorAll(`[data-code="${group}"]`)];
        lineNo = parts.indexOf(root);
        code = parts.map((p) => p.textContent ?? '').join('\n');
    }
    return { lang, line, col: abs - ls, code, lineNo, rect: { left: rect.left, top: rect.top, bottom: rect.bottom, width: rect.width || 7 } };
}
function caretAt(x, y) {
    const d = document;
    if (d.caretPositionFromPoint) {
        const p = d.caretPositionFromPoint(x, y);
        return p ? { node: p.offsetNode, offset: p.offset } : null;
    }
    const r = document.caretRangeFromPoint?.(x, y);
    return r ? { node: r.startContainer, offset: r.startOffset } : null;
}
function charRect(node, i) {
    if (i < 0 || i >= node.data.length || node.data[i] === '\n')
        return null;
    const r = document.createRange();
    r.setStart(node, i);
    r.setEnd(node, i + 1);
    const rect = r.getBoundingClientRect();
    return rect.width ? rect : null;
}
const inside = (r, x, y) => x >= r.left - 0.5 && x <= r.right + 0.5 && y >= r.top - 1 && y <= r.bottom + 1;
