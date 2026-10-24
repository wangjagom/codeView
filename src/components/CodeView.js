import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from 'react';
import { highlight, highlightWithMark } from '../lib/highlight';
import { fenceOf } from '../lib/langs';
import { timeAgo } from '../lib/util';
import { Avatar } from './Avatar';
import { RichText } from './RichText';
import { AssistTextarea } from './AssistTextarea';
import { Icon } from './Icon';
import { Expand } from './Motion';
const langFence = (id) => (id === 'CDS' ? 'cds' : id === 'SQLScript' ? 'sql' : fenceOf(id));
export function CodeView({ code, lang, problems, threads, person, isAuthor, readOnly, onComment, onResolve, onApply, meId, onEdit, onDelete }) {
    const lines = useMemo(() => code.split('\n'), [code]);
    const [composer, setComposer] = useState(null);
    // 줄 번호가 코드 길이를 넘는 스레드는 마지막 줄에 붙여요.
    const byLine = useMemo(() => {
        const m = new Map();
        for (const t of threads) {
            const ln = Math.min(Math.max(1, t.line), lines.length);
            m.set(ln, [...(m.get(ln) ?? []), t]);
        }
        return m;
    }, [threads, lines.length]);
    return (_jsx("div", { className: "rows dm", "data-lang": lang, "data-code-all": "row", children: lines.map((text, i) => {
            const ln = i + 1;
            const prob = problems.find((p) => p.line === ln);
            const ts = byLine.get(ln) ?? [];
            const count = ts.reduce((n, t) => n + t.comments.length, 0);
            const html = prob ? highlightWithMark(text, prob.match, prob.sev, lang) : highlight(text, lang);
            return (_jsxs("div", { children: [_jsxs("div", { className: `row ${prob ? prob.sev : ''}`, id: `L${ln}`, children: [_jsx("div", { className: "gut", children: !readOnly && (_jsx("button", { type: "button", className: count ? 'cnt' : '', "aria-label": count ? `${ln}번째 줄 리뷰 ${count}개, 리뷰 추가` : `${ln}번째 줄에 리뷰 남기기`, onClick: () => setComposer(composer === ln ? null : ln), children: count || '+' })) }), readOnly ? _jsx("div", { className: "num", children: ln })
                                : _jsx("button", { type: "button", className: "num", tabIndex: -1, "aria-hidden": "true", onClick: () => setComposer(composer === ln ? null : ln), children: ln }), _jsx("div", { className: "txt", "data-code": "row", dangerouslySetInnerHTML: { __html: html || ' ' } })] }), _jsxs("div", { className: "inl", children: [prob && (_jsxs("div", { className: `prob ${prob.sev}`, children: [_jsx("span", { className: "ic", children: prob.sev === 'e' ? '오류' : '경고' }), _jsxs("div", { children: [_jsx("b", { children: prob.title }), _jsx("br", {}), prob.easy] }), _jsx("small", { children: prob.rule })] })), ts.map((t) => (_jsx(ThreadBox, { thread: t, lines: lines, lang: lang, person: person, isAuthor: isAuthor, readOnly: readOnly, onReply: (body) => onComment?.(t.line, body, null, t.id) ?? Promise.resolve(false), onResolve: onResolve, onApply: onApply, meId: meId, onEdit: onEdit, onDelete: onDelete }, t.id))), onComment && (_jsx(Expand, { open: composer === ln, children: _jsx(Composer, { line: ln, lines: lines, lang: lang, onCancel: () => setComposer(null), onSubmit: async (body, s) => { const ok = await onComment(ln, body, s, ts.find((t) => !t.resolved)?.id); if (ok)
                                        setComposer(null); return ok; } }) }))] })] }, ln));
        }) }));
}
function suggestionState(s, lines) {
    for (let i = 0; i < s.count; i++)
        if (lines[s.from - 1 + i] !== s.original[i])
            return 'stale';
    return 'ok';
}
function ThreadBox({ thread, lines, lang, person, isAuthor, readOnly, onReply, onResolve, onApply, meId, onEdit, onDelete }) {
    const [reply, setReply] = useState('');
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState(null);
    const [draft, setDraft] = useState('');
    const [confirmDel, setConfirmDel] = useState(null);
    const saveEdit = async (id) => {
        const v = draft.trim();
        if (!v || busy)
            return;
        setBusy(true);
        const ok = await onEdit?.(id, v);
        setBusy(false);
        if (ok)
            setEditing(null);
    };
    return (_jsxs("div", { className: `thread ${thread.resolved ? 'resolved' : ''}`, children: [thread.comments.map((c) => {
                const who = person(c.author_id);
                const s = c.suggestion;
                const state = s && !c.applied_at ? suggestionState(s, lines) : null;
                const mine = !readOnly && Boolean(meId) && c.author_id === meId && Boolean(onEdit);
                return (_jsxs("div", { className: "cm", children: [_jsx(Avatar, { person: who }), _jsxs("div", { style: { minWidth: 0 }, children: [_jsxs("div", { className: "cm-h", children: [_jsx("b", { children: who.name }), _jsx("time", { dateTime: c.created_at, children: timeAgo(c.created_at) }), c.edited_at && _jsx("span", { className: "edited", title: new Date(c.edited_at).toLocaleString(), children: "\uC218\uC815\uB428" }), mine && editing !== c.id && confirmDel !== c.id && (_jsxs("span", { className: "cm-acts", children: [_jsx("button", { type: "button", className: "txt-btn", onClick: () => { setEditing(c.id); setDraft(c.body); setConfirmDel(null); }, children: "\uC218\uC815" }), _jsx("button", { type: "button", className: "txt-btn", onClick: () => { setConfirmDel(c.id); setEditing(null); }, children: "\uC0AD\uC81C" })] }))] }), _jsx(Expand, { open: confirmDel === c.id, children: _jsxs("div", { className: "cm-del", children: [_jsx("span", { children: thread.comments.length === 1 ? '이 리뷰를 지울까요? 대화도 같이 없어져요.' : '이 리뷰를 지울까요?' }), _jsx("button", { type: "button", className: "btn sm", onClick: () => setConfirmDel(null), children: "\uCDE8\uC18C" }), _jsx("button", { type: "button", className: "btn sm danger-btn", disabled: busy, onClick: async () => { setBusy(true); const ok = await onDelete?.(c.id); setBusy(false); if (ok)
                                                    setConfirmDel(null); }, children: "\uC0AD\uC81C" })] }) }), editing === c.id ? (_jsxs("form", { className: "cm-edit", onSubmit: (e) => { e.preventDefault(); saveEdit(c.id); }, children: [_jsx(AssistTextarea, { lang: lang, context: lines.join('\n'), autoFocus: true, value: draft, maxLength: 5000, "aria-label": "\uB9AC\uBDF0 \uACE0\uCE58\uAE30", rows: Math.min(10, Math.max(2, draft.split('\n').length)), onChange: (e) => setDraft(e.target.value), onKeyDown: (e) => {
                                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                    e.preventDefault();
                                                    saveEdit(c.id);
                                                }
                                                if (e.key === 'Escape') {
                                                    e.preventDefault();
                                                    setEditing(null);
                                                }
                                            } }), _jsx(Expand, { open: /`/.test(draft), children: _jsxs("div", { className: "preview cm-text", children: [_jsx("span", { className: "preview-h", children: "\uBBF8\uB9AC\uBCF4\uAE30" }), _jsx(RichText, { text: draft, lang: lang })] }) }), _jsxs("div", { className: "row-a", children: [s && _jsx("span", { className: "hint", children: "\uC218\uC815 \uC81C\uC548 \uCF54\uB4DC\uB294 \uADF8\uB300\uB85C \uB0A8\uC544\uC694" }), _jsx("button", { type: "button", className: "btn ghost sm", onClick: () => setEditing(null), children: "\uCDE8\uC18C" }), _jsx("button", { className: "btn primary sm", disabled: busy || !draft.trim() || draft.trim() === c.body, children: "\uC800\uC7A5" })] })] })) : _jsx("div", { className: "cm-text", children: _jsx(RichText, { text: c.body, lang: lang }) }), s && (_jsxs("div", { className: "sugg", children: [_jsxs("div", { className: "sugg-h", children: [_jsxs("span", { children: ["\uC218\uC815 \uC81C\uC548 \u00B7 ", s.from, s.count > 1 ? `–${s.from + s.count - 1}` : '', "\uC904"] }), _jsx("span", { className: "sp" }), c.applied_at ? _jsx("span", { className: "applied", children: "\uC801\uC6A9\uB428" })
                                                    : state === 'stale' ? _jsx("span", { children: "\uCF54\uB4DC\uAC00 \uBC14\uB00C\uC5B4 \uC801\uC6A9 \uBD88\uAC00" })
                                                        : isAuthor && !readOnly ? _jsxs("button", { type: "button", className: "btn primary sm with-ic", onClick: () => onApply?.(c.id), children: [_jsx(Icon, { name: "check" }), "\uC81C\uC548 \uC801\uC6A9"] })
                                                            : _jsx("span", { children: "\uC791\uC131\uC790\uB9CC \uC801\uC6A9 \uAC00\uB2A5" })] }), _jsxs("div", { className: "diff dm", "data-lang": lang, "data-code-all": "diff", children: [s.original.map((t, i) => _jsx("div", { className: "d", "data-code": "diff", dangerouslySetInnerHTML: { __html: highlight(t, lang) || ' ' } }, 'd' + i)), s.to.map((t, i) => _jsx("div", { className: "a", "data-code": "diff", dangerouslySetInnerHTML: { __html: highlight(t, lang) || ' ' } }, 'a' + i))] })] }))] })] }, c.id));
            }), readOnly ? null : thread.resolved ? (_jsxs("div", { className: "reply", children: [_jsx("span", { className: "applied", children: "\u2713 \uD574\uACB0\uB41C \uB300\uD654" }), _jsx("span", { className: "sp" }), _jsx("button", { type: "button", className: "act-btn", onClick: () => onResolve?.(thread.id, false), children: "\uB2E4\uC2DC \uC5F4\uAE30" })] })) : (_jsxs("form", { className: "reply", onSubmit: async (e) => {
                    e.preventDefault();
                    const v = reply.trim();
                    if (!v || busy)
                        return;
                    setBusy(true);
                    const ok = await onReply(v);
                    setBusy(false);
                    if (ok)
                        setReply('');
                }, children: [_jsx(AssistTextarea, { lang: lang, context: lines.join('\n'), id: `reply-${thread.id}`, rows: Math.min(8, Math.max(1, reply.split('\n').length)), value: reply, onChange: (e) => setReply(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            e.currentTarget.form?.requestSubmit();
                        } }, placeholder: "\uB2F5\uAE00 \uB2EC\uAE30", "aria-label": "\uB2F5\uAE00", maxLength: 5000 }), _jsxs("button", { className: "btn primary sm with-ic", disabled: busy || !reply.trim(), "aria-label": "\uB2F5\uAE00 \uBCF4\uB0B4\uAE30", children: [_jsx(Icon, { name: "send" }), "\uBCF4\uB0B4\uAE30"] }), _jsxs("button", { type: "button", className: "act-btn ok", onClick: () => onResolve?.(thread.id, true), children: [_jsx(Icon, { name: "check" }), "\uD574\uACB0"] }), _jsx(Expand, { open: /`/.test(reply), className: "full", children: _jsxs("div", { className: "preview cm-text", children: [_jsx("span", { className: "preview-h", children: "\uBBF8\uB9AC\uBCF4\uAE30" }), _jsx(RichText, { text: reply, lang: lang })] }) })] }))] }));
}
function Composer({ line, lines, lang, onCancel, onSubmit }) {
    const [body, setBody] = useState('');
    const [suggest, setSuggest] = useState(false);
    const [count, setCount] = useState(1);
    const max = Math.min(10, lines.length - line + 1);
    const original = lines.slice(line - 1, line - 1 + count);
    const [to, setTo] = useState(original.join('\n'));
    const [busy, setBusy] = useState(false);
    const areaRef = useRef(null);
    /** 고른 글자를 `코드` 또는 ```블록```으로 감싸요. 고른 게 없으면 빈 틀만 넣고 커서를 그 안에 둬요. */
    const wrap = (block) => {
        const t = areaRef.current;
        if (!t)
            return;
        const a = t.selectionStart, b = t.selectionEnd;
        const sel = body.slice(a, b);
        const lead = block && a > 0 && body[a - 1] !== '\n' ? '\n' : '';
        const open = block ? `${lead}\`\`\`${langFence(lang)}\n` : '`';
        const close = block ? '\n```\n' : '`';
        const next = body.slice(0, a) + open + sel + close + body.slice(b);
        setBody(next);
        // 고른 글자가 있으면 닫는 표시 뒤로, 없으면 빈 틀 안으로 커서를 옮겨요.
        const pos = sel ? a + open.length + sel.length + close.length : a + open.length;
        requestAnimationFrame(() => { t.focus(); t.setSelectionRange(pos, pos); });
    };
    const changeCount = (n) => { setCount(n); setTo(lines.slice(line - 1, line - 1 + n).join('\n')); };
    const submit = async () => {
        const v = body.trim();
        if (!v || busy)
            return;
        const s = suggest && to !== original.join('\n') ? { from: line, count, original, to: to.split('\n') } : null;
        setBusy(true);
        await onSubmit(v, s);
        setBusy(false);
    };
    return (_jsxs("form", { className: "composer", onSubmit: (e) => { e.preventDefault(); submit(); }, children: [_jsxs("div", { className: "fmt-bar", role: "group", "aria-label": "\uCF54\uB4DC \uB123\uAE30", children: [_jsxs("button", { type: "button", className: "act-btn sm", onClick: () => wrap(false), children: [_jsx("code", { children: "`" }), "\uD55C \uC904 \uCF54\uB4DC"] }), _jsxs("button", { type: "button", className: "act-btn sm", onClick: () => wrap(true), children: [_jsx("code", { children: "```" }), "\uCF54\uB4DC \uBE14\uB85D"] })] }), _jsx(AssistTextarea, { lang: lang, context: lines.join('\n'), areaRef: areaRef, id: `cmp-${line}`, autoFocus: true, value: body, onChange: (e) => setBody(e.target.value), maxLength: 5000, placeholder: `${line}번째 줄 리뷰`, onKeyDown: (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    submit();
                } } }), _jsx(Expand, { open: /`/.test(body), children: _jsxs("div", { className: "preview cm-text", children: [_jsx("span", { className: "preview-h", children: "\uBBF8\uB9AC\uBCF4\uAE30" }), _jsx(RichText, { text: body, lang: lang })] }) }), _jsxs("label", { className: "sugg-toggle", children: [_jsx("input", { type: "checkbox", checked: suggest, onChange: (e) => setSuggest(e.target.checked) }), " \uACE0\uCE5C \uCF54\uB4DC\uB3C4 \uC81C\uC548\uD558\uAE30"] }), _jsx(Expand, { open: suggest, children: _jsxs("div", { className: "sugg-edit", children: [_jsxs("div", { className: "sugg-h", children: [_jsxs("span", { children: [line, "\uBC88\uC9F8 \uC904\uBD80\uD130"] }), _jsx("select", { value: count, onChange: (e) => changeCount(Number(e.target.value)), "aria-label": "\uBC14\uAFC0 \uC904 \uC218", children: Array.from({ length: max }, (_, i) => _jsxs("option", { value: i + 1, children: [i + 1, "\uC904"] }, i)) }), _jsx("span", { children: "\uBC14\uAFC0 \uCF54\uB4DC" })] }), _jsx(AssistTextarea, { lang: lang, context: lines.join('\n'), mode: "code", className: "mono", value: to, onChange: (e) => setTo(e.target.value), spellCheck: false, "aria-label": "\uC81C\uC548\uD560 \uCF54\uB4DC", rows: Math.max(2, to.split('\n').length) })] }) }), _jsxs("div", { className: "row-a", children: [_jsx("span", { className: "hint", children: "\u2318/Ctrl + Enter\uB85C \uB4F1\uB85D" }), _jsx("button", { type: "button", className: "btn ghost sm", onClick: onCancel, children: "\uCDE8\uC18C" }), _jsx("button", { className: "btn primary sm", disabled: busy || !body.trim(), children: "\uB9AC\uBDF0 \uB0A8\uAE30\uAE30" })] })] }));
}
