import { useEffect, useState } from 'react';

export type Route =
  | { name: 'feed' }
  | { name: 'new' }
  | { name: 'post'; id: string }
  | { name: 'me' };

export function parse(hash: string): Route {
  const h = hash.replace(/^#\/?/, '');
  const [a, b] = h.split('/');
  if (a === 'new') return { name: 'new' };
  if (a === 'me') return { name: 'me' };
  if (a === 'post' && b) return { name: 'post', id: decodeURIComponent(b) };
  return { name: 'feed' };
}

export function href(r: Route): string {
  switch (r.name) {
    case 'new': return '#/new';
    case 'me': return '#/me';
    case 'post': return `#/post/${encodeURIComponent(r.id)}`;
    default: return '#/';
  }
}

export function navigate(r: Route) {
  location.hash = href(r);
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
