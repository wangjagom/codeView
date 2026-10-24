import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, StatusPill } from '../components/Avatar';
import { CopyButton } from '../components/CopyButton';
import { Icon } from '../components/Icon';
import { BackBar } from '../components/Layout';
import { CodeView } from '../components/CodeView';
import { addLineComment, applySuggestion, deleteComment, deletePost, friendlyError, getPost, setResolved, setStatus, updateComment } from '../lib/api';
import { checkCode } from '../lib/checks';
import { fenceOf, langLabel } from '../lib/langs';
import { href, navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { STATUS_LABEL, filesOf, isShare, versionFiles } from '../lib/types';
import { timeAgo } from '../lib/util';
import { Loading } from '../components/Motion';
import { RichText } from '../components/RichText';
import { MoreMenu } from '../components/MoreMenu';
import { copyText } from '../lib/util';
import { download, makeZip, safeName } from '../lib/zip';
import { LangIcon } from '../components/LangIcon';
export function PostDetail({ id }) {
    const { me, person, tick, refresh, toast, likes, bookmarks, toggleLike, toggleBookmark } = useStore();
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [viewVersion, setViewVersion] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [fileIdx, setFileIdx] = useState(0);
    const load = useCallback(async () => {
        try {
            setData(await getPost(id));
            setError('');
        }
        catch (e) {
            setError(friendlyError(e));
        }
    }, [id]);
    useEffect(() => { load(); }, [load, tick]);
    useEffect(() => { setViewVersion(null); setConfirmDelete(false); setFileIdx(0); }, [id]);
    const post = data?.post;
    // 보고 있는 버전의 파일들과, 그중 지금 연 파일
    const shownFiles = useMemo(() => {
        if (!post || !data)
            return [];
        const v = viewVersion ? data.versions.find((x) => x.version === viewVersion) : null;
        return v ? versionFiles(v, post) : filesOf(post);
    }, [post, data, viewVersion]);
    const fi = Math.min(fileIdx, Math.max(0, shownFiles.length - 1));
    useEffect(() => { document.querySelector('.file-tabs.view .ftab.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [fi]);
    const curFile = shownFiles[fi] ?? { name: post?.file_name ?? '', lang: post?.lang ?? 'JavaScript', code: post?.code ?? '' };
    const shownCode = curFile.code;
    const allProblems = useMemo(() => shownFiles.map((f) => checkCode(f.code, f.lang)), [shownFiles]);
    const problems = allProblems[fi] ?? [];
    if (error)
        return _jsxs("section", { children: [_jsx(BackBar, {}), _jsx("div", { className: "empty", children: error })] });
    if (!data || !post)
        return _jsx("section", { children: _jsx("div", { className: "empty", children: _jsx(Loading, {}) }) });
    const author = person(post.author_id);
    const isAuthor = post.author_id === me.id;
    const e = problems.filter((p) => p.sev === 'e').length, w = problems.length - e;
    const reviewCount = data.threads.reduce((n, t) => n + t.comments.length, 0);
    const readOnly = viewVersion !== null && viewVersion !== post.version;
    const run = async (fn, ok) => {
        try {
            await fn();
            await Promise.all([load(), refresh()]);
            if (ok)
                toast(ok);
            return true;
        }
        catch (err) {
            toast(friendlyError(err));
            return false;
        }
    };
    const share = isShare(post);
    const likeN = likes.filter((l) => l.post_id === post.id).length;
    const liked = likes.some((l) => l.post_id === post.id && l.user_id === me.id);
    const saved = bookmarks.has(post.id);
    const onComment = (line, body, s, threadId) => run(() => addLineComment(post.id, line, body, s, threadId, fi), share ? '의견을 남겼어요' : '리뷰를 남겼어요');
    const onResolve = (tid, r) => { run(() => setResolved(tid, r), r ? '대화를 해결로 표시했어요' : '대화를 다시 열었어요'); };
    const onApply = (cid) => { run(() => applySuggestion(cid), '제안을 적용했어요'); };
    const onEdit = (cid, body) => run(() => updateComment(cid, body), '리뷰를 고쳤어요');
    const onDelete = (cid) => run(() => deleteComment(cid), '리뷰를 지웠어요');
    const onStatus = (s) => { run(() => setStatus(post.id, s), `'${STATUS_LABEL[s]}'(으)로 바꿨어요`); };
    const postLink = () => location.href.split('#')[0] + href({ name: 'post', id: post.id });
    const chatText = () => {
        const summary = share ? (post.ask ? `${post.ask}\n` : '') + `질문·의견 ${reviewCount}` : `${e || w ? `오류 ${e} · 경고 ${w} · ` : ''}리뷰 ${reviewCount}`;
        const others = shownFiles.length > 1 ? `\n다른 파일: ${shownFiles.filter((_, i) => i !== fi).map((f) => f.name).join(', ')}` : '';
        return `**${share ? '[공유] ' : ''}${post.title}** (${curFile.name} · v${post.version})\n\`\`\`${fenceOf(curFile.lang)}\n${shownCode}\n\`\`\`\n${summary}${others}\n${postLink()}`;
    };
    const fileName = safeName(curFile.name, 'code.txt');
    const saveFile = () => download(fileName, shownCode, 'text/plain;charset=utf-8');
    const saveZip = () => {
        const readme = [
            `# ${post.title}`, '',
            `- 작성: ${author.name} · ${post.created_at.slice(0, 10)}`,
            `- 과제: ${post.task}`, `- 버전: v${viewVersion ?? post.version}`, `- 링크: ${postLink()}`,
            '', '## 파일', '', ...shownFiles.map((f) => `- \`${f.name}\` (${langLabel(f.lang)})`),
            ...(post.ask ? ['', share ? '## 설명' : '## 요청 사항', '', post.ask] : []), '',
        ].join('\n');
        const entries = shownFiles.map((f) => ({ name: safeName(f.name, 'code.txt'), text: f.code.endsWith('\n') ? f.code : `${f.code}\n` }));
        if (!entries.some((x) => x.name.toLowerCase() === 'readme.md'))
            entries.push({ name: 'README.md', text: readme });
        download(`${safeName(post.title, 'codeview')}.zip`, makeZip(entries), 'application/zip');
    };
    return (_jsxs("section", { children: [_jsx(BackBar, {}), _jsxs("div", { className: "meta-row", children: [_jsx(Avatar, { person: author, size: "xs" }), _jsx("b", { children: author.name }), _jsx("span", { className: "dot" }), timeAgo(post.created_at), _jsx("span", { className: "dot" }), post.task] }), _jsx("h1", { className: "h-big tight", children: post.title }), _jsxs("div", { className: "post-acts", children: [_jsxs("button", { type: "button", className: `pill-btn ${liked ? 'on' : ''}`, "aria-pressed": liked, onClick: () => toggleLike(post.id), children: [_jsx(Icon, { name: liked ? 'thumbOn' : 'thumb' }), "\uB3C4\uC6C0\uB410\uC5B4\uC694", likeN > 0 && _jsx("b", { children: likeN })] }), _jsxs("button", { type: "button", className: `pill-btn ${saved ? 'on' : ''}`, "aria-pressed": saved, onClick: () => toggleBookmark(post.id), children: [_jsx(Icon, { name: saved ? 'bookmarkOn' : 'bookmark' }), saved ? '저장됨' : '저장'] }), isAuthor && _jsxs("a", { className: "pill-btn", href: href({ name: 'edit', id: post.id }), children: [_jsx(Icon, { name: "edit" }), "\uC218\uC815"] })] }), post.ask && _jsxs("div", { className: "ask", children: [_jsx("span", { className: "lbl", children: share ? '설명' : '요청 사항' }), _jsx("span", { className: "body cm-text", children: _jsx(RichText, { text: post.ask, lang: post.lang }) })] }), share ? (_jsx("div", { className: "card status-card", children: _jsxs("div", { className: "status-row", children: [_jsx("span", { className: "st share", children: "\uCF54\uB4DC \uACF5\uC720" }), _jsx("span", { className: "sp" }), _jsxs("span", { className: "muted small", children: ["\uC9C8\uBB38\u00B7\uC758\uACAC ", reviewCount] })] }) })) : _jsxs("div", { className: "card status-card", children: [_jsxs("div", { className: "status-row", children: [_jsx(StatusPill, { status: post.status }), post.reviewer_ids.length > 0 && _jsxs("span", { className: "revs", children: ["\uB9AC\uBDF0\uC5B4 ", post.reviewer_ids.map((rid) => _jsx(Avatar, { person: person(rid), size: "xs" }, rid))] }), _jsx("span", { className: "sp" }), _jsxs("span", { className: "muted small", children: ["\uB9AC\uBDF0 ", reviewCount] })] }), isAuthor ? (_jsx("div", { className: "seg seg3", role: "group", "aria-label": "\uC0C1\uD0DC \uBC14\uAFB8\uAE30", children: Object.keys(STATUS_LABEL).map((s) => _jsx("button", { type: "button", "aria-pressed": post.status === s, onClick: () => onStatus(s), children: STATUS_LABEL[s] }, s)) })) : null] }), _jsxs("div", { className: "d-grid", children: [_jsxs("div", { className: "code", children: [shownFiles.length > 1 && (_jsx("div", { className: "file-tabs view", role: "tablist", "aria-label": `파일 ${shownFiles.length}개`, children: shownFiles.map((f, i) => {
                                    const ps = allProblems[i] ?? [];
                                    const pe = ps.filter((p) => p.sev === 'e').length;
                                    const n = readOnly ? 0 : data.threads.filter((t) => (t.file ?? 0) === i).reduce((k, t) => k + t.comments.length, 0);
                                    return (_jsx("span", { className: `ftab ${i === fi ? 'on' : ''}`, children: _jsxs("button", { type: "button", role: "tab", "aria-selected": i === fi, className: "ftab-name", onClick: () => setFileIdx(i), children: [_jsx(LangIcon, { lang: f.lang, size: 16 }), f.name, pe > 0 ? _jsx("i", { className: "ftab-dot e", "aria-label": `오류 ${pe}` }) : ps.length > 0 ? _jsx("i", { className: "ftab-dot w", "aria-label": `경고 ${ps.length}` }) : null, n > 0 && _jsx("span", { className: "ftab-n", "aria-label": `리뷰 ${n}개`, children: n })] }) }, f.name));
                                }) })), _jsxs("div", { className: "code-h", children: [_jsxs("span", { className: "file", children: [_jsx(LangIcon, { lang: curFile.lang, size: 20 }), curFile.name] }), _jsxs("span", { className: "muted small", children: [langLabel(curFile.lang), shownFiles.length > 1 ? ` · ${fi + 1}/${shownFiles.length}` : ''] }), e > 0 && _jsxs("span", { className: "pill e", children: ["\uC624\uB958 ", e] }), w > 0 && _jsxs("span", { className: "pill w", children: ["\uACBD\uACE0 ", w] }), !e && !w && _jsx("span", { className: "pill ok", children: "\uAC80\uC0AC \uD1B5\uACFC" })] }), _jsxs("div", { className: "code-tools", role: "group", "aria-label": "\uBCF5\uC0AC", children: [_jsx(CopyButton, { text: () => shownCode, label: "\uCF54\uB4DC \uBCF5\uC0AC", onFail: toast }), _jsx(CopyButton, { text: postLink, label: "\uB9C1\uD06C \uBCF5\uC0AC", icon: "link", onFail: toast }), _jsx(MoreMenu, { items: [
                                            { label: '채팅용 복사', icon: 'chat', hint: '디스코드·카톡에 붙이기 좋게', onSelect: async () => toast((await copyText(chatText())) ? '채팅용으로 복사했어요' : '복사가 막혀 있어요. 코드를 길게 눌러 직접 복사해 주세요') },
                                            { label: '파일 저장', icon: 'download', hint: fileName, onSelect: saveFile },
                                            { label: shownFiles.length > 1 ? `zip 저장 (${shownFiles.length}개)` : 'zip 저장', icon: 'zip', hint: '모든 파일 + README.md', onSelect: saveZip },
                                        ] })] }), _jsx("p", { className: "code-hint", children: readOnly ? _jsxs(_Fragment, { children: [_jsxs("b", { children: ["v", viewVersion] }), " \uBCF4\uB294 \uC911 \u00B7 \uC9C0\uB09C \uBC84\uC804\uC5D0\uB294 \uB9AC\uBDF0\uB97C \uB2EC \uC218 \uC5C6\uC5B4\uC694"] }) : _jsx(_Fragment, { children: share ? '줄 번호를 눌러 질문·의견을 남겨요' : '줄 번호를 눌러 리뷰를 남겨요' }) }), _jsx(CodeView, { code: shownCode, lang: curFile.lang, problems: problems, threads: readOnly ? [] : data.threads.filter((t) => (t.file ?? 0) === fi), person: person, isAuthor: isAuthor, readOnly: readOnly, onComment: onComment, onResolve: onResolve, onApply: onApply, meId: me.id, onEdit: onEdit, onDelete: onDelete }, `${fi}-${viewVersion ?? 'now'}`), !readOnly && !data.threads.some((t) => (t.file ?? 0) === fi) && (_jsx("div", { className: "no-review", children: share ? '질문·의견 없음' : isAuthor || !problems[0] ? '리뷰 없음'
                                    : _jsxs(_Fragment, { children: ["\uB9AC\uBDF0 \uC5C6\uC74C \u00B7 \uAC80\uC0AC \uACB0\uACFC: ", _jsxs("a", { href: `#L${problems[0].line}`, onClick: (ev) => { ev.preventDefault(); document.getElementById(`L${problems[0].line}`)?.scrollIntoView({ block: 'center' }); }, children: [problems[0].line, "\uBC88\uC9F8 \uC904"] })] }) }))] }), _jsxs("div", { children: [_jsxs("div", { className: "sec-h", children: [_jsx("h2", { children: "\uBC84\uC804" }), _jsxs("span", { className: "muted small", children: [data.versions.length, "\uAC1C"] })] }), _jsx("div", { className: "card list", children: [...data.versions].reverse().map((v) => {
                                    const current = v.version === post.version;
                                    const active = (viewVersion ?? post.version) === v.version;
                                    return (_jsxs("button", { type: "button", className: `item ${active ? 'active' : ''}`, onClick: () => setViewVersion(current ? null : v.version), children: [_jsxs("span", { className: "body", children: [_jsxs("span", { className: "t", children: ["v", v.version, " \u00B7 ", v.note] }), _jsxs("span", { className: "m", children: [person(v.created_by).name, " \u00B7 ", timeAgo(v.created_at)] })] }), current ? _jsx("span", { className: "pill n", children: "\uC9C0\uAE08" }) : active ? _jsx("span", { className: "pill ok", children: "\uBCF4\uB294 \uC911" }) : _jsx(Icon, { name: "chev", className: "chev" })] }, v.version));
                                }) })] }), isAuthor && (_jsx("div", { className: "danger", children: confirmDelete ? (_jsxs(_Fragment, { children: [_jsx("span", { children: "\uC774 \uCF54\uB4DC\uC640 \uB9AC\uBDF0\uB97C \uBAA8\uB450 \uC9C0\uC6B8\uAE4C\uC694? \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC5B4\uC694." }), _jsx("button", { type: "button", className: "btn sm", onClick: () => setConfirmDelete(false), children: "\uCDE8\uC18C" }), _jsx("button", { type: "button", className: "btn sm danger-btn", onClick: async () => { try {
                                        await deletePost(post.id);
                                        await refresh();
                                        toast('삭제했어요');
                                        navigate({ name: 'feed' });
                                    }
                                    catch (err) {
                                        toast(friendlyError(err));
                                    } }, children: "\uC0AD\uC81C" })] })) : _jsxs("button", { type: "button", className: "txt-btn red with-ic", onClick: () => setConfirmDelete(true), children: [_jsx(Icon, { name: "trash" }), "\uC774 \uAE00 \uC0AD\uC81C"] }) }))] })] }));
}
