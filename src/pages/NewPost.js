import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { CodeEditor } from '../components/CodeEditor';
import { BackBar } from '../components/Layout';
import { addTeamTask, createPost, friendlyError, updatePostCode, updatePostMeta } from '../lib/api';
import { checkCode } from '../lib/checks';
import { LANGS, langFromCode, langFromFile } from '../lib/langs';
import { href, navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { Dots, Expand, useFlip } from '../components/Motion';
import { TASK_NAME_MAX, normTask, similarTasks, taskProblem } from '../lib/tasks';
import { TEMPLATE_SETS, templateSetFiles } from '../lib/templates';
import { filesOf } from '../lib/types';
import { lineMapper } from '../lib/diff';
import { LangIcon } from '../components/LangIcon';
const DRAFT_KEY = 'codeview:draft';
const NEW_TASK = '__new_task__';
const MAX_FILES = 10;
let fileSeq = 0;
const newFile = (lang = 'ABAP', patch = {}) => ({ id: `f${Date.now().toString(36)}${fileSeq++}`, name: '', lang, code: '', langAuto: true, ...patch });
function loadDraft() {
    try {
        const s = localStorage.getItem(DRAFT_KEY);
        return s ? JSON.parse(s) : null;
    }
    catch {
        return null;
    }
}
function saveDraft(d) {
    try {
        if (d)
            localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
        else
            localStorage.removeItem(DRAFT_KEY);
    }
    catch { /* 저장 못 해도 괜찮아요 */ }
}
/** 예전(파일 하나) 임시 저장도 그대로 불러와요. */
function draftFiles(d) {
    if (d?.files?.length)
        return d.files.map((f) => ({ ...f, lang: LANGS.some((l) => l.id === f.lang) ? f.lang : 'ABAP' }));
    return [newFile(d?.lang && LANGS.some((l) => l.id === d.lang) ? d.lang : 'ABAP', { name: d?.file ?? '', code: d?.code ?? '', langAuto: !d?.lang })];
}
const sampleOf = (lang) => LANGS.find((l) => l.id === lang)?.sample ?? 'code.txt';
export function NewPost({ edit } = {}) {
    const { me, team, isOwner, profiles, refresh, reloadTeams, toast } = useStore();
    // 고치기는 임시 저장을 쓰지 않고 원래 글로 시작해요.
    const d = edit
        ? { title: edit.post.title, task: edit.post.task, ask: edit.post.ask, kind: edit.post.kind ?? 'review', files: filesOf(edit.post).map((f, i) => newFile(f.lang, { ...f, langAuto: false, orig: i })) }
        : loadDraft();
    const [title, setTitle] = useState(d?.title ?? '');
    const [task, setTask] = useState(d?.task && team.tasks.includes(d.task) ? d.task : edit ? edit.post.task : team.tasks[0] ?? '자유 질문');
    const [ask, setAsk] = useState(d?.ask ?? '');
    const [kind, setKind] = useState(d?.kind === 'share' ? 'share' : 'review');
    const [files, setFiles] = useState(() => draftFiles(d));
    const [active, setActive] = useState(0);
    const [confirmRemove, setConfirmRemove] = useState(null);
    const [picked, setPicked] = useState(edit?.post.reviewer_ids ?? []);
    const [note, setNote] = useState('');
    /** 파일마다 달린 리뷰 수 (고치기에서 파일을 뺄 때 알려 줘요) */
    const reviewsIn = (f) => (edit && f.orig !== undefined ? edit.threads.filter((t) => (t.file ?? 0) === f.orig).reduce((n, t) => n + t.comments.length, 0) : 0);
    const [busy, setBusy] = useState(false);
    const [newTask, setNewTask] = useState(null);
    const [addingTask, setAddingTask] = useState(false);
    const tabsRef = useFlip();
    // 파일이 많아 탭이 옆으로 넘치면 고른 탭이 보이게 옮겨요.
    useEffect(() => { tabsRef.current?.querySelector('.ftab.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [active, tabsRef]);
    const share = kind === 'share';
    const mates = profiles.filter((p) => p.id !== me.id);
    const cur = files[Math.min(active, files.length - 1)];
    const allProblems = useMemo(() => files.map((f) => checkCode(f.code, f.lang)), [files]);
    const problems = allProblems[Math.min(active, files.length - 1)] ?? [];
    const e = problems.filter((p) => p.sev === 'e').length;
    const similar = newTask ? similarTasks(newTask, team.tasks) : [];
    const persist = (patch) => { if (!edit)
        saveDraft({ title, task, ask, kind, files, ...patch }); };
    /** 지금 파일 고치기 */
    const patchFile = (patch) => {
        const next = files.map((f, i) => (i === active ? { ...f, ...patch } : f));
        setFiles(next);
        persist({ files: next });
    };
    const setAllFiles = (next, at = 0) => { setFiles(next); setActive(at); persist({ files: next }); };
    const addFile = () => {
        if (files.length >= MAX_FILES) {
            toast(`파일은 ${MAX_FILES}개까지 올릴 수 있어요`);
            return;
        }
        setAllFiles([...files, newFile(cur.lang)], files.length);
        requestAnimationFrame(() => document.getElementById('nFile')?.focus());
    };
    const removeFile = (i) => {
        const f = files[i];
        if ((f.code.trim() || reviewsIn(f) > 0) && confirmRemove !== f.id) {
            setConfirmRemove(f.id);
            return;
        }
        setConfirmRemove(null);
        const next = files.filter((_, j) => j !== i);
        setAllFiles(next.length ? next : [newFile()], Math.max(0, Math.min(active > i ? active - 1 : active, next.length - 1)));
    };
    const applySet = (setId) => {
        const set = templateSetFiles(setId);
        // 비어 있는 파일은 세트로 바꾸고, 코드가 있는 파일은 그대로 앞에 둬요.
        const kept = files.filter((f) => f.code.trim());
        const room = MAX_FILES - kept.length;
        const taken = new Set(kept.map((f) => f.name.trim().toLowerCase()));
        const added = set.filter((f) => !taken.has(f.name.toLowerCase())).slice(0, room).map((f) => newFile(f.lang, { ...f, langAuto: false }));
        setAllFiles([...kept, ...added], kept.length);
        toast(`${TEMPLATE_SETS.find((s) => s.id === setId)?.label} 파일 ${added.length}개를 넣었어요`);
    };
    const pickTask = (t) => { setTask(t); persist({ task: t }); setNewTask(null); };
    const addTask = async () => {
        const name = (newTask ?? '').trim();
        const p = taskProblem(name, team.tasks);
        // 이미 있는 과제면 그걸 골라요.
        if (p === '이미 있는 과제예요.') {
            pickTask(team.tasks.find((t) => normTask(t) === normTask(name)));
            return;
        }
        if (p) {
            toast(p);
            document.getElementById('nNewTask')?.focus();
            return;
        }
        setAddingTask(true);
        try {
            const list = await addTeamTask(team.id, name, team.tasks, isOwner);
            await reloadTeams(team.id);
            pickTask(list.find((t) => normTask(t) === normTask(name)) ?? name);
            toast(`'${name}' 과제를 추가했어요`);
        }
        catch (err) {
            toast(friendlyError(err));
        }
        setAddingTask(false);
    };
    const submit = async () => {
        if (!title.trim()) {
            toast('제목을 적어 주세요');
            document.getElementById('nTitle')?.focus();
            return;
        }
        // 여러 파일이면 비어 있는 파일·겹치는 이름을 먼저 알려 줘요.
        const ready = files.map((f) => ({ name: f.name.trim() || sampleOf(f.lang), lang: f.lang, code: f.code.replace(/\s+$/, '') }));
        const empty = ready.findIndex((f) => !f.code.trim());
        if (empty >= 0) {
            setActive(empty);
            toast(files.length > 1 ? `${empty + 1}번째 파일이 비어 있어요. 코드를 넣거나 파일을 빼 주세요` : '코드를 붙여넣어 주세요');
            document.getElementById('nCode')?.focus();
            return;
        }
        const dup = ready.findIndex((f, i) => ready.findIndex((g) => g.name.toLowerCase() === f.name.toLowerCase()) !== i);
        if (dup >= 0) {
            setActive(dup);
            toast(`파일 이름 '${ready[dup].name}'이(가) 겹쳐요`);
            document.getElementById('nFile')?.focus();
            return;
        }
        setBusy(true);
        if (edit) {
            try {
                await saveEdit(edit, ready);
            }
            catch (err) {
                toast(friendlyError(err));
            }
            finally {
                setBusy(false);
            }
            return;
        }
        try {
            const first = ready[0];
            const p = await createPost({ team_id: team.id, title: title.trim(), file_name: first.name, lang: first.lang, task, ask: ask.trim(), code: first.code, reviewer_ids: share ? [] : picked, kind, files: ready });
            saveDraft(null);
            await refresh();
            toast(share ? '코드를 공유했어요' : picked.length ? `${picked.map((id) => profiles.find((x) => x.id === id)?.name).join(', ')}님에게 리뷰를 요청했어요` : '코드를 올렸어요');
            navigate({ name: 'post', id: p.id });
        }
        catch (err) {
            toast(friendlyError(err));
        }
        finally {
            setBusy(false);
        }
    };
    /** 고치기 저장: 제목·설명 등은 바로, 코드가 바뀌었으면 새 버전으로 (리뷰는 고친 줄을 따라가요) */
    const saveEdit = async ({ post, threads }, ready) => {
        const meta = {};
        if (title.trim() !== post.title)
            meta.title = title.trim();
        if (ask.trim() !== post.ask)
            meta.ask = ask.trim();
        if (task !== post.task)
            meta.task = task;
        const rv = share ? [] : picked;
        if ([...rv].sort().join() !== [...post.reviewer_ids].sort().join())
            meta.reviewer_ids = rv;
        const old = filesOf(post);
        const codeChanged = ready.length !== old.length || ready.some((f, i) => f.name !== old[i].name || f.lang !== old[i].lang || f.code !== old[i].code);
        if (!Object.keys(meta).length && !codeChanged) {
            toast('바뀐 내용이 없어요');
            return;
        }
        if (Object.keys(meta).length)
            await updatePostMeta(post.id, meta);
        if (codeChanged) {
            const moved = threads.map((t) => {
                const from = t.file ?? 0;
                const to = files.findIndex((f) => f.orig === from);
                if (to < 0)
                    return { id: t.id, file: null, line: 1 };
                const line = lineMapper(old[from].code, ready[to].code)(t.line);
                return { id: t.id, file: to, line: Math.min(line, ready[to].code.split('\n').length) };
            });
            await updatePostCode(post.id, ready, moved, note.trim() || '직접 수정');
        }
        await refresh();
        toast(codeChanged ? `고친 코드를 v${post.version + 1}로 올렸어요` : '글을 고쳤어요');
        navigate({ name: 'post', id: post.id });
    };
    const allEmpty = !edit && files.every((f) => !f.code.trim());
    return (_jsxs("section", { children: [edit ? _jsx(BackBar, { label: "\uCDE8\uC18C", to: href({ name: 'post', id: edit.post.id }) }) : _jsx(BackBar, { label: "\uB2EB\uAE30" }), _jsx("h1", { className: "h-big tight", children: edit ? '글 고치기' : '코드 올리기' }), edit ? _jsxs("p", { className: "muted small edit-kind", children: [share ? '코드 공유' : '리뷰 요청', " \uAE00 \u00B7 \uC9C0\uAE08 v", edit.post.version, " \u00B7 \uCF54\uB4DC\uB97C \uACE0\uCE58\uBA74 \uC0C8 \uBC84\uC804\uC73C\uB85C \uB0A8\uACE0, \uB9AC\uBDF0\uB294 \uACE0\uCE5C \uC904\uC744 \uB530\uB77C\uAC00\uC694"] }) : _jsxs("div", { className: "seg kind-seg", role: "radiogroup", "aria-label": "\uAE00 \uC885\uB958", children: [_jsxs("button", { type: "button", role: "radio", "aria-checked": !share, "aria-pressed": !share, onClick: () => { setKind('review'); persist({ kind: 'review' }); }, children: [_jsx("b", { children: "\uB9AC\uBDF0 \uC694\uCCAD" }), _jsx("small", { children: "\uBB38\uC81C\uB97C \uAC19\uC774 \uBD10 \uC8FC\uC138\uC694" })] }), _jsxs("button", { type: "button", role: "radio", "aria-checked": share, "aria-pressed": share, onClick: () => { setKind('share'); persist({ kind: 'share' }); }, children: [_jsx("b", { children: "\uCF54\uB4DC \uACF5\uC720" }), _jsx("small", { children: "\uB9CC\uB4E0 \uCF54\uB4DC\uB97C \uB098\uB220\uC694" })] })] }), _jsxs("form", { className: "form", id: "newPostForm", onSubmit: (ev) => { ev.preventDefault(); submit(); }, children: [_jsxs("div", { className: "two", children: [_jsxs("div", { className: "field", children: [_jsx("label", { htmlFor: "nTitle", children: "\uC81C\uBAA9" }), _jsx("input", { id: "nTitle", value: title, maxLength: 120, placeholder: share ? '예: 판매 오더 조회 CDS View + Projection' : '예: 삭제 버튼을 누르면 다른 항목이 지워져요', onChange: (ev) => { setTitle(ev.target.value); persist({ title: ev.target.value }); } })] }), _jsxs("div", { className: "field", children: [_jsx("label", { htmlFor: "nTask", children: "\uACFC\uC81C" }), _jsxs("select", { id: "nTask", value: newTask !== null ? NEW_TASK : task, onChange: (ev) => {
                                            if (ev.target.value === NEW_TASK) {
                                                setNewTask('');
                                                requestAnimationFrame(() => document.getElementById('nNewTask')?.focus());
                                                return;
                                            }
                                            pickTask(ev.target.value);
                                        }, children: [team.tasks.map((t) => _jsx("option", { children: t }, t)), _jsx("option", { value: NEW_TASK, children: "+ \uC0C8 \uACFC\uC81C \uCD94\uAC00\u2026" })] }), _jsx(Expand, { open: newTask !== null, children: _jsxs("div", { className: "new-task", children: [_jsxs("div", { className: "task-add", children: [_jsx("input", { id: "nNewTask", value: newTask ?? '', maxLength: TASK_NAME_MAX, placeholder: "\uC0C8 \uACFC\uC81C \uC774\uB984", autoComplete: "off", "aria-label": "\uC0C8 \uACFC\uC81C \uC774\uB984", onChange: (ev) => setNewTask(ev.target.value), onKeyDown: (ev) => { if (ev.key === 'Enter' && !ev.nativeEvent.isComposing) {
                                                                ev.preventDefault();
                                                                addTask();
                                                            } if (ev.key === 'Escape')
                                                                setNewTask(null); } }), _jsx("button", { type: "button", className: "btn sm primary", disabled: addingTask || !newTask?.trim(), onClick: addTask, children: addingTask ? _jsxs(_Fragment, { children: ["\uCD94\uAC00 \uC911", _jsx(Dots, {})] }) : '추가' }), _jsx("button", { type: "button", className: "btn sm ghost", onClick: () => setNewTask(null), children: "\uCDE8\uC18C" })] }), similar.length > 0 && (_jsxs("p", { className: "task-similar small", children: ["\uD639\uC2DC \uC774 \uACFC\uC81C\uC778\uAC00\uC694? ", similar.map((t) => _jsx("button", { type: "button", className: "chip sm", onClick: () => pickTask(t), children: t }, t))] }))] }) })] })] }), _jsxs("div", { className: "field", children: [_jsxs("span", { className: "lbl", children: ["\uD30C\uC77C ", _jsxs("span", { className: "muted", children: ["(", files.length, "/", MAX_FILES, ")"] })] }), _jsxs("div", { className: "file-tabs", role: "tablist", "aria-label": "\uD30C\uC77C", ref: tabsRef, children: [files.map((f, i) => {
                                        const ps = allProblems[i] ?? [];
                                        const pe = ps.filter((p) => p.sev === 'e').length;
                                        return (_jsxs("span", { "data-flip": f.id, className: `ftab ${i === active ? 'on' : ''} ${confirmRemove === f.id ? 'confirm' : ''}`, children: [_jsxs("button", { type: "button", role: "tab", "aria-selected": i === active, className: "ftab-name", onClick: () => { setActive(i); setConfirmRemove(null); }, children: [_jsx(LangIcon, { lang: f.lang, size: 16 }), f.name.trim() || `파일 ${i + 1}`, pe > 0 ? _jsx("i", { className: "ftab-dot e", "aria-label": `오류 ${pe}` }) : ps.length > 0 ? _jsx("i", { className: "ftab-dot w", "aria-label": `경고 ${ps.length}` }) : null] }), files.length > 1 && _jsx("button", { type: "button", className: "ftab-x", "aria-label": confirmRemove === f.id ? `${f.name || `파일 ${i + 1}`} 정말 빼기` : `${f.name || `파일 ${i + 1}`} 빼기`, onClick: () => removeFile(i), children: confirmRemove === f.id ? (reviewsIn(f) > 0 ? `리뷰 ${reviewsIn(f)}개도 빼기?` : '빼기?') : '×' })] }, f.id));
                                    }), files.length < MAX_FILES && _jsx("button", { type: "button", className: "ftab add", onClick: addFile, children: "+ \uD30C\uC77C" })] }), allEmpty && (_jsxs("div", { className: "set-row", children: [_jsx("span", { className: "muted small", children: "\uC5EC\uB7EC \uD30C\uC77C \uD55C \uBC88\uC5D0:" }), TEMPLATE_SETS.map((s) => _jsx("button", { type: "button", className: "chip sm", title: s.detail, onClick: () => applySet(s.id), children: s.label }, s.id))] }))] }), _jsxs("div", { className: "two", children: [_jsxs("div", { className: "field", children: [_jsx("label", { htmlFor: "nFile", children: "\uD30C\uC77C \uC774\uB984" }), _jsx("input", { id: "nFile", value: cur.name, maxLength: 80, placeholder: sampleOf(cur.lang), onChange: (ev) => { const v = ev.target.value; const g = langFromFile(v); patchFile({ name: v, ...(g ? { lang: g, langAuto: false } : {}) }); } })] }), _jsxs("div", { className: "field", children: [_jsx("label", { htmlFor: "nLang", children: "\uC5B8\uC5B4" }), _jsx("select", { id: "nLang", value: cur.lang, onChange: (ev) => patchFile({ lang: ev.target.value, langAuto: false }), children: LANGS.map((l) => _jsxs("option", { value: l.id, children: [l.label, " \u00B7 ", l.course] }, l.id)) }), cur.langAuto && cur.code.trim() && _jsx("span", { className: "muted small", children: "\uC790\uB3D9 \uAC10\uC9C0" })] })] }), _jsxs("div", { className: "field", children: [_jsx("label", { htmlFor: "nCode", children: "\uCF54\uB4DC" }), _jsxs("div", { className: "paste", children: [_jsx(CodeEditor, { id: "nCode", value: cur.code, lang: cur.lang, problems: problems, placeholder: "\uCF54\uB4DC \uBD99\uC5EC\uB123\uAE30 (Ctrl/\u2318 + V)", onToast: toast, fileName: cur.name, onTemplate: (f, l, c) => patchFile({ name: cur.name.trim() ? cur.name : f, lang: l, code: c, langAuto: false }), onChange: (v) => { const g = cur.langAuto ? langFromCode(v) : null; patchFile({ code: v, ...(g ? { lang: g } : {}) }); } }, cur.id), _jsx("div", { className: "check", "aria-live": "polite", children: !cur.code.trim() ? _jsx("span", { className: "muted", children: "\uBD99\uC5EC\uB123\uC73C\uBA74 \uBC14\uB85C \uAC80\uC0AC\uD574\uC694" })
                                            : !problems.length ? _jsx("span", { className: "okmsg", children: "\u2713 \uAC80\uC0AC \uD1B5\uACFC" })
                                                : _jsxs(_Fragment, { children: [_jsxs("div", { className: "check-h", children: ["\uAC80\uC0AC \uACB0\uACFC ", e > 0 && _jsxs("span", { className: "pill e", children: ["\uC624\uB958 ", e] }), problems.length - e > 0 && _jsxs("span", { className: "pill w", children: ["\uACBD\uACE0 ", problems.length - e] })] }), _jsx("ul", { children: problems.map((p) => _jsxs("li", { children: [_jsx("span", { className: `dot ${p.sev}` }), _jsxs("span", { className: "ln", children: [p.line, "\uC904"] }), _jsxs("span", { children: [_jsx("b", { children: p.title }), " \u00B7 ", p.easy] })] }, p.line + p.rule)) })] }) })] })] }), _jsxs("div", { className: "field", children: [_jsxs("label", { htmlFor: "nAsk", children: [share ? '설명' : '요청 사항', " ", _jsx("span", { className: "muted", children: "(\uC120\uD0DD)" })] }), _jsx("textarea", { id: "nAsk", rows: share ? 4 : 2, value: ask, maxLength: 2000, placeholder: share ? '예: 무엇을 하는 코드인지, 쓰는 법, 참고한 자료' : '예: catch에서 500 오류가 안 잡혀요', onChange: (ev) => { setAsk(ev.target.value); persist({ ask: ev.target.value }); } })] }), _jsx(Expand, { open: !share, children: _jsxs("div", { className: "field", children: [_jsx("span", { className: "lbl", children: "\uB9AC\uBDF0\uC5B4" }), _jsx("div", { className: "picks", children: mates.length ? mates.map((p) => (_jsxs("button", { type: "button", className: "pick", "aria-pressed": picked.includes(p.id), onClick: () => setPicked(picked.includes(p.id) ? picked.filter((x) => x !== p.id) : [...picked, p.id]), children: [_jsx(Avatar, { person: p, size: "lg" }), p.name] }, p.id))) : _jsxs("span", { className: "muted", children: ["\uB2E4\uB978 \uD300\uC6D0\uC774 \uC5C6\uC5B4\uC694 \u00B7 ", _jsx("a", { href: href({ name: 'team' }), children: "\uCD08\uB300\uD558\uAE30" })] }) })] }) }), edit ? (_jsxs("div", { className: "field", children: [_jsxs("label", { htmlFor: "nNote", children: ["\uACE0\uCE5C \uB0B4\uC6A9 ", _jsx("span", { className: "muted", children: "(\uC120\uD0DD \u00B7 \uBC84\uC804 \uAE30\uB85D\uC5D0 \uB0A8\uC544\uC694)" })] }), _jsx("input", { id: "nNote", value: note, maxLength: 80, placeholder: "\uC608: \uB9AC\uBDF0 \uBC18\uC601\uD574\uC11C catch\uC5D0\uC11C throw \uD558\uB3C4\uB85D", onChange: (ev) => setNote(ev.target.value) })] })) : _jsx("p", { className: "muted small", children: "\uC791\uC131 \uC911\uC778 \uB0B4\uC6A9\uC740 \uC774 \uBE0C\uB77C\uC6B0\uC800\uC5D0 \uC790\uB3D9 \uC800\uC7A5\uB3FC\uC694" })] }), _jsx("div", { className: "dock", children: _jsx("div", { className: "dock-in", children: _jsx("button", { className: "btn primary wide", form: "newPostForm", disabled: busy, children: busy ? _jsxs(_Fragment, { children: [edit ? '저장하는 중' : '올리는 중', _jsx(Dots, {})] }) : edit ? '고친 내용 저장' : `${share ? '공유하기' : picked.length ? `${picked.length}명에게 리뷰 요청` : '올리기'}${files.length > 1 ? ` · 파일 ${files.length}개` : ''}` }) }) })] }));
}
