import { describe, expect, it } from 'vitest';
import { caseFor, expand, newline, openTags, shouldPair, suggest } from './complete';
import { TEMPLATES, fillTemplate } from './templates';

const at = (s: string) => ({ text: s.replace('|', ''), pos: s.indexOf('|') });
const labels = (s: string, lang: string, force = false) => {
  const { text, pos } = at(s);
  return suggest(text, pos, lang, force)?.items.map((i) => i.label) ?? [];
};

describe('suggest', () => {
  it('ABAP: 키워드·스니펫과 코드에 있는 이름', () => {
    expect(labels('loo|', 'ABAP')[0]).toMatch(/^loop at/);
    expect(labels('data lv_total type i.\nlv_t|', 'ABAP')).toContain('lv_total');
    expect(labels('sy-s|', 'ABAP')).toContain('sy-subrc');
  });
  it('주석·문자열 안에서는 띄우지 않아요', () => {
    expect(labels('* loo|', 'ABAP')).toEqual([]);
    expect(labels('x = 1. " loo|', 'ABAP')).toEqual([]);
    expect(labels('const a = "con|', 'JavaScript')).toEqual([]);
  });
  it('JS: 점 뒤에는 메서드', () => {
    expect(labels('this.getV|', 'JavaScript')).toContain('getView');
    expect(labels('this.|', 'JavaScript').length).toBeGreaterThan(5);
  });
  it('UI5 XML: 태그, 속성, 닫는 태그', () => {
    expect(labels('<But|', 'XML')).toContain('Button');
    expect(labels('<Button te|', 'XML')).toContain('text');
    expect(labels('<VBox>\n  <Text />\n</|', 'XML')[0]).toBe('VBox');
    expect(labels('<Button text="a|', 'XML')).toEqual([]);
  });
  it('CDS: 어노테이션', () => {
    expect(labels('@UI.li|', 'CDS')).toContain('@UI.lineItem');
    expect(labels('def|', 'CDS')[0]).toBe('define view entity');
  });
  it('CSS: 속성과 값', () => {
    expect(labels('.a {\n  disp|', 'CSS')).toContain('display');
    expect(labels('.a {\n  display: fl|', 'CSS')).toContain('flex');
  });
  it('이미 다 친 키워드는 숨기고, 낱말 가운데에서는 안 띄워요', () => {
    expect(labels('return|', 'JavaScript')).not.toContain('return');
    expect(labels('ret|urn', 'JavaScript')).toEqual([]);
  });
});

describe('expand', () => {
  it('첫 자리표시를 골라 두고 들여쓰기를 이어요', () => {
    const r = expand('if ${1:cond}.\n  $0\nendif.', '  ');
    expect(r.text).toBe('if cond.\n    \n  endif.');
    expect(r.text.slice(r.start, r.end)).toBe('cond');
  });
  it('ABAP은 대문자로 치면 키워드만 대문자로', () => {
    const c = caseFor('ABAP', 'LOO', { label: 'loop', insert: '', kind: 'snip' });
    expect(expand('loop at ${1:lt_rows} into data(${2:ls}).', '', c).text).toBe('LOOP AT lt_rows INTO DATA(ls).');
  });
});

describe('editing helpers', () => {
  it('엔터: 블록이 열리면 한 칸 더, 괄호 사이면 닫는 괄호를 내려요', () => {
    expect(newline('  if x.', 7, 'ABAP').text).toBe('\n    ');
    const { text, pos } = at('function a() {|}');
    expect(newline(text, pos, 'JavaScript')).toEqual({ text: '\n  \n', caret: 3 });
    expect(newline('<VBox>', 6, 'XML').text).toBe('\n  ');
    expect(newline('<Text />', 8, 'XML').text).toBe('\n');
  });
  it('괄호 닫기', () => {
    expect(shouldPair('(', 'a', 1, 'JavaScript')).toBe(true);
    expect(shouldPair('"', 'x = 1. ', 7, 'ABAP')).toBe(false);
    expect(shouldPair("'", 'don', 3, 'JavaScript')).toBe(false);
  });
  it('열린 태그', () => {
    expect(openTags('<mvc:View><Page><content><Text text="a"/>')).toEqual(['content', 'Page', 'mvc:View']);
  });
});

describe('templates', () => {
  it('파일 맨 앞에서는 프로젝트 기본 코드가 나와요', () => {
    expect(labels('Comp|', 'JavaScript')).toContain('Component.js');
    expect(labels('function a() {}\nComp|', 'JavaScript')).not.toContain('Component.js');
    expect(labels('CLA|', 'ABAP')).toContain('CLASS (새 클래스)');
    expect(labels('<mvc|', 'XML')).toContain('mvc:View · View1.view.xml');
    expect(labels('<!|', 'HTML')[0]).toMatch(/^!DOCTYPE · /);
  });
  it('파일 이름으로 이름을 채워요', () => {
    const { text, pos } = at('Vie|');
    const it = suggest(text, pos, 'XML', false, 'Main.view.xml')!.items.find((i) => i.label === 'View1.view.xml')!;
    expect(it.insert).toContain('controllerName="zproject1.controller.Main"');
    const t = TEMPLATES.find((x) => x.id === 'abap-classrun')!;
    expect(fillTemplate(t, 'zcl_test.clas.abap')).toMatchObject({ file: 'zcl_test.clas.abap' });
    expect(fillTemplate(t, '').body).toContain('CLASS zcl_hello DEFINITION');
  });
  it('manifest.json은 올바른 JSON이에요', () => {
    const t = TEMPLATES.find((x) => x.id === 'ui5-manifest')!;
    expect(() => JSON.parse(expand(fillTemplate(t).body, '').text)).not.toThrow();
  });
  it('sap. 뒤에는 네임스페이스와 컨트롤', () => {
    expect(labels('new sap.|', 'JavaScript')).toEqual(expect.arrayContaining(['m', 'ui']));
    expect(labels('new sap.m.Bu|', 'JavaScript')[0]).toBe('Button');
    expect(labels('sap.m.MessageToast.|', 'JavaScript')).toEqual(['show']);
    expect(labels('sap.ui.getCore().|', 'JavaScript')).toContain('attachInit');
  });
});
