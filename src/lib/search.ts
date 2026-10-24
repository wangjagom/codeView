import { filesOf, type Post } from './types';

/** 검색에 걸린 곳. 코드에서 찾았으면 파일·줄·그 줄 내용도 알려 줘요. */
export interface SearchHit { where: 'title' | 'ask' | 'file' | 'code' | 'meta'; file?: string; line?: number; text?: string }

/**
 * 띄어쓰기로 나눈 낱말이 모두 들어 있는 글을 찾아요 (대소문자 무시).
 * 제목·설명·과제·글쓴이·파일 이름·모든 파일의 코드에서 찾아요.
 */
export function searchPosts(posts: Post[], query: string, authorName: (id: string) => string): Map<string, SearchHit> {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const out = new Map<string, SearchHit>();
  if (!terms.length) return out;
  for (const p of posts) {
    const files = filesOf(p);
    const hay = [p.title, p.ask, p.task, authorName(p.author_id), ...files.map((f) => `${f.name}\n${f.code}`)].join('\n').toLowerCase();
    if (!terms.every((t) => hay.includes(t))) continue;
    out.set(p.id, bestHit(p, files, terms));
  }
  return out;
}

function bestHit(p: Post, files: ReturnType<typeof filesOf>, terms: string[]): SearchHit {
  const has = (s: string) => terms.some((t) => s.toLowerCase().includes(t));
  // 코드 줄에서 찾은 게 있으면 그걸 보여 주는 게 가장 쓸모 있어요.
  const all = (s: string) => terms.every((t) => s.toLowerCase().includes(t));
  for (const test of [all, has]) {
    for (const f of files) {
      const lines = f.code.split('\n');
      const i = lines.findIndex((l) => test(l));
      if (i >= 0) return { where: 'code', file: f.name, line: i + 1, text: lines[i].trim().slice(0, 120) };
    }
  }
  if (has(p.title)) return { where: 'title' };
  if (files.some((f) => has(f.name))) return { where: 'file', file: files.find((f) => has(f.name))!.name };
  if (has(p.ask)) return { where: 'ask', text: p.ask.replace(/\s+/g, ' ').slice(0, 120) };
  return { where: 'meta' };
}
