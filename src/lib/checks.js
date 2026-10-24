const JS_LANGS = ['JavaScript', 'TypeScript', 'JSX', 'TSX'];
const REACT_LANGS = ['JSX', 'TSX', 'JavaScript', 'TypeScript'];
const LINE_RULES = [
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
LINE_RULES.unshift({
    rule: 'ui5/no-jquery-sap', sev: 'w', langs: ['JavaScript'],
    re: /jQuery\.sap\./,
    title: 'jQuery.sap.* 은 이제 쓰지 않아요',
    easy: 'UI5 최신 버전에서는 sap/base, sap/ui/core 모듈을 sap.ui.define으로 불러서 써요.',
}, {
    rule: 'ui5/no-global-byid', sev: 'w', langs: ['JavaScript'],
    re: /sap\.ui\.getCore\(\)\.byId\(/,
    title: '컨트롤러에서는 this.byId()를 써요',
    easy: 'View 안의 컨트롤은 this.byId("id")로 찾아야 View id가 붙은 진짜 id를 찾아 줘요.',
});
const MATCH_PART = {
    'ui5/no-jquery-sap': () => 'jQuery.sap.',
    'ui5/no-global-byid': () => 'sap.ui.getCore().byId',
    'react/no-direct-call': (l) => l.match(/on[A-Z]\w*=\{\s*[\w.]+\([^)]*\)\s*\}/)?.[0] ?? '',
    'react/no-array-index-key': (l) => l.match(/key=\{\s*(index|idx|i)\s*\}/)?.[0] ?? '',
    'no-var': () => 'var',
    eqeqeq: (l) => (l.includes('!=') ? '!=' : '=='),
    'no-console': () => 'console.log',
    'no-unawaited-json': (l) => l.match(/fetch\([^)]*\)/)?.[0] ?? 'fetch',
    'reduce-initial-value': () => '.reduce',
};
/** 문자열과 한 줄 주석을 지운 줄. 괄호 검사와 규칙 검사가 문자열 안 내용에 속지 않게 해요. */
function stripLine(line) {
    return line
        .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, (m) => m[0] + ' '.repeat(Math.max(0, m.length - 2)) + m[0])
        .replace(/\/\/.*$/, '');
}
const PAIRS = { ')': '(', ']': '[', '}': '{' };
export function bracketProblem(lines) {
    const stack = [];
    let inBlock = false;
    for (let i = 0; i < lines.length; i++) {
        let text = stripLine(lines[i]);
        if (inBlock) {
            const end = text.indexOf('*/');
            if (end < 0)
                continue;
            text = text.slice(end + 2);
            inBlock = false;
        }
        text = text.replace(/\/\*.*?\*\//g, '');
        const start = text.indexOf('/*');
        if (start >= 0) {
            text = text.slice(0, start);
            inBlock = true;
        }
        for (const ch of text) {
            if (ch === '(' || ch === '[' || ch === '{')
                stack.push({ ch, line: i + 1 });
            else if (PAIRS[ch]) {
                const top = stack.pop();
                if (!top || top.ch !== PAIRS[ch]) {
                    return { line: i + 1, sev: 'e', rule: 'brackets', match: ch, title: top ? `'${top.ch}'를 닫아야 하는데 '${ch}'가 왔어요` : `여는 괄호 없이 '${ch}'가 있어요`, easy: '괄호 짝이 맞는지 확인해 보세요.' };
                }
            }
        }
    }
    const open = stack.pop();
    if (open)
        return { line: open.line, sev: 'e', rule: 'brackets', match: open.ch, title: `'${open.ch}' 괄호가 닫히지 않았어요`, easy: '어디서 닫아야 하는지 확인해 보세요.' };
    return null;
}
function checkJsLike(code, lang) {
    const lines = code.split('\n');
    const out = [];
    const bracketLangs = [...JS_LANGS, 'CSS', 'Java'];
    if (bracketLangs.includes(lang)) {
        const b = bracketProblem(lines);
        if (b)
            out.push(b);
    }
    lines.forEach((raw, i) => {
        if (out.some((p) => p.line === i + 1))
            return;
        const text = stripLine(raw);
        for (const r of LINE_RULES) {
            if (r.langs && !r.langs.includes(lang))
                continue;
            if (!r.re.test(text))
                continue;
            if (r.rule === 'no-unawaited-json' && /await\s+fetch\(|\.then\(/.test(text))
                continue;
            out.push({ line: i + 1, sev: r.sev, title: r.title, easy: r.easy, rule: r.rule, match: MATCH_PART[r.rule]?.(raw) ?? '' });
            break;
        }
    });
    return out.sort((a, b) => (a.sev === b.sev ? a.line - b.line : a.sev === 'e' ? -1 : 1));
}
/* ------------------------------------------------------------------ */
/* ABAP                                                               */
/* ------------------------------------------------------------------ */
/** 주석('*' 줄, '"' 뒤)과 문자열('…', `…`, |…|)을 지운 줄 */
export function abapStrip(line) {
    if (/^\*/.test(line))
        return '';
    let out = '';
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"')
            break;
        if (ch === "'" || ch === '`' || ch === '|') {
            const end = line.indexOf(ch, i + 1);
            out += ch + ch; // 빈 문자열로 남겨서 문장 모양은 유지해요
            if (end < 0)
                break;
            i = end;
            continue;
        }
        out += ch;
    }
    return out;
}
const ABAP_BLOCKS = {
    IF: 'ENDIF', LOOP: 'ENDLOOP', DO: 'ENDDO', WHILE: 'ENDWHILE', CASE: 'ENDCASE', TRY: 'ENDTRY',
    METHOD: 'ENDMETHOD', FORM: 'ENDFORM', FUNCTION: 'ENDFUNCTION', MODULE: 'ENDMODULE', CLASS: 'ENDCLASS', INTERFACE: 'ENDINTERFACE',
};
const ABAP_ENDS = new Map(Object.entries(ABAP_BLOCKS).map(([k, v]) => [v, k]));
const ABAP_STARTERS = /^(DATA|TYPES|CONSTANTS|FIELD-SYMBOLS|PARAMETERS|SELECT-OPTIONS|WRITE|SELECT|LOOP|ENDLOOP|IF|ELSEIF|ELSE|ENDIF|CLEAR|FREE|APPEND|READ|MODIFY|DELETE|INSERT|UPDATE|SORT|METHOD|METHODS|ENDMETHOD|CLASS|ENDCLASS|FORM|ENDFORM|PERFORM|CALL|DO|ENDDO|WHILE|ENDWHILE|CASE|WHEN|ENDCASE|TRY|CATCH|ENDTRY|REPORT|START-OF-SELECTION|END-OF-SELECTION|INITIALIZATION|MESSAGE|RETURN|EXIT|CONTINUE|CHECK|ASSIGN|COMMIT|ROLLBACK|RAISE|PUBLIC|PROTECTED|PRIVATE|CONCATENATE|SPLIT|MOVE|TABLES)\b/i;
/** 마침표(.)로 끝나는 문장 단위로 나눠요. 시작 줄 번호를 같이 기억해요. */
function abapStatements(lines) {
    const out = [];
    let cur = '';
    let start = 0;
    lines.forEach((raw, i) => {
        const t = abapStrip(raw).trim();
        if (!t)
            return;
        for (const piece of t.split(/(?<=\.)(?=\s|$)/)) {
            const p = piece.trim();
            if (!p)
                continue;
            if (!cur)
                start = i + 1;
            cur += (cur ? ' ' : '') + p;
            if (p.endsWith('.')) {
                out.push({ line: start, text: cur.slice(0, -1).trim() });
                cur = '';
            }
        }
    });
    if (cur)
        out.push({ line: start, text: cur });
    return out;
}
function checkAbap(code) {
    const lines = code.split('\n');
    const out = [];
    const add = (p) => { if (!out.some((x) => x.line === p.line))
        out.push(p); };
    // 1. 마침표 빠짐: 문장이 안 끝났는데 다음 줄이 새 문장으로 시작하면
    let openLine = 0;
    let depth = 0;
    let prevLine = 0;
    let prevText = '';
    lines.forEach((raw, i) => {
        const t = abapStrip(raw).trim();
        if (!t)
            return;
        const startsNew = ABAP_STARTERS.test(t) || /^[\w-]+(\[\])?\s*(\??=|\+=|-=)\s*\S/.test(t) || /^[\w-]+(->|=>)\w/.test(t);
        if (openLine && depth <= 0 && startsNew && !/[,:]$/.test(prevText)) {
            add({ line: prevLine, sev: 'e', rule: 'abap/period', match: lines[prevLine - 1].trimEnd().split('"')[0].trim().split(/\s+/).pop() ?? '', title: '문장 끝에 마침표(.)가 빠졌어요', easy: 'ABAP은 문장마다 마침표로 끝나야 해요. 이 줄 끝에 . 을 붙여 주세요.' });
            openLine = 0;
            depth = 0;
        }
        if (!openLine) {
            openLine = i + 1;
            depth = 0;
        }
        for (const ch of t) {
            if (ch === '(')
                depth++;
            else if (ch === ')')
                depth--;
        }
        if (/\.$/.test(t) && depth <= 0) {
            openLine = 0;
            depth = 0;
        }
        prevLine = i + 1;
        prevText = t;
    });
    if (openLine)
        add({ line: prevLine, sev: 'e', rule: 'abap/period', match: '', title: '마지막 문장에 마침표(.)가 빠졌어요', easy: 'ABAP은 문장마다 마침표로 끝나야 해요.' });
    // 2. 블록 짝 (IF/ENDIF 등)과 문장 단위 규칙
    const stack = [];
    for (const st of abapStatements(lines)) {
        const upper = st.text.toUpperCase();
        const first = (upper.match(/^[A-Z-]+/) ?? [''])[0];
        const raw = lines[st.line - 1];
        if (ABAP_BLOCKS[first]) {
            const deferred = first === 'CLASS' && /\b(DEFERRED|LOAD)\b/.test(upper);
            const isDecl = first === 'INTERFACE' && /\b(DEFERRED|LOAD)\b/.test(upper);
            if (!deferred && !isDecl)
                stack.push({ kw: first, line: st.line });
        }
        else if (ABAP_ENDS.has(first)) {
            const want = ABAP_ENDS.get(first);
            const top = stack[stack.length - 1];
            if (top && top.kw === want)
                stack.pop();
            else if (stack.some((s) => s.kw === want)) {
                const inner = stack.pop();
                add({ line: inner.line, sev: 'e', rule: 'abap/blocks', match: inner.kw.toLowerCase() === raw.trim().slice(0, inner.kw.length).toLowerCase() ? raw.trim().slice(0, inner.kw.length) : '', title: `${inner.kw}를 닫는 ${ABAP_BLOCKS[inner.kw]}가 없어요`, easy: `${st.line}줄의 ${first} 전에 ${ABAP_BLOCKS[inner.kw]}. 를 넣어 주세요.` });
                while (stack.length && stack[stack.length - 1].kw !== want)
                    stack.pop();
                stack.pop();
            }
            else
                add({ line: st.line, sev: 'e', rule: 'abap/blocks', match: raw.trim().slice(0, first.length), title: `${first}가 있는데 짝인 ${want}가 없어요`, easy: `${want} 블록을 여는 문장이 빠졌거나, ${first}가 하나 더 있어요.` });
        }
        if (/^SELECT\s+\*/.test(upper) || /\bSELECT\s+SINGLE\s+\*/.test(upper))
            add({ line: st.line, sev: 'w', rule: 'abap/select-star', match: '*', title: 'SELECT * 대신 필요한 필드만 골라요', easy: '모든 필드를 읽으면 느려지고 메모리를 많이 써요. 쓰는 필드만 적어 주세요.' });
        if (first === 'SELECT' && stack.some((s) => s.kw === 'LOOP' || s.kw === 'DO' || s.kw === 'WHILE'))
            add({ line: st.line, sev: 'w', rule: 'abap/select-in-loop', match: raw.trim().split(/\s+/)[0], title: '반복문 안에서 SELECT하면 느려져요', easy: '반복할 때마다 DB를 읽어요. 반복문 밖에서 FOR ALL ENTRIES나 JOIN으로 한 번에 읽어 주세요.' });
        if (/\bWITH\s+HEADER\s+LINE\b|\bOCCURS\s+\d+/.test(upper))
            add({ line: st.line, sev: 'w', rule: 'abap/obsolete-header-line', match: /OCCURS/i.test(raw) ? (raw.match(/occurs\s+\d+/i)?.[0] ?? '') : (raw.match(/with\s+header\s+line/i)?.[0] ?? ''), title: '헤더 라인(OCCURS, WITH HEADER LINE)은 옛 문법이에요', easy: 'Clean ABAP에서는 TYPE TABLE OF로 테이블을 만들고, 작업 영역은 따로 선언하거나 인라인 DATA( )를 써요.' });
        if (first === 'MOVE' && /\bTO\b/.test(upper))
            add({ line: st.line, sev: 'w', rule: 'abap/obsolete-move', match: raw.trim().split(/\s+/)[0], title: 'MOVE ... TO 대신 = 를 써요', easy: 'lv_b = lv_a. 처럼 쓰는 게 최신 문법이에요.' });
        if (first === 'TABLES')
            add({ line: st.line, sev: 'w', rule: 'abap/obsolete-tables', match: raw.trim().split(/\s+/)[0], title: 'TABLES 문은 옛 문법이에요', easy: '필요한 구조는 DATA ... TYPE 테이블이름. 으로 선언해 주세요.' });
    }
    for (const open of stack)
        add({ line: open.line, sev: 'e', rule: 'abap/blocks', match: lines[open.line - 1].trim().slice(0, open.kw.length), title: `${open.kw}를 닫는 ${ABAP_BLOCKS[open.kw]}가 없어요`, easy: `블록이 끝나는 곳에 ${ABAP_BLOCKS[open.kw]}. 를 넣어 주세요.` });
    return out;
}
/* ------------------------------------------------------------------ */
/* CDS · SQLScript · CSS (괄호 짝 + 몇 가지 규칙)                         */
/* ------------------------------------------------------------------ */
function bracketsWith(lines, strip) {
    return bracketProblem(lines.map(strip));
}
const sqlStrip = (l) => l.replace(/'(?:[^']|'')*'/g, "''").replace(/--.*$|\/\/.*$/, '');
function checkCds(code) {
    const lines = code.split('\n');
    const out = [];
    const b = bracketsWith(lines, sqlStrip);
    if (b)
        out.push(b);
    const defLine = lines.findIndex((l) => /\bdefine\s+(root\s+)?view\b/i.test(l));
    if (defLine >= 0 && !/\bview\s+entity\b/i.test(lines[defLine])) {
        out.push({ line: defLine + 1, sev: 'w', rule: 'cds/view-entity', match: lines[defLine].match(/define\s+(root\s+)?view/i)?.[0] ?? '', title: 'Clean Core에서는 define view entity를 써요', easy: '예전 define view(DDIC 기반)는 더 이상 권장하지 않아요. define view entity로 바꾸면 @AbapCatalog.sqlViewName도 필요 없어요.' });
    }
    if (defLine >= 0 && !/@AccessControl\.authorizationCheck/i.test(code)) {
        out.push({ line: defLine + 1, sev: 'w', rule: 'cds/auth-check', match: '', title: '권한 체크 어노테이션이 없어요', easy: '@AccessControl.authorizationCheck: #CHECK (또는 #NOT_REQUIRED)를 맨 위에 적어 주세요.' });
    }
    lines.forEach((l, i) => {
        if (/\bselect\s+\*\s+from\b/i.test(sqlStrip(l)))
            out.push({ line: i + 1, sev: 'w', rule: 'cds/select-star', match: '*', title: '필요한 필드만 골라요', easy: 'CDS View도 쓰는 필드만 { } 안에 적는 게 좋아요.' });
    });
    return dedupe(out);
}
function checkSql(code) {
    const lines = code.split('\n');
    const out = [];
    const b = bracketsWith(lines, sqlStrip);
    if (b)
        out.push(b);
    lines.forEach((l, i) => {
        if (/\bselect\s+\*/i.test(sqlStrip(l)))
            out.push({ line: i + 1, sev: 'w', rule: 'sql/select-star', match: '*', title: 'SELECT * 대신 필요한 컬럼만 골라요', easy: 'HANA는 컬럼 단위로 저장해서, 필요한 컬럼만 읽을수록 빨라요.' });
    });
    return dedupe(out);
}
function checkCss(code) {
    const b = bracketsWith(code.split('\n'), (l) => l.replace(/\/\*.*?\*\//g, '').replace(/"[^"]*"|'[^']*'/g, '""'));
    return b ? [b] : [];
}
/* ------------------------------------------------------------------ */
/* XML(UI5 View) · HTML : 태그 짝                                        */
/* ------------------------------------------------------------------ */
const HTML_VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const HTML_LOOSE = new Set(['p', 'li', 'td', 'th', 'tr', 'option', 'dt', 'dd', 'thead', 'tbody']);
function checkTags(code, html) {
    const out = [];
    const lineAt = (idx) => code.slice(0, idx).split('\n').length;
    const stack = [];
    const re = /<!--[\s\S]*?-->|<!\w[^>]*>|<\?[\s\S]*?\?>|<(\/?)([A-Za-z][\w:.-]*)((?:"[^"]*"|'[^']*'|[^'">])*?)(\/?)>/g;
    let m;
    while ((m = re.exec(code))) {
        if (!m[2])
            continue;
        const closing = m[1] === '/';
        const name = html ? m[2].toLowerCase() : m[2];
        const line = lineAt(m.index);
        if (m[4] === '/' || (html && HTML_VOID.has(name)))
            continue;
        if (!closing) {
            if (!(html && HTML_LOOSE.has(name)))
                stack.push({ name, line });
            continue;
        }
        if (html && HTML_LOOSE.has(name))
            continue;
        const idx = stack.map((s) => s.name).lastIndexOf(name);
        if (idx < 0) {
            out.push({ line, sev: 'e', rule: 'tags', match: `</${m[2]}>`, title: `여는 태그 없이 </${m[2]}>가 있어요`, easy: '태그 이름이 맞는지, 여는 태그가 빠지지 않았는지 확인해 보세요.' });
            continue;
        }
        for (const un of stack.splice(idx).slice(1))
            out.push({ line: un.line, sev: 'e', rule: 'tags', match: `<${un.name}`, title: `<${un.name}>를 닫지 않았어요`, easy: `</${un.name}>를 넣거나, 내용이 없다면 <${un.name} ... /> 처럼 닫아 주세요.` });
    }
    for (const un of stack)
        out.push({ line: un.line, sev: 'e', rule: 'tags', match: `<${un.name}`, title: `<${un.name}>를 닫지 않았어요`, easy: `</${un.name}>를 넣거나, 내용이 없다면 <${un.name} ... /> 처럼 닫아 주세요.` });
    if (!html) {
        const root = code.match(/<(mvc:View|core:FragmentDefinition)\b[^>]*>/);
        if (root && !/\sxmlns="sap\.m"/.test(root[0]))
            out.push({ line: lineAt(root.index ?? 0), sev: 'w', rule: 'ui5/xmlns', match: `<${root[1]}`, title: '기본 네임스페이스 xmlns="sap.m"이 없어요', easy: 'Button, Table 같은 sap.m 컨트롤을 접두어 없이 쓰려면 루트에 xmlns="sap.m"을 넣어 주세요.' });
    }
    return dedupe(out);
}
/* ------------------------------------------------------------------ */
/* JSON (manifest.json)                                                */
/* ------------------------------------------------------------------ */
function checkJson(code) {
    if (!code.trim())
        return [];
    try {
        JSON.parse(code);
        return [];
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : '';
        const lines = code.split('\n');
        const trailing = lines.findIndex((l, i) => /,\s*$/.test(l) && /^\s*[}\]]/.test(lines.slice(i + 1).find((x) => x.trim()) ?? ''));
        if (trailing >= 0)
            return [{ line: trailing + 1, sev: 'e', rule: 'json', match: ',', title: '마지막 항목 뒤에 쉼표가 있어요', easy: 'JSON은 마지막 항목 뒤에 쉼표를 쓸 수 없어요. 이 줄의 쉼표를 지워 주세요.' }];
        const sq = lines.findIndex((l) => /'[^']*'\s*:/.test(l) || /:\s*'[^']*'/.test(l));
        if (sq >= 0)
            return [{ line: sq + 1, sev: 'e', rule: 'json', match: "'", title: '작은따옴표는 쓸 수 없어요', easy: 'JSON의 이름과 문자열은 큰따옴표(")로 감싸야 해요.' }];
        const cm = lines.findIndex((l) => /^\s*\/\//.test(l));
        if (cm >= 0)
            return [{ line: cm + 1, sev: 'e', rule: 'json', match: '//', title: 'JSON에는 주석을 쓸 수 없어요', easy: '// 주석 줄을 지워 주세요.' }];
        const pos = Number(msg.match(/position (\d+)/)?.[1]);
        const lineNo = Number(msg.match(/line (\d+)/)?.[1]) || (Number.isFinite(pos) ? code.slice(0, pos).split('\n').length : 1);
        return [{ line: Math.min(lineNo, lines.length), sev: 'e', rule: 'json', match: '', title: 'JSON 형식이 맞지 않아요', easy: '쉼표, 따옴표, 괄호 짝을 확인해 보세요.' }];
    }
}
function dedupe(list) {
    const seen = new Set();
    return list.filter((p) => (seen.has(p.line) ? false : (seen.add(p.line), true)));
}
const sortProblems = (list) => [...list].sort((a, b) => (a.sev === b.sev ? a.line - b.line : a.sev === 'e' ? -1 : 1));
/** 붙여넣은 코드에서 초보자가 자주 하는 실수를 찾아요. 한 줄에 하나만 보여 줘요. */
export function checkCode(code, lang = 'JavaScript') {
    switch (lang) {
        case 'ABAP': return sortProblems(checkAbap(code));
        case 'CDS': return sortProblems(checkCds(code));
        case 'SQLScript':
        case 'SQL': return sortProblems(checkSql(code));
        case 'XML': return sortProblems(checkTags(code, false));
        case 'HTML': return sortProblems(checkTags(code, true));
        case 'CSS': return checkCss(code);
        case 'JSON': return checkJson(code);
        default: return checkJsLike(code, lang);
    }
}
