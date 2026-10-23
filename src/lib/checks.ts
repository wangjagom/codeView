export type Severity = 'e' | 'w';

export interface Problem {
  /** 1부터 시작하는 줄 번호 */
  line: number;
  sev: Severity;
  title: string;
  easy: string;
  /** 물결 밑줄을 칠 부분. 줄 안에 없으면 밑줄 없이 줄만 표시해요. */
  match: string;
  rule: string;
}

interface LineRule {
  rule: string;
  sev: Severity;
  re: RegExp;
  title: string;
  easy: string;
  langs?: string[];
}

const JS_LANGS = ['JavaScript', 'TypeScript', 'JSX', 'TSX'];
const REACT_LANGS = ['JSX', 'TSX', 'JavaScript', 'TypeScript'];

const LINE_RULES: LineRule[] = [
  {
    rule: 'react/no-direct-call', sev: 'e', langs: REACT_LANGS,
    re: /on[A-Z]\w*=\{\s*[\w.]+\([^)]*\)\s*\}/,
    title: '렌더링할 때 이벤트 함수가 바로 실행돼요',
    easy: '괄호를 붙이면 클릭을 기다리지 않고 지금 실행돼요. () => 로 감싸서 넘겨 주세요.',
  },
  {
    rule: 'react/no-array-index-key', sev: 'w', langs: REACT_LANGS,
    re: /key=\{\s*(index|idx|i)\s*\}/,
    title: 'index를 key로 쓰고 있어요',
    easy: '항목이 지워지거나 순서가 바뀌면 상태가 섞여요. 고유한 id를 key로 쓰세요.',
  },
  {
    rule: 'no-var', sev: 'w', langs: JS_LANGS,
    re: /(^|[^\w$.])var\s+[\w$]/,
    title: 'var 대신 let이나 const를 써요',
    easy: 'var는 블록 밖에서도 보이고 반복문에서 값이 공유돼서 실수하기 쉬워요.',
  },
  {
    rule: 'eqeqeq', sev: 'w', langs: JS_LANGS,
    re: /[^=!<>]==[^=]|!=[^=]/,
    title: '== 대신 ===를 써요',
    easy: '==는 타입을 바꿔서 비교해요. 0 == "" 도 true가 돼요.',
  },
  {
    rule: 'no-console', sev: 'w', langs: JS_LANGS,
    re: /console\.log\(/,
    title: 'console.log가 남아 있어요',
    easy: '확인용 로그라면 리뷰 전에 지울지 생각해 보세요.',
  },
  {
    rule: 'no-unawaited-json', sev: 'e', langs: JS_LANGS,
    re: /=\s*fetch\(/,
    title: 'fetch 결과를 기다리지 않고 쓰고 있어요',
    easy: 'fetch는 Promise를 돌려줘요. await fetch(...) 또는 .then()으로 기다려야 응답을 쓸 수 있어요.',
  },
  {
    rule: 'reduce-initial-value', sev: 'w', langs: JS_LANGS,
    re: /\.reduce\(\s*\([^)]*\)\s*=>[^,]*\)\s*;?\s*$/,
    title: 'reduce에 초기값이 없어요',
    easy: '빈 배열이면 "Reduce of empty array with no initial value" 에러가 나요. 두 번째 인자로 초기값을 넣어 주세요.',
  },
];

const MATCH_PART: Record<string, (line: string) => string> = {
  'react/no-direct-call': (l) => l.match(/on[A-Z]\w*=\{\s*[\w.]+\([^)]*\)\s*\}/)?.[0] ?? '',
  'react/no-array-index-key': (l) => l.match(/key=\{\s*(index|idx|i)\s*\}/)?.[0] ?? '',
  'no-var': () => 'var',
  eqeqeq: (l) => (l.includes('!=') ? '!=' : '=='),
  'no-console': () => 'console.log',
  'no-unawaited-json': (l) => l.match(/fetch\([^)]*\)/)?.[0] ?? 'fetch',
  'reduce-initial-value': () => '.reduce',
};

/** 문자열과 한 줄 주석을 지운 줄. 괄호 검사와 규칙 검사가 문자열 안 내용에 속지 않게 해요. */
function stripLine(line: string): string {
  return line
    .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, (m) => m[0] + ' '.repeat(Math.max(0, m.length - 2)) + m[0])
    .replace(/\/\/.*$/, '');
}

const PAIRS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

export function bracketProblem(lines: string[]): Problem | null {
  const stack: { ch: string; line: number }[] = [];
  let inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    let text = stripLine(lines[i]);
    if (inBlock) {
      const end = text.indexOf('*/');
      if (end < 0) continue;
      text = text.slice(end + 2);
      inBlock = false;
    }
    text = text.replace(/\/\*.*?\*\//g, '');
    const start = text.indexOf('/*');
    if (start >= 0) { text = text.slice(0, start); inBlock = true; }
    for (const ch of text) {
      if (ch === '(' || ch === '[' || ch === '{') stack.push({ ch, line: i + 1 });
      else if (PAIRS[ch]) {
        const top = stack.pop();
        if (!top || top.ch !== PAIRS[ch]) {
          return { line: i + 1, sev: 'e', rule: 'brackets', match: ch, title: top ? `'${top.ch}'를 닫아야 하는데 '${ch}'가 왔어요` : `여는 괄호 없이 '${ch}'가 있어요`, easy: '괄호 짝이 맞는지 확인해 보세요.' };
        }
      }
    }
  }
  const open = stack.pop();
  if (open) return { line: open.line, sev: 'e', rule: 'brackets', match: open.ch, title: `'${open.ch}' 괄호가 닫히지 않았어요`, easy: '어디서 닫아야 하는지 확인해 보세요.' };
  return null;
}

/** 붙여넣은 코드에서 초보자가 자주 하는 실수를 찾아요. 한 줄에 하나만 보여 줘요. */
export function checkCode(code: string, lang = 'JavaScript'): Problem[] {
  const lines = code.split('\n');
  const out: Problem[] = [];
  const bracketLangs = [...JS_LANGS, 'CSS', 'Java'];
  if (bracketLangs.includes(lang)) {
    const b = bracketProblem(lines);
    if (b) out.push(b);
  }
  lines.forEach((raw, i) => {
    if (out.some((p) => p.line === i + 1)) return;
    const text = stripLine(raw);
    for (const r of LINE_RULES) {
      if (r.langs && !r.langs.includes(lang)) continue;
      if (!r.re.test(text)) continue;
      if (r.rule === 'no-unawaited-json' && /await\s+fetch\(|\.then\(/.test(text)) continue;
      out.push({ line: i + 1, sev: r.sev, title: r.title, easy: r.easy, rule: r.rule, match: MATCH_PART[r.rule]?.(raw) ?? '' });
      break;
    }
  });
  return out.sort((a, b) => (a.sev === b.sev ? a.line - b.line : a.sev === 'e' ? -1 : 1));
}
