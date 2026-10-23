const KW = new Set(['import', 'from', 'export', 'default', 'function', 'const', 'let', 'var', 'return', 'await', 'async', 'if', 'else', 'for', 'while', 'new', 'true', 'false', 'null', 'undefined', 'try', 'catch', 'throw', 'type', 'interface', 'class', 'extends', 'of', 'in', 'def', 'self', 'None', 'True', 'False', 'public', 'private', 'static', 'void', 'select', 'where', 'insert', 'update']);

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const COMMENT: Record<string, string> = { Python: '#.*$', SQL: '--.*$' };
const STRING = `'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*"|\`(?:[^\`\\\\]|\\\\.)*\``;
const TAG = '<\\/?[A-Za-z][\\w.]*';
const NUM = '\\b\\d+(?:\\.\\d+)?\\b';
const WORD = '\\b[A-Za-z_$][\\w$]*\\b';

const cache = new Map<string, RegExp>();
function tokenRe(lang?: string): RegExp {
  const key = lang ?? '';
  let re = cache.get(key);
  if (!re) {
    const comment = COMMENT[key] ?? '\\/\\/.*$';
    re = new RegExp(`(${comment})|(${STRING})|(${TAG})|(${NUM})|(${WORD})`, 'gm');
    cache.set(key, re);
  }
  re.lastIndex = 0;
  return re;
}

/** 한 줄을 하이라이트한 HTML. 입력은 모두 이스케이프돼요. */
export function highlight(src: string, lang?: string): string {
  const re = tokenRe(lang);
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    const t = esc(m[0]);
    if (m[1]) out += `<span class="c">${t}</span>`;
    else if (m[2]) out += `<span class="s">${t}</span>`;
    else if (m[3]) out += `<span class="tg">${t}</span>`;
    else if (m[4]) out += `<span class="n">${t}</span>`;
    else if (KW.has(m[5])) out += `<span class="k">${t}</span>`;
    else if (/^[A-Z]/.test(m[5])) out += `<span class="ty">${t}</span>`;
    else if (/^\s*\(/.test(src.slice(m.index + m[0].length))) out += `<span class="f">${t}</span>`;
    else out += t;
    last = m.index + m[0].length;
  }
  return out + esc(src.slice(last));
}

/** 하이라이트하면서 match 부분에 물결 밑줄을 쳐요. */
export function highlightWithMark(line: string, match: string, sev: 'e' | 'w', lang?: string): string {
  const i = match ? line.indexOf(match) : -1;
  if (i < 0) return highlight(line, lang);
  return highlight(line.slice(0, i), lang) + `<span class="sq-${sev}">${highlight(match, lang)}</span>` + highlight(line.slice(i + match.length), lang);
}
