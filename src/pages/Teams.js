import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { TaskEditor } from '../components/TaskEditor';
import { COURSE_TASKS } from '../lib/tasks';
import { Avatar } from '../components/Avatar';
import { CopyButton } from '../components/CopyButton';
import { BackBar, Header, WeekStats, reviewsGivenThisWeek } from '../components/Layout';
import { createTeam, friendlyError, joinTeam, peekTeam, regenerateInvite, removeMember, setMyRole, setRole, updateTeam, deleteTeam } from '../lib/api';
import { DEFAULT_TASKS } from '../lib/config';
import { inviteUrl, navigate } from '../lib/router';
import { pendingCode, useStore } from '../lib/store';
import { ROLE_LABEL } from '../lib/types';
import { Dots, useFlip } from '../components/Motion';
const ROLES = ['owner', 'vice', 'member'];
/** 팀장·부팀장·팀원 고르기. 이미 누가 맡은 자리는 고를 수 없어요. */
export function RolePicker({ value, onChange, taken = {}, label = '내 직책' }) {
    return (_jsx("div", { className: "seg seg3 role-pick", role: "radiogroup", "aria-label": label, children: ROLES.map((r) => (_jsxs("button", { type: "button", role: "radio", "aria-checked": value === r, "aria-pressed": value === r, disabled: Boolean(taken[r]) && value !== r, onClick: () => onChange(r), children: [ROLE_LABEL[r], taken[r] && value !== r ? _jsx("small", { children: " \u00B7 \uC788\uC74C" }) : null] }, r))) }));
}
/** 팀 만들기 + 초대 코드로 참여하기. 첫 화면과 '#/teams' 화면에서 같이 써요. */
export function TeamForms({ onDone, initialError = '' }) {
    const [name, setName] = useState('');
    const [tasks, setTasks] = useState(COURSE_TASKS);
    const [code, setCode] = useState(() => pendingCode.get() ?? '');
    const [err, setErr] = useState(initialError);
    const [busy, setBusy] = useState(null);
    const [createRole, setCreateRole] = useState('owner');
    const [joinRole, setJoinRole] = useState('member');
    const [peek, setPeek] = useState(null);
    const clean = code.replace(/\s|-/g, '').toUpperCase();
    // 코드 8자리를 다 치면 어느 팀인지, 팀장·부팀장 자리가 비었는지 미리 봐요.
    useEffect(() => {
        setPeek(null);
        if (clean.length !== 8)
            return;
        let alive = true;
        const t = window.setTimeout(() => {
            peekTeam(clean).then((p) => {
                if (!alive || !p)
                    return;
                setPeek(p);
                setJoinRole((r) => ((r === 'owner' && p.owner_taken) || (r === 'vice' && p.vice_taken) ? 'member' : r));
            }).catch((e) => { if (alive)
                setErr(friendlyError(e)); });
        }, 250);
        return () => { alive = false; window.clearTimeout(t); };
    }, [clean]);
    const create = async () => {
        if (!name.trim()) {
            setErr('팀 이름을 적어 주세요.');
            document.getElementById('teamName')?.focus();
            return;
        }
        setBusy('create');
        setErr('');
        try {
            const t = await createTeam(name.trim(), tasks.length ? tasks : DEFAULT_TASKS, createRole);
            pendingCode.set(null);
            onDone(t, false);
        }
        catch (e) {
            setErr(friendlyError(e));
            setBusy(null);
        }
    };
    const join = async () => {
        if (clean.length < 6) {
            setErr('초대 코드 8자리를 확인해 주세요.');
            document.getElementById('inviteCode')?.focus();
            return;
        }
        setBusy('join');
        setErr('');
        try {
            const t = await joinTeam(clean, joinRole);
            pendingCode.set(null);
            onDone(t, true);
        }
        catch (e) {
            setErr(friendlyError(e));
            setBusy(null);
        }
    };
    return (_jsxs("div", { className: "team-forms", children: [_jsxs("form", { className: "tf-card", onSubmit: (e) => { e.preventDefault(); join(); }, children: [_jsx("h2", { children: "\uCD08\uB300 \uCF54\uB4DC\uB85C \uCC38\uC5EC\uD558\uAE30" }), _jsx("label", { htmlFor: "inviteCode", className: "lbl", children: "\uCD08\uB300 \uCF54\uB4DC" }), _jsx("input", { id: "inviteCode", className: "code-input", value: code, maxLength: 12, autoComplete: "off", placeholder: "ABCD2345", onChange: (e) => { setCode(e.target.value.toUpperCase()); setErr(''); } }), peek && _jsxs("p", { className: "peek", children: [_jsx("b", { children: peek.name }), " \u00B7 \uD300\uC6D0 ", peek.members, "\uBA85", peek.joined && _jsx("span", { className: "muted", children: " \u00B7 \uC774\uBBF8 \uB4E4\uC5B4\uAC00 \uC788\uB294 \uD300\uC774\uC5D0\uC694" })] }), _jsx("span", { className: "lbl", children: "\uC9C1\uCC45" }), _jsx(RolePicker, { value: joinRole, onChange: setJoinRole, taken: { owner: peek?.owner_taken, vice: peek?.vice_taken } }), _jsx("button", { className: "btn primary wide", disabled: busy !== null || Boolean(peek?.joined), children: busy === 'join' ? _jsxs(_Fragment, { children: ["\uCC38\uC5EC\uD558\uB294 \uC911", _jsx(Dots, {})] }) : peek ? `${ROLE_LABEL[joinRole]}으로 참여` : '참여하기' })] }), _jsxs("form", { className: "tf-card", onSubmit: (e) => { e.preventDefault(); create(); }, children: [_jsx("h2", { children: "\uC0C8 \uD300 \uB9CC\uB4E4\uAE30" }), _jsx("label", { htmlFor: "teamName", className: "lbl", children: "\uD300 \uC774\uB984" }), _jsx("input", { id: "teamName", value: name, maxLength: 40, placeholder: "\uC608: SAP 3\uAE30 3\uD300", onChange: (e) => setName(e.target.value) }), _jsxs("label", { htmlFor: "teamTasks", className: "lbl", children: ["\uACFC\uC81C ", _jsx("span", { className: "muted", children: "(\uB098\uC911\uC5D0 \uBC14\uAFC0 \uC218 \uC788\uC5B4\uC694)" })] }), _jsx(TaskEditor, { id: "teamTasks", value: tasks, onChange: setTasks }), _jsxs("span", { className: "lbl", children: ["\uB0B4 \uC9C1\uCC45 ", _jsx("span", { className: "muted", children: "(\uD300\uC7A5\u00B7\uBD80\uD300\uC7A5\uC740 \uD300\uC744 \uAD00\uB9AC\uD560 \uC218 \uC788\uC5B4\uC694)" })] }), _jsx(RolePicker, { value: createRole, onChange: setCreateRole }), _jsx("button", { className: "btn wide", disabled: busy !== null, children: busy === 'create' ? _jsxs(_Fragment, { children: ["\uB9CC\uB4DC\uB294 \uC911", _jsx(Dots, {})] }) : '팀 만들기' })] }), err && _jsx("p", { className: "err", role: "alert", children: err })] }));
}
/** '#/teams' — 이미 팀이 있는 사람이 다른 팀을 만들거나 참여할 때 */
export function TeamsPage() {
    const { teams, reloadTeams, toast } = useStore();
    return (_jsxs("section", { children: [_jsx(BackBar, { label: "\uB2EB\uAE30" }), _jsx("h1", { className: "h-big tight", children: "\uD300 \uCD94\uAC00" }), _jsxs("p", { className: "muted small lead", children: ["\uC18D\uD55C \uD300 ", teams.length, "\uAC1C"] }), _jsx(TeamForms, { onDone: async (t, joined) => { await reloadTeams(t.id); toast(joined ? `'${t.name}'에 참여했어요` : `'${t.name}' 팀을 만들었어요`); navigate(joined ? { name: 'feed' } : { name: 'team' }); } })] }));
}
/** '#/team' — 지금 팀 설정 (초대, 팀원 관리, 이름·과제 바꾸기, 나가기) */
export function TeamSettings({ onTeam }) {
    const { me, team, isOwner, profiles, posts, comments, reloadTeams, toast } = useStore();
    const [name, setName] = useState(team.name);
    const [tasks, setTasks] = useState(team.tasks);
    const [confirm, setConfirm] = useState(null);
    const [confirmRemove, setConfirmRemove] = useState(null);
    const holder = (r) => profiles.find((p) => p.role === r);
    const myRole = (profiles.find((p) => p.id === me.id)?.role ?? team.role);
    const link = inviteUrl(team.invite_code);
    const run = async (fn, ok) => {
        try {
            await fn();
            await reloadTeams(team.id);
            toast(ok);
            return true;
        }
        catch (e) {
            toast(friendlyError(e));
            return false;
        }
    };
    const [editing, setEditing] = useState(false);
    const memberRef = useFlip();
    const pretty = team.invite_code.replace(/^(.{4})(.+)$/, '$1 $2');
    return (_jsxs("section", { children: [_jsx(Header, { onTeam: onTeam }), _jsx("h1", { className: "h-big", children: team.name }), _jsxs("section", { className: "invite", "aria-label": "\uD300\uC6D0 \uCD08\uB300\uD558\uAE30", children: [_jsx("span", { className: "lab", children: "\uD300\uC6D0 \uCD08\uB300\uD558\uAE30" }), _jsx("span", { className: "invite-code", "aria-label": `초대 코드 ${team.invite_code}`, children: pretty }), _jsxs("div", { className: "acts", children: [_jsx(CopyButton, { className: "big white", text: () => team.invite_code, label: "\uCF54\uB4DC \uBCF5\uC0AC", onFail: toast }), _jsx(CopyButton, { className: "big primary", text: () => link, label: "\uCD08\uB300 \uB9C1\uD06C \uBCF5\uC0AC", icon: "link", onFail: toast })] })] }), _jsxs("div", { className: "sec-h", children: [_jsx("h2", { children: "\uB0B4 \uC9C1\uCC45" }), _jsx("span", { className: "muted small", children: "\uD300\uC7A5\u00B7\uBD80\uD300\uC7A5\uC740 \uD300\uC744 \uAD00\uB9AC\uD560 \uC218 \uC788\uC5B4\uC694" })] }), _jsxs("div", { className: "card card-pad", children: [_jsx(RolePicker, { value: myRole, taken: { owner: Boolean(holder('owner')), vice: Boolean(holder('vice')) }, onChange: (r) => { if (r !== myRole)
                            run(() => setMyRole(team.id, r), `${ROLE_LABEL[r]}으로 바꿨어요`); } }), ['owner', 'vice'].some((r) => holder(r) && holder(r).id !== me.id) && (_jsx("p", { className: "muted small role-note", children: ['owner', 'vice'].filter((r) => holder(r) && holder(r).id !== me.id).map((r) => `${ROLE_LABEL[r]} ${holder(r).name}`).join(' · ') }))] }), _jsx(WeekStats, {}), _jsxs("div", { className: "sec-h", children: [_jsxs("h2", { children: ["\uD300\uC6D0 ", profiles.length, "\uBA85"] }), isOwner && _jsx("button", { type: "button", onClick: () => run(() => regenerateInvite(team.id), '새 초대 코드를 만들었어요. 이전 링크는 이제 쓸 수 없어요'), children: "\uC0C8 \uCD08\uB300 \uCF54\uB4DC" })] }), _jsx("div", { className: "card list", ref: memberRef, children: profiles.map((p) => {
                    const given = reviewsGivenThisWeek(p.id, posts, comments);
                    return (_jsxs("div", { className: "item", "data-flip": p.id, children: [_jsx(Avatar, { person: p }), _jsxs("span", { className: "body", children: [_jsxs("span", { className: "t", children: [p.name, p.id === me.id ? ' (나)' : '', p.role !== 'member' && _jsx("span", { className: `role ${p.role}`, children: ROLE_LABEL[p.role] })] }), p.bio && _jsx("span", { className: "m bio", children: p.bio }), _jsxs("span", { className: "m", children: ["\uC62C\uB9B0 \uCF54\uB4DC ", posts.filter((x) => x.author_id === p.id).length, "\uAC1C \u00B7 \uC774\uBC88 \uC8FC \uB9AC\uBDF0 ", given, "\uAC1C"] })] }), isOwner && p.id !== me.id && (confirmRemove === p.id ? (_jsxs("span", { className: "m-act", children: [_jsx("button", { type: "button", className: "btn sm", onClick: () => setConfirmRemove(null), children: "\uCDE8\uC18C" }), _jsx("button", { type: "button", className: "btn sm danger-btn", onClick: () => { setConfirmRemove(null); run(() => removeMember(team.id, p.id), `${p.name}님을 내보냈어요`); }, children: "\uB0B4\uBCF4\uB0B4\uAE30" })] })) : (_jsxs("span", { className: "m-act", children: [_jsx("select", { className: "role-sel", value: p.role, "aria-label": `${p.name} 직책`, onChange: (e) => { const r = e.target.value; run(() => setRole(team.id, p.id, r), `${p.name}님을 ${ROLE_LABEL[r]}으로 바꿨어요`); }, children: ROLES.map((r) => { const h = holder(r); const busy = r !== 'member' && h && h.id !== p.id; return _jsxs("option", { value: r, disabled: Boolean(busy), children: [ROLE_LABEL[r], busy ? ` (${h.name})` : ''] }, r); }) }), _jsx("button", { type: "button", className: "txt-btn", onClick: () => setConfirmRemove(p.id), children: "\uB0B4\uBCF4\uB0B4\uAE30" })] })))] }, p.id));
                }) }), _jsxs("div", { className: "sec-h", children: [_jsx("h2", { children: "\uACFC\uC81C" }), isOwner && _jsx("button", { type: "button", onClick: () => { if (!editing) {
                            setTasks(team.tasks);
                            setName(team.name);
                        } setEditing(!editing); }, children: editing ? '닫기' : '편집' })] }), editing && isOwner ? (_jsxs("form", { className: "card card-pad form", onSubmit: async (e) => { e.preventDefault(); if (await run(() => updateTeam(team.id, { name: name.trim() || team.name, tasks: tasks.length ? tasks : DEFAULT_TASKS }), '팀 정보를 저장했어요'))
                    setEditing(false); }, children: [_jsxs("div", { className: "field", children: [_jsx("label", { htmlFor: "setName", children: "\uD300 \uC774\uB984" }), _jsx("input", { className: "inp", id: "setName", value: name, maxLength: 40, onChange: (e) => setName(e.target.value) })] }), _jsxs("div", { className: "field", children: [_jsx("label", { htmlFor: "setTasks", children: "\uACFC\uC81C" }), _jsx(TaskEditor, { id: "setTasks", value: tasks, onChange: setTasks }), _jsx("span", { className: "hint", children: "\uACFC\uC81C\uB97C \uC9C0\uC6CC\uB3C4 \uC774\uBBF8 \uC62C\uB77C\uC628 \uCF54\uB4DC\uC758 \uACFC\uC81C \uD45C\uC2DC\uB294 \uADF8\uB300\uB85C \uB0A8\uC544\uC694." })] }), _jsx("button", { className: "btn primary wide", children: "\uC800\uC7A5" })] })) : (_jsx("div", { className: "card list", children: team.tasks.map((t) => _jsxs("div", { className: "item", children: [_jsx("span", { className: "body", children: _jsx("span", { className: "t", children: t }) }), _jsxs("span", { className: "muted small", children: [posts.filter((p) => p.task === t).length, "\uAC1C"] })] }, t)) })), _jsx("div", { className: "foot-acts", children: confirm === 'leave' ? (_jsxs("div", { className: "danger", children: [_jsxs("span", { children: [team.name, "\uC5D0\uC11C \uB098\uAC08\uAE4C\uC694? \uB0B4\uAC00 \uC62C\uB9B0 \uCF54\uB4DC\uC640 \uB9AC\uBDF0\uB294 \uD300\uC5D0 \uB0A8\uC544\uC694.", profiles.length === 1 ? ' 마지막 팀원이라 팀이 지워져요.' : ''] }), _jsx("button", { type: "button", className: "btn sm", onClick: () => setConfirm(null), children: "\uCDE8\uC18C" }), _jsx("button", { type: "button", className: "btn sm danger-btn", onClick: async () => { if (await run(() => removeMember(team.id, me.id), `${team.name}에서 나왔어요`))
                                navigate({ name: 'feed' }); }, children: "\uB098\uAC00\uAE30" })] })) : confirm === 'delete' ? (_jsxs("div", { className: "danger", children: [_jsx("span", { children: "\uD300\uACFC \uBAA8\uB4E0 \uCF54\uB4DC\u00B7\uB9AC\uBDF0\uB97C \uC9C0\uC6B8\uAE4C\uC694? \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC5B4\uC694." }), _jsx("button", { type: "button", className: "btn sm", onClick: () => setConfirm(null), children: "\uCDE8\uC18C" }), _jsx("button", { type: "button", className: "btn sm danger-btn", onClick: async () => { if (await run(() => deleteTeam(team.id), `'${team.name}' 팀을 지웠어요`))
                                navigate({ name: 'feed' }); }, children: "\uD300 \uC0AD\uC81C" })] })) : (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "txt-btn", onClick: onTeam, children: "\uB2E4\uB978 \uD300\uC73C\uB85C \uAC00\uAE30" }), _jsx("button", { type: "button", className: "txt-btn red", onClick: () => setConfirm('leave'), children: "\uD300 \uB098\uAC00\uAE30" }), isOwner && _jsx("button", { type: "button", className: "txt-btn red", onClick: () => setConfirm('delete'), children: "\uD300 \uC0AD\uC81C" })] })) })] }));
}
