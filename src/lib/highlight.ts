export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 토큰 하나: 정규식 조각과 CSS 클래스. 'word'는 키워드 표에 따라 색을 정해요. */
type Part = [cls: string, pattern: string];

interface Grammar {
  parts: Part[];
  keywords?: Set<string>;
  /** 키워드를 대소문자 구분 없이 볼지 (ABAP, CDS, SQL) */
  ci?: boolean;
  /** 키워드가 아닌 이름을 변수 색으로 칠할지 */
  vars?: boolean;
  /** 줄 전체를 주석으로 보는 규칙 (ABAP의 첫 칸 *) */
  lineComment?: RegExp;
}

const words = (s: string) => new Set(s.split(/\s+/).filter(Boolean));

const JS_KW = words('import from export default function const let var return await async if else for while do switch case break continue new true false null undefined try catch finally throw typeof instanceof class extends this of in');
const ABAP_KW = words(`report program data types type ref to table of standard sorted hashed key unique non-unique with default
  begin end occurs like value constants field-symbols parameters select-options selection-screen start-of-selection end-of-selection
  initialization at line-selection top-of-page select single from into corresponding fields where and or not in between like is initial bound
  order by group having up rows appending inner left outer join on as distinct count sum min max avg for all entries endselect
  loop endloop at assigning read index transporting modify append insert delete clear refresh free sort ascending descending
  if elseif else endif case when others endcase do enddo while endwhile exit continue check return
  class definition implementation endclass public protected private section methods method endmethod importing exporting changing returning
  raising redefinition final abstract create interface endinterface interfaces inheriting constructor class-methods class-data me new
  try catch cleanup endtry raise exception form endform perform using function endfunction call screen module endmodule
  write uline skip message commit work rollback concatenate split condense translate replace shift move
  cond switch conv cast reduce filter corresponding let then lines line_exists line_index sy-subrc sy-tabix sy-datum abap_true abap_false`);
const CDS_KW = words(`define root view entity as select from projection on association composition to one many of parent
  key cast case when then else end where and or not group by having union all distinct with parameters inner left outer join
  extend annotate expose provider contract transactional_query`);
const SQL_KW = words(`select from where and or not in as join inner left outer on group by order having union all distinct insert into
  update set delete values case when then else end is null like between begin end declare return returns language sqlscript
  options read-only using method by database procedure function table count sum min max avg`);
const CSS_KW = words('important media keyframes from to');
/** 흐름을 바꾸는 키워드는 VS Code처럼 다른 색(보라)으로 보여 줘요. */
const CONTROL = words(`import from export default return if else for while do switch case break continue try catch finally throw await
  endif loop endloop enddo endwhile elseif endcase when others exit check endtry raise perform call`);

const STR_SQ = "'(?:[^'\\\\]|\\\\.)*'";
const STR_DQ = '"(?:[^"\\\\]|\\\\.)*"';
const STR_BT = '`(?:[^`\\\\]|\\\\.)*`';
const NUM = '\\b\\d+(?:\\.\\d+)?\\b';
const WORD = '[A-Za-z_$][\\w$]*';

const GRAMMARS: Record<string, Grammar> = {
  JavaScript: {
    parts: [['c', '\\/\\/.*$|\\/\\*.*?\\*\\/'], ['s', `${STR_SQ}|${STR_DQ}|${STR_BT}`], ['tg', '<\\/?[A-Za-z][\\w.]*'], ['n', NUM], ['word', WORD]],
    keywords: JS_KW, vars: true,
  },
  ABAP: {
    lineComment: /^\*/,
    // "부터 줄 끝까지 주석, |문자열 템플릿|, 'text', `text`, <필드심볼>
    parts: [['c', '".*$'], ['s', "\\|(?:[^|\\\\]|\\\\.)*\\||'(?:[^']|'')*'|`(?:[^`]|``)*`"], ['ty', '<[\\w-]+>'], ['n', NUM], ['word', '[A-Za-z_][\\w-]*(?:\\s*\\(\\s*\\))?']],
    keywords: ABAP_KW, ci: true, vars: true,
  },
  CDS: {
    parts: [['c', '\\/\\/.*$|\\/\\*.*?\\*\\/|--.*$'], ['ty', '@[\\w.]+'], ['s', "'(?:[^']|'')*'"], ['n', NUM], ['word', '[A-Za-z_][\\w]*']],
    keywords: CDS_KW, ci: true,
  },
  SQLScript: {
    parts: [['c', '--.*$|\\/\\*.*?\\*\\/|".*$'], ['s', "'(?:[^']|'')*'"], ['ty', ':\\w+'], ['n', NUM], ['word', '[A-Za-z_][\\w-]*']],
    keywords: SQL_KW, ci: true,
  },
  XML: {
    parts: [['c', '<!--.*?-->'], ['tg', '<\\/?[\\w:.-]+|\\/?>'], ['s', `${STR_DQ}|${STR_SQ}`], ['at', '[\\w:.-]+(?==)']],
  },
  HTML: {
    parts: [['c', '<!--.*?-->'], ['tg', '<\\/?[\\w-]+|\\/?>'], ['s', `${STR_DQ}|${STR_SQ}`], ['at', '[\\w:-]+(?==)']],
  },
  CSS: {
    parts: [['c', '\\/\\*.*?\\*\\/'], ['s', `${STR_DQ}|${STR_SQ}`], ['at', '[\\w-]+(?=\\s*:)'], ['n', '#[0-9a-fA-F]{3,8}\\b|\\b\\d+(?:\\.\\d+)?(?:px|rem|em|%|vh|vw|s|ms)?\\b'], ['ty', '[.#][\\w-]+'], ['word', '@?[\\w-]+']],
    keywords: CSS_KW,
  },
  JSON: {
    parts: [['at', `${STR_DQ}(?=\\s*:)`], ['s', STR_DQ], ['n', '-?\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b'], ['k', '\\b(?:true|false|null)\\b']],
  },
};
// 예전에 올라온 글의 언어도 비슷한 문법으로 보여 줘요.
GRAMMARS.TypeScript = GRAMMARS.JSX = GRAMMARS.TSX = GRAMMARS.Java = GRAMMARS.JavaScript;
GRAMMARS.SQL = GRAMMARS.SQLScript;
GRAMMARS.Python = { parts: [['c', '#.*$'], ['s', `${STR_SQ}|${STR_DQ}`], ['n', NUM], ['word', WORD]], keywords: words('def class return if elif else for while in import from as try except finally with lambda None True False and or not pass raise self') };

const cache = new Map<string, { re: RegExp; classes: string[] }>();
function compiled(lang: string) {
  let c = cache.get(lang);
  if (!c) {
    const g = GRAMMARS[lang] ?? GRAMMARS.JavaScript;
    c = { re: new RegExp(g.parts.map(([, p]) => `(${p})`).join('|'), 'gm'), classes: g.parts.map(([cls]) => cls) };
    cache.set(lang, c);
  }
  c.re.lastIndex = 0;
  return c;
}

/** 한 줄을 하이라이트한 HTML. 입력은 모두 이스케이프돼요. */
export function highlight(src: string, lang = 'JavaScript'): string {
  const g = GRAMMARS[lang] ?? GRAMMARS.JavaScript;
  if (g.lineComment?.test(src)) return `<span class="c">${esc(src)}</span>`;
  const { re, classes } = compiled(lang);
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (!m[0]) { re.lastIndex++; continue; }
    out += esc(src.slice(last, m.index));
    const gi = m.slice(1).findIndex((x) => x !== undefined);
    let cls = classes[gi];
    const t = esc(m[0]);
    if (cls === 'word') {
      const w = g.ci ? m[0].toLowerCase() : m[0];
      if (g.keywords?.has(w)) cls = CONTROL.has(w.toLowerCase()) ? 'kc' : 'k';
      else if (!g.ci && /^[A-Z]/.test(m[0])) cls = 'ty';
      else if (/^\s*\(/.test(src.slice(m.index + m[0].length)) || /\(\s*\)$/.test(m[0])) cls = 'f';
      else cls = g.vars ? 'v' : '';
    }
    out += cls ? `<span class="${cls}">${t}</span>` : t;
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
