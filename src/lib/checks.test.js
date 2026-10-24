import { describe, expect, it } from 'vitest';
import { checkCode } from './checks';
const rules = (code, lang = 'JSX') => checkCode(code, lang).map((p) => `${p.line}:${p.rule}`);
describe('checkCode', () => {
    it('finds the common beginner mistakes in a React snippet', () => {
        const code = [
            'function Counter() {',
            '  const [count, setCount] = useState(0);',
            '  var step = 1;',
            '  return (',
            '    <button onClick={setCount(count + step)}>',
            "      {count == 0 ? '시작' : count}",
            '    </button>',
            '  );',
            '}',
        ].join('\n');
        expect(rules(code)).toEqual(['5:react/no-direct-call', '3:no-var', '6:eqeqeq']);
    });
    it('accepts arrow handlers and strict equality', () => {
        expect(rules('<button onClick={() => remove(todo.id)}>x</button>\nif (a === b) {}')).toEqual([]);
    });
    it('ignores operators and brackets inside strings and comments', () => {
        expect(rules("const s = 'a == b (';\n// var x == 1 {\nconst t = `}`;", 'JavaScript')).toEqual([]);
    });
    it('reports unbalanced brackets with the line', () => {
        const p = checkCode('function a() {\n  if (x) {\n    go();\n}\n', 'JavaScript');
        expect(p[0]).toMatchObject({ line: 1, rule: 'brackets', sev: 'e' });
        expect(checkCode('const a = [1, 2);', 'JavaScript')[0]).toMatchObject({ line: 1, rule: 'brackets' });
    });
    it('flags fetch that is not awaited but not awaited ones', () => {
        expect(rules('const res = fetch(url);', 'TypeScript')).toEqual(['1:no-unawaited-json']);
        expect(rules('const res = await fetch(url);', 'TypeScript')).toEqual([]);
    });
    it('flags index keys and reduce without an initial value', () => {
        expect(rules('<li key={index}>')).toEqual(['1:react/no-array-index-key']);
        expect(rules('const t = xs.reduce((s, x) => s + x);', 'JavaScript')).toEqual(['1:reduce-initial-value']);
        expect(rules('const t = xs.reduce((s, x) => s + x, 0);', 'JavaScript')).toEqual([]);
    });
    it('skips JS rules for other languages', () => {
        expect(rules('if a == b:\n    print(a)', 'Python')).toEqual([]);
    });
});
