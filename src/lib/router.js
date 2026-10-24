import { useEffect, useState } from 'react';
export function parse(hash) {
    const h = hash.replace(/^#\/?/, '');
    const [a, b] = h.split('/');
    if (a === 'new')
        return { name: 'new' };
    if (a === 'me')
        return { name: 'me' };
    if (a === 'team')
        return { name: 'team' };
    if (a === 'teams')
        return { name: 'teams' };
    if (a === 'join' && b)
        return { name: 'join', code: decodeURIComponent(b) };
    if (a === 'post' && b)
        return { name: 'post', id: decodeURIComponent(b) };
    if (a === 'edit' && b)
        return { name: 'edit', id: decodeURIComponent(b) };
    return { name: 'feed' };
}
export function href(r) {
    switch (r.name) {
        case 'new': return '#/new';
        case 'me': return '#/me';
        case 'team': return '#/team';
        case 'teams': return '#/teams';
        case 'join': return `#/join/${encodeURIComponent(r.code)}`;
        case 'post': return `#/post/${encodeURIComponent(r.id)}`;
        case 'edit': return `#/edit/${encodeURIComponent(r.id)}`;
        default: return '#/';
    }
}
export function navigate(r) {
    location.hash = href(r);
}
/** 초대 링크 전체 주소 */
export function inviteUrl(code) {
    return location.href.split('#')[0] + href({ name: 'join', code });
}
export function useRoute() {
    const [route, setRoute] = useState(() => parse(location.hash));
    useEffect(() => {
        const on = () => { setRoute(parse(location.hash)); window.scrollTo(0, 0); };
        window.addEventListener('hashchange', on);
        return () => window.removeEventListener('hashchange', on);
    }, []);
    return route;
}
