import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { highlight } from '../lib/highlight';
import { LANGS, langLabel } from '../lib/langs';
const ALIAS = {
    abap: 'ABAP', cds: 'CDS', ddl: 'CDS', sql: 'SQLScript', sqlscript: 'SQLScript', amdp: 'SQLScript', hana: 'SQLScript',
    xml: 'XML', view: 'XML', ui5xml: 'XML', js: 'JavaScript', javascript: 'JavaScript', ui5: 'JavaScript',
    html: 'HTML', css: 'CSS', json: 'JSON', manifest: 'JSON',
};
/** ```abap 처럼 적은 언어 이름을 언어 id로 바꿔요. 모르는 이름이면 글의 언어를 써요. */
export function langFromTag(tag, fallback) {
    const t = tag.trim().toLowerCase();
    if (!t)
        return fallback;
    return ALIAS[t] ?? LANGS.find((l) => l.id.toLowerCase() === t || l.fence === t)?.id ?? fallback;
}
const FENCE = /```([\w-]*)[^\S\n]*\n?([\s\S]*?)(?:```|$)/g;
/**
 * 리뷰 본문 렌더러. `코드`는 한 줄 코드, ```언어 … ```는 여러 줄 코드 블록으로 보여 주고
 * 둘 다 VS Code Dark Modern 색으로 칠해요. 모든 글자는 이스케이프돼요.
 */
export function RichText({ text, lang = 'JavaScript' }) {
    const out = [];
    let last = 0;
    let m;
    let k = 0;
    FENCE.lastIndex = 0;
    while ((m = FENCE.exec(text))) {
        if (m.index > last)
            out.push(_jsx(Inline, { text: trimEdges(text.slice(last, m.index), last > 0), lang: lang }, k++));
        const blockLang = langFromTag(m[1], lang);
        const code = dedent(m[2].replace(/\n$/, ''));
        out.push(_jsxs("pre", { className: "cm-block dm", "data-lang": blockLang, "aria-label": `${langLabel(blockLang)} 코드`, children: [_jsx("span", { className: "cm-block-h", children: langLabel(blockLang) }), _jsx("code", { "data-code": "block", dangerouslySetInnerHTML: { __html: code.split('\n').map((l) => highlight(l, blockLang)).join('\n') } })] }, k++));
        last = m.index + m[0].length;
        if (!m[0])
            FENCE.lastIndex++;
    }
    if (last < text.length)
        out.push(_jsx(Inline, { text: trimEdges(text.slice(last), last > 0, false), lang: lang }, k++));
    return _jsx(_Fragment, { children: out });
}
/** 코드 블록 바로 앞뒤의 줄바꿈 하나는 빼요. 블록 자체가 줄을 차지하니까요. */
function trimEdges(t, afterBlock, beforeBlock = true) {
    let v = t;
    if (afterBlock)
        v = v.replace(/^\n/, '');
    if (beforeBlock)
        v = v.replace(/\n$/, '');
    return v;
}
/** 모든 줄에 공통으로 붙은 들여쓰기를 빼요. */
function dedent(code) {
    const lines = code.split('\n');
    const pads = lines.filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)[0].length);
    const min = pads.length ? Math.min(...pads) : 0;
    return min ? lines.map((l) => l.slice(min)).join('\n') : code;
}
function Inline({ text, lang }) {
    const parts = text.split(/(`[^`\n]+`)/g);
    return (_jsx("span", { className: "cm-inline", children: parts.map((p, i) => (p.length > 2 && p.startsWith('`') && p.endsWith('`')
            ? _jsx("code", { className: "ic-code dm", "data-lang": lang, "data-code": "inline", dangerouslySetInnerHTML: { __html: highlight(p.slice(1, -1), lang) } }, i)
            : _jsx("span", { children: p }, i))) }));
}
