import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { fuzzy } from '../lib/complete';
const KIND_ICON = { tpl: '▤', snip: '{}', kw: 'K', tag: '<>', attr: '=', prop: '#', val: 'v', fn: 'ƒ', cls: 'C', mod: 'N', word: 'ab' };
const KIND_NAME = { tpl: '기본 코드', snip: '스니펫', kw: '키워드', tag: '태그', attr: '속성', prop: '속성', val: '값', fn: '메서드', cls: '클래스', mod: '네임스페이스', word: '' };
/** VS Code 자동완성 목록 모양. 코드 입력칸과 리뷰 댓글에서 같이 써요. */
export function SuggestList({ id, items, index, prefix, style, onIndex, onPick }) {
    const listRef = useRef(null);
    useEffect(() => { listRef.current?.children[index]?.scrollIntoView({ block: 'nearest' }); }, [index, items]);
    return (_jsxs("div", { className: "sg", style: style, onPointerDown: (e) => e.preventDefault(), children: [_jsx("ul", { id: id, role: "listbox", ref: listRef, "aria-label": "\uC790\uB3D9\uC644\uC131", children: items.map((it, i) => (_jsxs("li", { id: `${id}-${i}`, role: "option", "aria-selected": i === index, className: i === index ? 'on' : '', onMouseMove: () => { if (index !== i)
                        onIndex(i); }, onClick: () => onPick(it), children: [_jsx("span", { className: `sg-ic k-${it.kind}`, "aria-hidden": "true", children: KIND_ICON[it.kind] }), _jsx("span", { className: "sg-l", children: marked(it.label, prefix) }), _jsx("span", { className: "sg-d", children: it.detail ?? KIND_NAME[it.kind] })] }, it.kind + it.label))) }), _jsx("div", { className: "sg-foot", children: "Tab\u00B7Enter \uB123\uAE30 \u00B7 \u2191\u2193 \uACE0\uB974\uAE30 \u00B7 Esc \uB2EB\uAE30" })] }));
}
/** 친 글자와 맞는 부분을 파랗게 */
function marked(label, prefix) {
    const hit = new Set(label.toLowerCase().startsWith(prefix.toLowerCase()) ? [...prefix].map((_, i) => i) : fuzzy(label, prefix) ?? []);
    if (!hit.size)
        return label;
    return [...label].map((c, i) => (hit.has(i) ? _jsx("b", { children: c }, i) : c));
}
/** 바꾼 글을 브라우저 입력처럼 넣어서 되돌리기(Ctrl+Z)가 되게 해요. sel은 넣은 글 안에서의 커서 위치예요. */
export function insertText(t, from, to, text, sel0 = text.length, sel1 = sel0, fallback) {
    t.focus();
    t.setSelectionRange(from, to);
    let ok = false;
    try {
        ok = text ? document.execCommand('insertText', false, text) : document.execCommand('delete');
    }
    catch {
        ok = false;
    }
    if (!ok || t.value.slice(from, from + text.length) !== text) {
        t.setRangeText(text, from, to, 'end');
        if (fallback)
            fallback(t.value);
        else
            t.dispatchEvent(new Event('input', { bubbles: true }));
    }
    t.setSelectionRange(from + sel0, from + sel1);
}
