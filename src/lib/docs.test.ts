import { describe, expect, it } from 'vitest';
import { codeSpotAt } from './complete';
import { findDecl, lookup, wordAt } from './docs';

const hover = (line: string, word: string, lang: string) => {
  const w = wordAt(line, line.indexOf(word) + 1, lang);
  return w ? lookup(w, lang) : null;
};

describe('hover docs', () => {
  it('ABAP 키워드와 시스템 필드', () => {
    expect(hover('LOOP AT lt_rows INTO DATA(ls).', 'LOOP', 'ABAP')?.text).toMatch(/인터널 테이블/);
    expect(hover('IF sy-subrc = 0.', 'sy-subrc', 'ABAP')?.title).toBe('sy-subrc');
    expect(hover('ENDLOOP.', 'ENDLOOP', 'ABAP')?.sig).toMatch(/LOOP AT/);
  });
  it('UI5: 전체 이름, 짧은 이름, 메서드', () => {
    expect(hover('new sap.m.Button({', 'Button', 'JavaScript')?.link).toContain('sap.m.Button');
    expect(hover('sap.m.MessageToast.show("a");', 'MessageToast', 'JavaScript')?.title).toBe('sap.m.MessageToast');
    expect(hover('sap.m.MessageToast.show("a");', 'show', 'JavaScript')?.text).toMatch(/띄워요/);
    expect(hover('sap.ui.getCore().attachInit(function () {', 'attachInit', 'JavaScript')).not.toBeNull();
    expect(hover('this.byId("x")', 'byId', 'JavaScript')).not.toBeNull();
  });
  it('XML: 태그와 속성을 구분해요', () => {
    expect(hover('<Button text="a" press=".onPress"/>', 'Button', 'XML')?.title).toBe('sap.m.Button');
    expect(hover('<Button text="a" press=".onPress"/>', 'press', 'XML')?.sig).toMatch(/press=/);
    expect(hover('<mvc:View controllerName="a">', 'mvc:View', 'XML')?.title).toBe('sap.ui.core.mvc.View');
  });
  it('CDS 어노테이션, CSS 속성, manifest 키', () => {
    expect(hover("@UI.lineItem: [{ position: 10 }]", '@UI', 'CDS')?.title).toBe('@UI.lineItem');
    expect(hover('  display: flex;', 'display', 'CSS')?.link).toContain('display');
    expect(hover('    "minUI5Version": "1.120.2",', 'minUI5Version', 'JSON')).not.toBeNull();
  });
  it('코드 안의 선언을 찾아요', () => {
    expect(findDecl('DATA lv_total TYPE i.\nlv_total = 1.', 'lv_total', 'ABAP')?.line).toBe(0);
    expect(findDecl('LOOP AT lt INTO DATA(ls_row).\n  WRITE ls_row-a.', 'ls_row', 'ABAP')?.line).toBe(0);
    expect(findDecl('var oModel = new JSONModel();\noModel.setData({});', 'oModel', 'JavaScript')?.line).toBe(0);
    expect(findDecl('onPress: function (oEvent) {\n  oEvent.getSource();', 'oEvent', 'JavaScript')?.line).toBe(0);
  });
});

const spot = (s: string) => {
  const pos = s.indexOf('|');
  return codeSpotAt(s.replace('|', ''), pos, 'JavaScript', (t, fb) => (t === 'abap' ? 'ABAP' : fb));
};
describe('codeSpotAt', () => {
  it('한 줄 코드 안', () => {
    expect(spot('여기 `this.by|` 보세요')).toMatchObject({ lang: 'JavaScript', code: 'this.by', inline: true });
    expect(spot('여기 `a` 다음 글|')).toBeNull();
  });
  it('코드 블록 안 (언어 표시 따라)', () => {
    expect(spot('이렇게:\n```abap\nLOO|\n```\n')).toMatchObject({ lang: 'ABAP', code: 'LOO\n', inline: false });
    expect(spot('```abap\nx.\n```\n밖|')).toBeNull();
  });
});
