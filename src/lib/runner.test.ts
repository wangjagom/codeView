import { describe, expect, it } from 'vitest';
import { buildRunner, buildUi5, hintFor, runKind, ui5Namespace } from './runner';
import { templateSetFiles } from './templates';

describe('runKind', () => {
  it('UI5 · 웹 · JS · 실행 못 함', () => {
    expect(runKind(templateSetFiles('ui5-app'))).toBe('ui5');
    expect(runKind([{ name: 'index.html', lang: 'HTML', code: '<p>hi</p>' }, { name: 'a.js', lang: 'JavaScript', code: '' }])).toBe('web');
    expect(runKind([{ name: 'a.js', lang: 'JavaScript', code: 'console.log(1)' }])).toBe('js');
    expect(runKind(templateSetFiles('rap'))).toBeNull();
  });
});

describe('buildUi5 (UI5 기본 앱 세트)', () => {
  const files = templateSetFiles('ui5-app');
  const b = buildUi5(files);
  it('manifest의 앱 이름으로 모듈 자리를 정해요', () => {
    expect(ui5Namespace(files)).toBe('zproject1');
    expect(b.boot).toEqual({ mode: 'component' });
    for (const k of ['zproject1/manifest.json', 'zproject1/Component.js', 'zproject1/view/App.view.xml', 'zproject1/view/View1.view.xml', 'zproject1/controller/App.controller.js', 'zproject1/controller/View1.controller.js', 'zproject1/model/models.js']) expect(b.modules[k], k).toBeTruthy();
  });
  it('올린 i18n을 쓰고 외부 CSS 연결은 빼요', () => {
    expect(b.modules['zproject1/i18n/i18n.properties']).toContain('appTitle=');
    expect(b.modules['zproject1/i18n/i18n_ko.properties']).toContain('appTitle=');
    expect(b.notes).toEqual([]);
    expect(JSON.parse(b.modules['zproject1/manifest.json'])['sap.ui5'].resources.css).toBeUndefined();
    expect(b.css.length).toBe(1);
  });
  it('i18n이 없으면 빈 묶음으로 채워요', () => {
    const nb = buildUi5(files.filter((f) => !f.name.endsWith('.properties')));
    expect(nb.modules['zproject1/i18n/i18n.properties']).toBe('');
    expect(nb.notes.join()).toContain('i18n');
  });
});

describe('UI5 파일 세트', () => {
  it('View + Controller: View 하나로 시작하고 빠진 파일이 없어요', () => {
    const b = buildUi5(templateSetFiles('ui5-vc'));
    expect(b.boot).toEqual({ mode: 'view', viewName: 'zproject1.view.Main', wrap: true });
    expect(b.modules['zproject1/controller/Main.controller.js']).toContain('onAdd');
    expect(b.notes).toEqual([]);
  });
  it('View + Controller + 데이터: data.json을 기본 모델로 꽂아요', () => {
    const b = buildUi5(templateSetFiles('ui5-data'));
    expect(b.models[0].name).toBe('');
    expect((b.models[0].data as { products: unknown[] }).products.length).toBeGreaterThan(3);
  });
  it('View + Fragment: Fragment를 view 자리에서 찾을 수 있어요', () => {
    const b = buildUi5(templateSetFiles('ui5-fragment'));
    expect(b.modules['zproject1/view/NameDialog.fragment.xml']).toContain('nameDialog');
    expect(b.notes).toEqual([]);
  });
  it('목록 → 상세: manifest의 JSON 데이터 소스를 올린 data.json으로 바꿔요', () => {
    const files = templateSetFiles('ui5-nav');
    expect(runKind(files)).toBe('ui5');
    const b = buildUi5(files);
    expect(b.boot).toEqual({ mode: 'component' });
    for (const k of ['zproject1/view/App.view.xml', 'zproject1/view/List.view.xml', 'zproject1/view/Detail.view.xml', 'zproject1/controller/List.controller.js', 'zproject1/controller/Detail.controller.js']) expect(b.modules[k], k).toBeTruthy();
    expect(JSON.parse(b.modules['zproject1/manifest.json'])['sap.ui5'].models['']).toBeUndefined();
    expect(b.models.map((m) => m.name)).toEqual(['']);
    expect(b.modules['zproject1/Component.js']).toContain('zproject1.Component');
    expect(b.notes).toEqual([]);
  });
  it('세트 파일은 10개를 넘지 않아요', () => {
    for (const id of ['ui5-vc', 'ui5-data', 'ui5-fragment', 'ui5-nav', 'ui5-app']) expect(templateSetFiles(id).length).toBeLessThanOrEqual(10);
  });
});

describe('buildUi5 (View 하나만)', () => {
  it('앱 틀로 감싸고, 없는 Controller는 빈 것으로 채워요', () => {
    const b = buildUi5([{ name: 'Main.view.xml', lang: 'XML', code: '<mvc:View controllerName="zdemo.controller.Main" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"><Page title="{/title}"/></mvc:View>' }, { name: 'data.json', lang: 'JSON', code: '{"title":"안녕"}' }]);
    expect(b.boot).toEqual({ mode: 'view', viewName: 'zdemo.view.Main', wrap: true });
    expect(b.modules['zdemo/controller/Main.controller.js']).toContain('C.extend("zdemo.controller.Main"');
    expect(b.models).toEqual([{ name: '', data: { title: '안녕' } }]);
  });
  it('OData 모델은 빼고 예시 데이터를 같은 이름으로 꽂아요', () => {
    const manifest = JSON.stringify({ 'sap.app': { id: 'zso', dataSources: { main: { uri: '/sap/opu/odata/sap/ZSO_SRV/', type: 'OData' } } }, 'sap.ui5': { models: { '': { dataSource: 'main' } } } });
    const b = buildUi5([{ name: 'manifest.json', lang: 'JSON', code: manifest }, { name: 'Orders.json', lang: 'JSON', code: '{"Orders":[{"id":1}]}' }]);
    const m = JSON.parse(b.modules['zso/manifest.json']);
    expect(m['sap.app'].dataSources.main).toBeUndefined();
    expect(m['sap.ui5'].models['']).toBeUndefined();
    expect(b.models).toEqual([{ name: '', data: { Orders: [{ id: 1 }] } }]);
  });
});

describe('buildRunner', () => {
  it('UI5는 OpenUI5와 고른 테마로 시작해요', () => {
    const r = buildRunner(templateSetFiles('ui5-app'), { runId: 'r1', theme: 'sap_horizon_dark', compact: true })!;
    expect(r.html).toContain('https://sdk.openui5.org/resources/sap-ui-core.js');
    expect(r.html).toContain('data-sap-ui-theme="sap_horizon_dark"');
    expect(r.html).not.toMatch(/<\/script>[^<]*zproject1\.controller/); // 코드 속 </script>로 끊기지 않아요
  });
  it('웹 페이지는 올린 CSS·JS를 이어 붙여요', () => {
    const r = buildRunner([
      { name: 'index.html', lang: 'HTML', code: '<html><head><link rel="stylesheet" href="style.css"></head><body><h1>t</h1><script src="app.js"></script></body></html>' },
      { name: 'style.css', lang: 'CSS', code: 'h1{color:red}' },
      { name: 'app.js', lang: 'JavaScript', code: 'console.log("</script>")' },
    ], { runId: 'r2', theme: 'sap_horizon', compact: false })!;
    expect(r.kind).toBe('web');
    expect(r.html).toContain('<style>h1{color:red}</style>');
    expect(r.html).toContain('console.log("<\\/script>")');
    expect(r.html).not.toContain('src="app.js"');
  });
});

describe('hintFor', () => {
  it('자주 나는 오류에 힌트', () => {
    expect(hintFor("Cannot read properties of undefined (reading 'getProperty')")).toContain('모델');
    expect(hintFor('x is not a function')).toContain('함수');
    expect(hintFor('뭔가 이상함')).toBeNull();
  });
});
