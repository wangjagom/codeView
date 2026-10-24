import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect } from 'react';
import { href, navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { weekStart } from '../lib/util';
import { ROLE_LABEL } from '../lib/types';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
export const ALL = { kind: 'all', status: 'all' };
/** 하단 탭을 보여 줄 화면 (나머지는 뒤로 가기 + 화면 아래 버튼) */
const TAB_VIEWS = new Set(['feed', 'join', 'team', 'me']);
const TABS = [
    { view: 'feed', label: '홈', icon: 'home', to: href({ name: 'feed' }) },
    { view: 'new', label: '올리기', icon: 'plus', to: href({ name: 'new' }) },
    { view: 'team', label: '내 팀', icon: 'team', to: href({ name: 'team' }) },
    { view: 'me', label: '내 정보', icon: 'me', to: href({ name: 'me' }) },
];
export function Layout({ view, sheet, onSheet, children }) {
    const withTabs = TAB_VIEWS.has(view);
    useEffect(() => {
        document.body.dataset.page = view === 'new' || view === 'edit' || view === 'teams' ? 'form' : '';
        return () => { document.body.dataset.page = ''; };
    }, [view]);
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: `app ${withTabs ? 'with-tabs' : ''}`, "data-view": view, children: children }), withTabs && (_jsx("nav", { className: "tabbar", "aria-label": "\uBA54\uB274", children: _jsx("div", { className: "tabbar-in", children: TABS.map((t) => (_jsxs("a", { className: "tab", href: t.to, "aria-current": view === t.view || (t.view === 'feed' && view === 'join') ? 'page' : undefined, children: [_jsx(Icon, { name: t.icon }), t.label] }, t.view))) }) })), sheet && _jsx(TeamSheet, { onClose: () => onSheet(false) })] }));
}
/** 탭 화면 위쪽: 로고 자리(비워 둠) + 서비스 이름 + 팀 바꾸기 */
export function Header({ onTeam }) {
    const { team } = useStore();
    return (_jsxs("header", { className: "hd", children: [_jsxs("a", { className: "brand", href: href({ name: 'feed' }), children: [_jsx("span", { className: "logo-slot", "aria-hidden": "true" }), _jsx("span", { className: "wordmark", children: "codeView" })] }), _jsx("span", { className: "sp" }), _jsxs("button", { type: "button", className: "team-pill", onClick: onTeam, "aria-haspopup": "dialog", children: [team.name, _jsx(Icon, { name: "down" })] })] }));
}
/** 뒤로 가기가 있는 화면 위쪽 */
export function BackBar({ label = '목록', to = href({ name: 'feed' }) }) {
    return _jsxs("a", { className: "back", href: to, children: [_jsx(Icon, { name: "back" }), label] });
}
/** 아래에서 올라오는 팀 고르기 */
function TeamSheet({ onClose }) {
    const { team, teams, switchTeam } = useStore();
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape')
            onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (_jsx("div", { className: "sheet-bg", onClick: (e) => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("div", { className: "sheet", role: "dialog", "aria-label": "\uD300 \uACE0\uB974\uAE30", children: [_jsx("h3", { children: "\uD300 \uACE0\uB974\uAE30" }), _jsx("div", { className: "sheet-list", children: teams.map((t) => (_jsxs("button", { type: "button", className: "item", onClick: () => { onClose(); switchTeam(t.id); }, children: [_jsxs("span", { className: "body", children: [_jsx("span", { className: "t", children: t.name }), _jsx("span", { className: "m", children: ROLE_LABEL[t.role] ?? '팀원' })] }), t.id === team.id && _jsx("span", { className: "check-mark", "aria-label": "\uC9C0\uAE08 \uBCF4\uB294 \uD300", children: "\u2713" })] }, t.id))) }), _jsx("button", { type: "button", className: "btn soft wide", onClick: () => { onClose(); navigate({ name: 'teams' }); }, children: "\uCD08\uB300 \uCF54\uB4DC\uB85C \uCC38\uC5EC \u00B7 \uC0C8 \uD300 \uB9CC\uB4E4\uAE30" }), _jsxs("button", { type: "button", className: "btn wide", onClick: () => { onClose(); navigate({ name: 'team' }); }, children: [team.name, " \uC124\uC815 \u00B7 \uCD08\uB300\uD558\uAE30"] })] }) }));
}
/** 이번 주 팀 현황 (내 팀 화면에서 보여 줘요) */
export function WeekStats() {
    const { profiles, posts, comments } = useStore();
    const since = weekStart();
    const inWeek = (iso) => new Date(iso) >= since;
    const authorOf = new Map(posts.map((p) => [p.id, p.author_id]));
    const weekComments = comments.filter((c) => inWeek(c.created_at));
    const given = (id) => weekComments.filter((c) => c.author_id === id && authorOf.get(c.post_id) !== id).length;
    const end = new Date(since);
    end.setDate(end.getDate() + 6);
    const md = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
    const top = [...profiles].sort((a, b) => given(b.id) - given(a.id))[0];
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "sec-h", children: [_jsx("h2", { children: "\uC774\uBC88 \uC8FC" }), _jsxs("span", { className: "muted small", children: [md(since), " \u2013 ", md(end)] })] }), _jsxs("div", { className: "card stats", children: [_jsxs("div", { children: [_jsx("b", { children: posts.filter((p) => p.kind !== 'share' && inWeek(p.created_at)).length }), _jsx("small", { children: "\uB9AC\uBDF0 \uC694\uCCAD" })] }), _jsxs("div", { children: [_jsx("b", { children: weekComments.length }), _jsx("small", { children: "\uB0A8\uAE34 \uB9AC\uBDF0" })] }), _jsxs("div", { children: [_jsx("b", { children: posts.filter((p) => p.status === 'done' && inWeek(p.updated_at)).length }), _jsx("small", { children: "\uD574\uACB0" })] })] }), top && given(top.id) > 0 && (_jsxs("p", { className: "cheer", children: [_jsx(Avatar, { person: top, size: "xs" }), _jsxs("span", { children: ["\uB9AC\uBDF0 1\uC704 ", _jsx("b", { children: top.name }), " \u00B7 ", given(top.id), "\uAC1C"] })] }))] }));
}
export function reviewsGivenThisWeek(profileId, posts, comments) {
    const since = weekStart();
    const authorOf = new Map(posts.map((p) => [p.id, p.author_id]));
    return comments.filter((c) => new Date(c.created_at) >= since && c.author_id === profileId && authorOf.get(c.post_id) !== profileId).length;
}
