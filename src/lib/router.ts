import { useEffect, useState } from 'react';

export type Route =
  | { name: 'feed' }
  | { name: 'new' }
  | { name: 'post'; id: string }
  | { name: 'me' }
  | { name: 'team' }
  | { name: 'teams' }
  | { name: 'join'; code: string };

export function parse(hash: string): Route {
  const h = hash.replace(/^#\/?/, '');
  const [a, b] = h.split('/');
  if (a === 'new') return { name: 'new' };
  if (a === 'me') return { name: 'me' };
  if (a === 'team') return { name: 'team' };
  if (a === 'teams') return { name: 'teams' };
  if (a === 'join' && b) return { name: 'join', code: decodeURIComponent(b) };
  if (a === 'post' && b) return { name: 'post', id: decodeURIComponent(b) };
  return { name: 'feed' };
}

export function href(r: Route): string {
  switch (r.name) {
    case 'new': return '#/new';
    case 'me': return '#/me';
    case 'team': return '#/team';
    case 'teams': return '#/teams';
    case 'join': return `#/join/${encodeURIComponent(r.code)}`;
    case 'post': return `#/post/${encodeURIComponent(r.id)}`;
    default: return '#/';
  }
}

export function navigate(r: Route) {
  location.hash = href(r);
}

/** 초대 링크 전체 주소 */
export function inviteUrl(code: string): string {
  return location.href.split('#')[0] + href({ name: 'join', code });
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    const on = () => { setRoute(parse(location.hash)); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
