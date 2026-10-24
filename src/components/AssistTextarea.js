import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { caseFor, codeSpotAt, expand, suggest } from '../lib/complete';
import { SuggestList, insertText } from './SuggestList';
import { langFromTag } from './RichText';
let seq = 0;
/** 리뷰 댓글처럼 글과 코드가 섞인 칸. 커서가 코드 안에 있으면 그 언어로 자동완성을 띄워요. */
export function AssistTextarea({ lang, mode = 'comment', areaRef, context = '', onChange, onKeyDown, onBlur, ...rest }) {
    const ref = useRef(null);
    const idRef = useRef(`as${++seq}`);
    const [sg, setSg] = useState(null);
    const mute = useRef(false);
    const open = (t, force = false) => {
        const pos = t.selectionStart;
        const spot = mode === 'code' ? { lang, start: 0, code: t.value, inline: false } : codeSpotAt(t.value, pos, lang, langFromTag);
        if (!spot) {
            setSg(null);
            return;
        }
        // 리뷰하는 코드를 앞에 붙여서, 거기 나온 이름들도 후보가 되게 해요.
        const pre = context && spot.lang === lang ? `${context}\n` : '';
        const r0 = suggest(pre + spot.code, pre.length + pos - spot.start, spot.lang, force, '', false);
        const r = r0 && { ...r0, from: r0.from - pre.length };
        const items = r?.items.filter((it) => !spot.inline || !it.insert.includes('\n'));
        if (!r || !items?.length) {
            setSg(null);
            return;
        }
        const from = r.from + spot.start;
        setSg({ ...r, items, from, i: 0, lang: spot.lang, style: popupStyle(t, from, Math.min(items.length, 8) * 28 + 30) });
    };
    const accept = (it) => {
        const t = ref.current;
        if (!t || !sg)
            return;
        const ls = t.value.lastIndexOf('\n', sg.from - 1) + 1;
        const indent = /^[ \t]*/.exec(t.value.slice(ls, sg.from))[0];
        const x = expand(it.insert, indent, caseFor(sg.lang, sg.prefix, it));
        const to = t.selectionStart;
        setSg(null);
        mute.current = true;
        try {
            insertText(t, sg.from, to, x.text, x.start, x.end);
        }
        finally {
            mute.current = false;
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx("textarea", { ...rest, ref: (el) => { ref.current = el; if (areaRef)
                    areaRef.current = el; }, role: rest.role ?? 'combobox', "aria-expanded": Boolean(sg), "aria-autocomplete": "list", "aria-controls": `${idRef.current}-sg`, "aria-activedescendant": sg ? `${idRef.current}-sg-${sg.i}` : undefined, onChange: (e) => {
                    onChange?.(e);
                    if (mute.current)
                        return;
                    const it = e.nativeEvent.inputType;
                    if (it === 'insertText' || (it === 'deleteContentBackward' && sg))
                        open(e.currentTarget);
                    else
                        setSg(null);
                }, onKeyDown: (e) => {
                    if (!e.nativeEvent.isComposing) {
                        if (sg && !e.ctrlKey && !e.metaKey && !e.altKey) {
                            const n = sg.items.length;
                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setSg({ ...sg, i: (sg.i + 1) % n });
                                return;
                            }
                            if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setSg({ ...sg, i: (sg.i - 1 + n) % n });
                                return;
                            }
                            if (e.key === 'Enter' || e.key === 'Tab') {
                                e.preventDefault();
                                accept(sg.items[sg.i]);
                                return;
                            }
                            if (e.key === 'Escape') {
                                e.preventDefault();
                                e.stopPropagation();
                                setSg(null);
                                return;
                            }
                            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key))
                                setSg(null);
                        }
                        if ((e.ctrlKey || e.metaKey) && (e.key === ' ' || e.code === 'Space')) {
                            e.preventDefault();
                            open(e.currentTarget, true);
                            return;
                        }
                    }
                    onKeyDown?.(e);
                }, onBlur: (e) => { setSg(null); onBlur?.(e); }, onMouseDown: () => setSg(null), onScroll: () => sg && setSg(null) }), sg && _jsx(SuggestList, { id: `${idRef.current}-sg`, items: sg.items, index: sg.i, prefix: sg.prefix, style: sg.style, onIndex: (i) => setSg({ ...sg, i }), onPick: accept })] }));
}
/** 글자 위치(pos)의 화면 좌표를 거울 div로 재서, 목록을 그 아래(자리가 없으면 위)에 띄워요. */
function popupStyle(t, pos, h) {
    const cs = getComputedStyle(t);
    const div = document.createElement('div');
    const keys = ['boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth',
        'borderLeftWidth', 'borderStyle', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight', 'textTransform', 'wordSpacing', 'tabSize', 'whiteSpace'];
    for (const k of keys)
        div.style[k] = cs[k];
    Object.assign(div.style, { position: 'absolute', visibility: 'hidden', top: '0', left: '-9999px', overflowWrap: 'break-word', wordBreak: cs.wordBreak });
    div.textContent = t.value.slice(0, pos);
    const span = document.createElement('span');
    span.textContent = t.value.slice(pos) || '.';
    div.appendChild(span);
    document.body.appendChild(div);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
    const x = span.offsetLeft, y = span.offsetTop;
    div.remove();
    const r = t.getBoundingClientRect();
    const w = Math.min(340, window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left + x - t.scrollLeft - 26, window.innerWidth - w - 8));
    const lineTop = r.top + y - t.scrollTop;
    const below = lineTop + lh + 2;
    const top = below + h > window.innerHeight - 8 && lineTop - h - 2 > 8 ? lineTop - h - 2 : below;
    return { position: 'fixed', left, top, width: w };
}
