import { describe, expect, it } from 'vitest';
import { checkCode } from './checks';
import { highlight } from './highlight';
import { langFromCode, langFromFile } from './langs';
const r = (code, lang) => checkCode(code, lang).map((p) => `${p.line}:${p.rule}`);
describe('ABAP', () => {
    it('accepts a clean modern report', () => {
        const code = [
            'REPORT zr_sales.',
            '',
            '* 판매 오더 조회',
            'SELECT vbeln, erdat FROM vbak',
            '  WHERE erdat >= @sy-datum',
            '  INTO TABLE @DATA(lt_orders).',
            '',
            'LOOP AT lt_orders INTO DATA(ls_order).',
            '  IF ls_order-erdat IS INITIAL.',
            '    CONTINUE.',
            '  ENDIF.',
            "  WRITE: / ls_order-vbeln, 'ok'. \" 출력",
            'ENDLOOP.',
        ].join('\n');
        expect(r(code, 'ABAP')).toEqual([]);
    });
    it('finds a missing period', () => {
        const code = ['DATA lv_a TYPE i', 'lv_a = 1.', 'WRITE lv_a.'].join('\n');
        expect(r(code, 'ABAP')).toEqual(['1:abap/period']);
        expect(r('WRITE lv_a', 'ABAP')).toEqual(['1:abap/period']);
    });
    it('allows chained and multi-line statements', () => {
        const code = ['DATA: lv_a TYPE i,', '      lv_b TYPE string.', 'lv_b = COND #( WHEN lv_a > 0', '               THEN `양수`', '               ELSE `음수` ).'].join('\n');
        expect(r(code, 'ABAP')).toEqual([]);
    });
    it('checks IF/ENDIF and LOOP/ENDLOOP pairs', () => {
        expect(r(['LOOP AT lt_a INTO DATA(ls_a).', '  IF ls_a-x = 1.', '    WRITE ls_a-x.', 'ENDLOOP.'].join('\n'), 'ABAP')).toEqual(['2:abap/blocks']);
        expect(r(['WRITE 1.', 'ENDIF.'].join('\n'), 'ABAP')).toEqual(['2:abap/blocks']);
        expect(r(['IF a = 1.', '  WRITE a.'].join('\n'), 'ABAP')).toEqual(['1:abap/blocks']);
    });
    it('warns about SELECT *, SELECT in LOOP and obsolete syntax', () => {
        const code = [
            'DATA itab TYPE TABLE OF mara WITH HEADER LINE.',
            'SELECT * FROM mara INTO TABLE itab.',
            'LOOP AT itab.',
            '  SELECT SINGLE maktx FROM makt INTO @DATA(lv_t) WHERE matnr = @itab-matnr.',
            'ENDLOOP.',
            'MOVE lv_a TO lv_b.',
        ].join('\n');
        expect(r(code, 'ABAP')).toEqual(['1:abap/obsolete-header-line', '2:abap/select-star', '4:abap/select-in-loop', '6:abap/obsolete-move']);
    });
    it('does not treat strings or comments as code', () => {
        expect(r(["WRITE 'IF without ENDIF'. \" ENDLOOP", '* SELECT * FROM mara'].join('\n'), 'ABAP')).toEqual([]);
    });
    it('pairs class definition and implementation', () => {
        const code = ['CLASS lcl_app DEFINITION.', '  PUBLIC SECTION.', '    METHODS run.', 'ENDCLASS.', 'CLASS lcl_app IMPLEMENTATION.', '  METHOD run.', '    WRITE 1.', '  ENDMETHOD.', 'ENDCLASS.'].join('\n');
        expect(r(code, 'ABAP')).toEqual([]);
    });
});
describe('CDS / SQLScript', () => {
    it('suggests view entity and auth check', () => {
        const old = ["@AbapCatalog.sqlViewName: 'ZSO'", 'define view ZI_SO as select from vbak {', '  key vbeln,', '  erdat', '}'].join('\n');
        expect(r(old, 'CDS')).toEqual(['2:cds/view-entity']);
        const ok = ["@AccessControl.authorizationCheck: #CHECK", 'define view entity ZI_SO as select from vbak {', '  key vbeln', '}'].join('\n');
        expect(r(ok, 'CDS')).toEqual([]);
        expect(r(['define view entity ZI_SO as select from vbak {', '  key vbeln'].join('\n'), 'CDS')[0]).toBe('1:brackets');
    });
    it('warns about SELECT * in SQLScript', () => {
        expect(r('lt_data = SELECT * FROM vbak;', 'SQLScript')).toEqual(['1:sql/select-star']);
    });
});
describe('UI5 XML / HTML / JSON / JS', () => {
    it('checks tag pairs and xmlns in XML views', () => {
        const ok = ['<mvc:View controllerName="z.app.controller.Main" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m">', '  <Page title="주문">', '    <Button text="저장" press=".onSave"/>', '  </Page>', '</mvc:View>'].join('\n');
        expect(r(ok, 'XML')).toEqual([]);
        const bad = ['<mvc:View xmlns:mvc="sap.ui.core.mvc">', '  <Page title="주문">', '    <Button text="저장">', '  </Page>', '</mvc:View>'].join('\n');
        expect(r(bad, 'XML')).toEqual(['3:tags', '1:ui5/xmlns']);
    });
    it('is lenient with HTML void and optional tags', () => {
        expect(r('<ul><li>a<li>b</ul><br><img src="x.png">', 'HTML')).toEqual([]);
        expect(r('<div>\n<span>hi\n</div>', 'HTML')).toEqual(['2:tags']);
    });
    it('explains JSON mistakes', () => {
        expect(r('{\n  "a": 1,\n}', 'JSON')).toEqual(['2:json']);
        expect(r("{\n  'a': 1\n}", 'JSON')).toEqual(['2:json']);
        expect(r('{"sap.app": {"id": "z.app"}}', 'JSON')).toEqual([]);
    });
    it('flags old UI5 APIs in controllers', () => {
        expect(r('jQuery.sap.require("x");\nvar b = sap.ui.getCore().byId("btn");', 'JavaScript')).toEqual(['1:ui5/no-jquery-sap', '2:ui5/no-global-byid']);
    });
});
describe('language detection', () => {
    it('guesses from file names', () => {
        expect(langFromFile('zr_sales.prog.abap')).toBe('ABAP');
        expect(langFromFile('ZI_SO.ddls.asddls')).toBe('CDS');
        expect(langFromFile('Main.view.xml')).toBe('XML');
        expect(langFromFile('Main.controller.js')).toBe('JavaScript');
        expect(langFromFile('manifest.json')).toBe('JSON');
        expect(langFromFile('readme')).toBeNull();
    });
    it('guesses from pasted code', () => {
        expect(langFromCode('REPORT zr_test.\nWRITE 1.')).toBe('ABAP');
        expect(langFromCode('DATA lv_a TYPE i.')).toBe('ABAP');
        expect(langFromCode('@AccessControl.authorizationCheck: #CHECK\ndefine view entity ZI_A as select from a { key x }')).toBe('CDS');
        expect(langFromCode('<mvc:View xmlns="sap.m"></mvc:View>')).toBe('XML');
        expect(langFromCode('sap.ui.define(["sap/ui/core/mvc/Controller"], function (C) {})')).toBe('JavaScript');
        expect(langFromCode('{"sap.app": {}}')).toBe('JSON');
        expect(langFromCode('METHOD get BY DATABASE PROCEDURE FOR HDB LANGUAGE SQLSCRIPT.')).toBe('SQLScript');
    });
});
describe('ABAP highlight', () => {
    it('colors keywords case-insensitively and comments', () => {
        expect(highlight('select vbeln from vbak.', 'ABAP')).toContain('<span class="k">select</span>');
        expect(highlight('* 주석', 'ABAP')).toBe('<span class="c">* 주석</span>');
        expect(highlight('WRITE lv_a. " 출력', 'ABAP')).toContain('<span class="c">&quot; 출력</span>');
    });
});
