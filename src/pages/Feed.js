import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { searchPosts } from '../lib/search';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Expand, useFlip } from '../components/Motion';
import { Header } from '../components/Layout';
import { matchFilter, matchKind, matchStatus } from '../lib/feed';
import { checkCode } from '../lib/checks';
import { href } from '../lib/router';
import { isMyTurn, useStore } from '../lib/store';
import { STATUS_LABEL, filesOf, isShare } from '../lib/types';
import { timeAgo } from '../lib/util';
import { LangIcon } from '../components/LangIcon';
const KINDS = [['all', '전체'], ['review', '리뷰 요청'], ['share', '코드 공유']];
const STATUSES = [['all', '전체'], ['wait', '대기'], ['doing', '피드백 중'], ['done', '해결됨']];
const VIEW_LABEL = { turn: '내 리뷰 차례', saved: '저장한 코드', mine: '내가 올린 코드' };
export function Feed({ filter, task, onFilter, onTask, onTeam }) {
    const { me, team, posts, comments, person, profiles, likes, bookmarks } = useStore();
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState('new');
    const hits = useMemo(() => searchPosts(posts, query, (id) => person(id).name), [posts, query, person]);
    const likeCount = useMemo(() => { const m = new Map(); for (const l of likes)
        m.set(l.post_id, (m.get(l.post_id) ?? 0) + 1); return m; }, [likes]);
    const listRef = useFlip();
    const ctx = { meId: me.id, comments, bookmarks };
    const turns = posts.filter((p) => isMyTurn(p, me.id, comments));
    const searching = query.trim().length > 0;
    const inTask = posts.filter((p) => (!task || p.task === task) && (!searching || hits.has(p.id)));
    const list = inTask.filter((p) => matchFilter(p, filter, ctx));
    if (sort === 'liked')
        list.sort((a, b) => (likeCount.get(b.id) ?? 0) - (likeCount.get(a.id) ?? 0) || b.created_at.localeCompare(a.created_at));
    const reviews = inTask.filter((p) => !isShare(p));
    const unit = filter.view ? '' : filter.kind === 'review' ? '리뷰 요청 ' : filter.kind === 'share' ? '공유 ' : '코드 ';
    return (_jsxs("section", { children: [_jsx(Header, { onTeam: onTeam }), turns.length > 0 && !filter.view && (_jsxs("section", { className: "turn-card", "aria-label": "\uB0B4 \uB9AC\uBDF0 \uCC28\uB840", children: [_jsxs("div", { className: "turn-h", children: [_jsxs("span", { className: "lab", children: ["\uB0B4 \uB9AC\uBDF0 \uCC28\uB840 ", turns.length] }), turns.length > 1 && _jsxs("button", { type: "button", onClick: () => onFilter({ ...filter, view: 'turn' }), children: ["\uBAA8\uB450 \uBCF4\uAE30", _jsx(Icon, { name: "chev" })] })] }), turns.slice(0, 1).map((p) => (_jsxs("a", { className: "turn-item", href: href({ name: 'post', id: p.id }), children: [_jsx(Avatar, { person: person(p.author_id) }), _jsxs("span", { className: "body", children: [_jsx("span", { className: "t", children: p.title }), _jsxs("span", { className: "m", children: [person(p.author_id).name, " \u00B7 ", timeAgo(p.created_at)] })] }), _jsx("span", { className: "btn sm primary", "aria-hidden": "true", children: "\uB9AC\uBDF0\uD558\uAE30" })] }, p.id)))] })), _jsxs("div", { className: "search", role: "search", children: [_jsx(Icon, { name: "search" }), _jsx("input", { type: "search", value: query, onChange: (e) => setQuery(e.target.value), placeholder: "\uC81C\uBAA9\u00B7\uCF54\uB4DC\u00B7\uD30C\uC77C \uC774\uB984\uC73C\uB85C \uCC3E\uAE30 (\uC608: READ TABLE)", "aria-label": "\uCF54\uB4DC \uAC80\uC0C9", enterKeyHint: "search" }), searching && _jsx("button", { type: "button", className: "search-x", "aria-label": "\uAC80\uC0C9 \uC9C0\uC6B0\uAE30", onClick: () => setQuery(''), children: _jsx(Icon, { name: "close" }) })] }), filter.view ? (_jsxs("div", { className: "view-bar", children: [_jsx("b", { children: VIEW_LABEL[filter.view] }), _jsxs("button", { type: "button", className: "chip sm", onClick: () => onFilter({ ...filter, view: undefined }), children: ["\uC804\uCCB4 \uAE00\uB85C", _jsx(Icon, { name: "close" })] })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "seg seg3 feed-tabs", role: "tablist", "aria-label": "\uAE00 \uC885\uB958", children: KINDS.map(([k, l]) => (_jsxs("button", { type: "button", role: "tab", "aria-selected": filter.kind === k, "aria-pressed": filter.kind === k, onClick: () => onFilter({ kind: k, status: 'all' }), children: [l, " ", _jsx("span", { className: "chip-n", children: inTask.filter((p) => matchKind(p, k)).length })] }, k))) }), _jsx(Expand, { open: filter.kind === 'review', children: _jsx("div", { className: "chips st-chips", role: "group", "aria-label": "\uB9AC\uBDF0 \uC0C1\uD0DC", children: STATUSES.map(([v, l]) => (_jsxs("button", { type: "button", className: `chip sm st-${v}`, "aria-pressed": filter.status === v, onClick: () => onFilter({ ...filter, status: v }), children: [l, " ", _jsx("span", { className: "chip-n", children: reviews.filter((p) => matchStatus(p, v)).length })] }, v))) }) })] })), _jsxs("div", { className: "list-bar", children: [_jsxs("span", { className: "muted small", children: [searching ? `'${query.trim()}' 검색 ` : unit, list.length, "\uAC1C"] }), team.tasks.length > 0 && (_jsxs("select", { className: "mini-sel", value: task, onChange: (e) => onTask(e.target.value), "aria-label": "\uACFC\uC81C", children: [_jsx("option", { value: "", children: "\uACFC\uC81C \uC804\uCCB4" }), team.tasks.map((t) => _jsx("option", { value: t, children: t }, t))] })), _jsxs("select", { className: "mini-sel", value: sort, onChange: (e) => setSort(e.target.value), "aria-label": "\uC815\uB82C", children: [_jsx("option", { value: "new", children: "\uCD5C\uC2E0\uC21C" }), _jsx("option", { value: "liked", children: "\uB3C4\uC6C0\uC21C" })] })] }), _jsx("div", { className: "card list", ref: listRef, children: list.length ? list.map((p) => _jsx(PostItem, { post: p, hit: searching ? hits.get(p.id) : undefined, likes: likeCount.get(p.id) ?? 0, saved: bookmarks.has(p.id) }, p.id)) : (_jsx("div", { className: "empty", children: searching ? _jsxs(_Fragment, { children: ["\uCC3E\uB294 \uCF54\uB4DC\uAC00 \uC5C6\uC5B4\uC694", _jsx("br", {}), _jsx("span", { className: "muted small", children: "\uB2E4\uB978 \uB0B1\uB9D0\uB85C \uCC3E\uAC70\uB098 \uACFC\uC81C\uB97C '\uACFC\uC81C \uC804\uCCB4'\uB85C \uBC14\uAFD4 \uBCF4\uC138\uC694" })] })
                        : filter.view === 'saved' ? _jsxs(_Fragment, { children: ["\uC800\uC7A5\uD55C \uCF54\uB4DC\uAC00 \uC5C6\uC5B4\uC694", _jsx("br", {}), _jsx("span", { className: "muted small", children: "\uAE00 \uC0C1\uC138\uC5D0\uC11C \uC800\uC7A5\uC744 \uB204\uB974\uBA74 \uC5EC\uAE30 \uBAA8\uC5EC\uC694" })] })
                            : filter.view === 'turn' ? '지금 리뷰할 코드가 없어요'
                                : posts.length ? '해당하는 코드가 없어요'
                                    : _jsxs(_Fragment, { children: ["\uC62C\uB77C\uC628 \uCF54\uB4DC\uAC00 \uC5C6\uC5B4\uC694", _jsx("br", {}), _jsx("a", { href: href({ name: 'new' }), children: "\uCF54\uB4DC \uC62C\uB9AC\uAE30" }), profiles.length < 2 && _jsxs(_Fragment, { children: [" \u00B7 ", _jsx("a", { href: href({ name: 'team' }), children: "\uD300\uC6D0 \uCD08\uB300\uD558\uAE30" })] })] }) })) })] }));
}
/** 코드 목록 한 줄 (홈, 내 정보의 저장한 코드에서 써요) */
export function PostItem({ post, hit, likes, saved }) {
    const { comments, person } = useStore();
    const files = filesOf(post);
    const probs = files.flatMap((f) => checkCode(f.code, f.lang));
    const e = probs.filter((x) => x.sev === 'e').length, w = probs.length - e;
    const n = comments.filter((c) => c.post_id === post.id).length;
    const author = person(post.author_id);
    return (_jsxs("a", { className: "item", "data-flip": post.id, href: href({ name: 'post', id: post.id }), children: [_jsx(Avatar, { person: author, size: "lg" }), _jsxs("span", { className: "body", children: [_jsxs("span", { className: "t", children: [saved && _jsx(Icon, { name: "bookmarkOn", className: "t-saved" }), post.title] }), _jsxs("span", { className: "m", children: [author.name, " \u00B7 ", _jsxs("span", { className: "m-file", children: [_jsx(LangIcon, { lang: post.lang, size: 15 }), post.file_name] }), files.length > 1 ? ` 외 ${files.length - 1}개` : '', " \u00B7 ", timeAgo(post.created_at)] }), hit?.where === 'code' && (_jsxs("span", { className: "hit", children: [_jsxs("span", { className: "hit-at", children: [hit.file, ":", hit.line] }), _jsx("code", { children: hit.text })] })), hit?.where === 'ask' && _jsxs("span", { className: "hit", children: [_jsx("span", { className: "hit-at", children: "\uC124\uBA85" }), _jsx("span", { className: "hit-txt", children: hit.text })] }), _jsxs("span", { className: "cnt", children: [e > 0 && _jsxs("span", { className: "e", children: ["\uC624\uB958 ", e] }), w > 0 && _jsxs("span", { className: "w", children: ["\uACBD\uACE0 ", w] }), _jsxs("span", { children: [isShare(post) ? '의견' : '리뷰', " ", n] }), likes > 0 && _jsxs("span", { className: "likes", children: [_jsx(Icon, { name: "thumbOn" }), likes] }), post.version > 1 && _jsxs("span", { children: ["v", post.version] })] })] }), isShare(post) ? _jsx("span", { className: "st share", children: "\uACF5\uC720" }) : _jsx("span", { className: `st ${post.status}`, children: STATUS_LABEL[post.status] })] }));
}
