import { createContext, useContext } from 'react';
export const StoreContext = createContext(null);
export function useStore() {
    const s = useContext(StoreContext);
    if (!s)
        throw new Error('StoreContext missing');
    return s;
}
const UNKNOWN = { id: '', name: '나간 팀원', color: '#8a919d' };
export function makePerson(profiles) {
    const map = new Map(profiles.map((p) => [p.id, p]));
    return (id) => map.get(id) ?? { ...UNKNOWN, id };
}
/** 내가 리뷰어인데 아직 한 번도 댓글을 안 단, 끝나지 않은 글 */
export function isMyTurn(post, meId, comments) {
    return post.kind !== 'share'
        && post.author_id !== meId
        && post.reviewer_ids.includes(meId)
        && post.status !== 'done'
        && !comments.some((c) => c.post_id === post.id && c.author_id === meId);
}
/* 마지막으로 본 팀과 초대 링크로 받은 코드는 이 브라우저에만 기억해요. */
const LAST_TEAM = 'codeview:team';
const PENDING_CODE = 'codeview:join';
const read = (k) => { try {
    return localStorage.getItem(k);
}
catch {
    return null;
} };
const write = (k, v) => { try {
    if (v)
        localStorage.setItem(k, v);
    else
        localStorage.removeItem(k);
}
catch { /* 저장 못 해도 괜찮아요 */ } };
export const lastTeam = { get: () => read(LAST_TEAM), set: (v) => write(LAST_TEAM, v) };
export const pendingCode = { get: () => read(PENDING_CODE), set: (v) => write(PENDING_CODE, v) };
/** 가입할 때 적은 사진·소개. 프로필이 만들어진 뒤에 저장해요. */
export const pendingProfile = {
    get: () => { try {
        return JSON.parse(read('codeview.pendingProfile') ?? 'null');
    }
    catch {
        return null;
    } },
    set: (v) => write('codeview.pendingProfile', v ? JSON.stringify(v) : null),
};
