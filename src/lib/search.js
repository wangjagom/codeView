import { filesOf } from './types';
/**
 * 띄어쓰기로 나눈 낱말이 모두 들어 있는 글을 찾아요 (대소문자 무시).
 * 제목·설명·과제·글쓴이·파일 이름·모든 파일의 코드에서 찾아요.
 */
export function searchPosts(posts, query, authorName) {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const out = new Map();
    if (!terms.length)
        return out;
    for (const p of posts) {
        const files = filesOf(p);
        const hay = [p.title, p.ask, p.task, authorName(p.author_id), ...files.map((f) => `${f.name}\n${f.code}`)].join('\n').toLowerCase();
        if (!terms.every((t) => hay.includes(t)))
            continue;
        out.set(p.id, bestHit(p, files, terms));
    }
    return out;
}
function bestHit(p, files, terms) {
    const has = (s) => terms.some((t) => s.toLowerCase().includes(t));
    // 코드 줄에서 찾은 게 있으면 그걸 보여 주는 게 가장 쓸모 있어요.
    const all = (s) => terms.every((t) => s.toLowerCase().includes(t));
    for (const test of [all, has]) {
        for (const f of files) {
            const lines = f.code.split('\n');
            const i = lines.findIndex((l) => test(l));
            if (i >= 0)
                return { where: 'code', file: f.name, line: i + 1, text: lines[i].trim().slice(0, 120) };
        }
    }
    if (has(p.title))
        return { where: 'title' };
    if (files.some((f) => has(f.name)))
        return { where: 'file', file: files.find((f) => has(f.name)).name };
    if (has(p.ask))
        return { where: 'ask', text: p.ask.replace(/\s+/g, ' ').slice(0, 120) };
    return { where: 'meta' };
}
