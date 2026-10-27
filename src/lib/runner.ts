/**
 * 코드 실행기: 올린 파일들로 샌드박스 iframe에 넣을 HTML 한 장을 만들어요.
 * - UI5: SAP가 배포하는 진짜 OpenUI5를 불러오고, 올린 View·Controller·manifest·i18n을 메모리에서 바로 넘겨요(preload).
 *   그래서 버튼·테이블·테마가 실제 Fiori 앱과 똑같이 그려져요.
 * - HTML·CSS·JS: 일반 웹 페이지처럼 실행해요. JS만 있으면 콘솔 출력만 보여 줘요.
 * 실행 결과(콘솔·오류)는 postMessage로 부모 화면에 알려요.
 */

export interface RunFile { name: string; lang: string; code: string }
export type RunKind = 'ui5' | 'web' | 'js';
export type Ui5Theme = 'sap_horizon' | 'sap_horizon_dark' | 'sap_fiori_3';
export interface RunOptions { runId: string; theme: Ui5Theme; compact: boolean; base?: string }
export interface RunPlan { html: string; kind: RunKind; notes: string[] }

/** OpenUI5 (Apache-2.0) 공개 CDN. 테스트에서만 바꿔요. */
export const UI5_BASE = 'https://sdk.openui5.org/resources/';

const ext = (n: string) => n.toLowerCase();
const isView = (f: RunFile) => /\.view\.xml$/i.test(f.name) || (f.lang === 'XML' && /<(\w+:)?View\b/.test(f.code) && !/FragmentDefinition/.test(f.code));
const isFragment = (f: RunFile) => /\.fragment\.xml$/i.test(f.name) || /FragmentDefinition/.test(f.code);
const isManifest = (f: RunFile) => /(^|\/)manifest\.json$/i.test(f.name) || (f.lang === 'JSON' && /"sap\.app"/.test(f.code));
const isUi5Js = (f: RunFile) => /\.js$/i.test(f.name) && /sap\.ui\.(define|require)\s*\(/.test(f.code);
const isHtml = (f: RunFile) => f.lang === 'HTML' || /\.html?$/i.test(f.name);
const isCss = (f: RunFile) => f.lang === 'CSS' || /\.css$/i.test(f.name);
const isJs = (f: RunFile) => f.lang === 'JavaScript' || /\.(m?js|jsx)$/i.test(f.name);
const isProps = (f: RunFile) => /\.properties$/i.test(f.name);
const isJson = (f: RunFile) => f.lang === 'JSON' || /\.json$/i.test(f.name);

/** 실행할 수 있는 글인지, 어떤 방식으로 돌릴지 */
export function runKind(files: RunFile[]): RunKind | null {
  if (files.some((f) => isView(f) || isManifest(f) || isUi5Js(f))) return 'ui5';
  if (files.some(isHtml)) return 'web';
  if (files.some(isJs)) return 'js';
  return null;
}

const base = (name: string) => name.split('/').pop() ?? name;
const stripWebapp = (name: string) => name.replace(/^\.?\/?(webapp\/)?/, '');

/** 앱 이름(네임스페이스): manifest의 sap.app.id → controllerName/Component 이름 → 'app' */
export function ui5Namespace(files: RunFile[]): string {
  for (const f of files.filter(isManifest)) {
    const m = f.code.match(/"sap\.app"\s*:\s*\{[\s\S]*?"id"\s*:\s*"([\w.]+)"/);
    if (m) return m[1];
  }
  for (const f of files) {
    const c = f.code.match(/controllerName\s*=\s*"([\w.]+?)\.controller\.\w+"/) ?? f.code.match(/\.extend\(\s*["']([\w.]+?)\.(?:controller\.\w+|Component)["']/);
    if (c) return c[1];
  }
  return 'app';
}

interface Ui5Build {
  ns: string;
  /** preload 모듈 이름 → 내용 */
  modules: Record<string, string>;
  /** preload 모듈 이름 → 몇 번째 파일인지 (오류 줄 찾기용) */
  owners: Record<string, number>;
  css: string[];
  /** manifest가 있으면 Component로, 없으면 View 하나로 시작해요 */
  boot: { mode: 'component' } | { mode: 'view'; viewName: string; wrap: boolean };
  /** 서버(OData) 대신 꽂아 줄 예시 데이터 (모델 이름 → JSON) */
  models: { name: string; data: unknown }[];
  notes: string[];
}

/** UI5 앱으로 돌릴 준비: 모듈 이름 정하기, manifest 손보기, 빠진 파일 채우기 */
export function buildUi5(files: RunFile[]): Ui5Build {
  const ns = ui5Namespace(files);
  const nsPath = ns.replace(/\./g, '/');
  const modules: Record<string, string> = {};
  const owners: Record<string, number> = {};
  const notes: string[] = [];
  const css: string[] = [];
  const models: { name: string; data: unknown }[] = [];
  const put = (key: string, code: string, idx: number) => { if (!(key in modules)) { modules[key] = code; owners[key] = idx; } };
  let manifest: Record<string, any> | null = null;
  const viewPaths = new Set([`${nsPath}/view`]);
  const dataFiles: { idx: number; name: string; data: unknown }[] = [];

  files.forEach((f) => {
    if (!isManifest(f)) return;
    try { manifest = JSON.parse(f.code); } catch { notes.push(`${f.name}을 JSON으로 읽지 못했어요 · 쉼표나 따옴표를 확인해 주세요`); }
  });
  const m = manifest as Record<string, any> | null;
  const ui5 = m?.['sap.ui5'];
  const routingPath = ui5?.routing?.config?.viewPath;
  if (typeof routingPath === 'string') viewPaths.add(routingPath.replace(/\./g, '/'));

  files.forEach((f, i) => {
    const rel = stripWebapp(f.name);
    const b = base(f.name);
    if (isManifest(f)) return;
    if (isView(f)) {
      const file = /\.view\.xml$/i.test(b) ? b : `${b.replace(/\.xml$/i, '')}.view.xml`;
      for (const p of viewPaths) put(`${p}/${file}`, f.code, i);
      put(`${nsPath}/${file}`, f.code, i);
      if (rel.includes('/')) put(`${nsPath}/${rel}`, f.code, i);
      return;
    }
    if (isFragment(f)) {
      const file = /\.fragment\.xml$/i.test(b) ? b : `${b.replace(/\.xml$/i, '')}.fragment.xml`;
      for (const p of [...viewPaths, `${nsPath}/fragment`, `${nsPath}/view/fragments`, nsPath]) put(`${p}/${file}`, f.code, i);
      return;
    }
    if (/\.js$/i.test(b)) {
      // Controller.extend("a.b.controller.Main") → a/b/controller/Main.controller.js
      const ext1 = f.code.match(/\.extend\(\s*["']([\w.]+)["']/);
      if (ext1 && /\.controller\.\w+$/.test(ext1[1])) put(`${ext1[1].replace(/\./g, '/')}.js`, f.code, i);
      if (/\.controller\.js$/i.test(b)) put(`${nsPath}/controller/${b}`, f.code, i);
      if (/^Component\.js$/i.test(b)) put(`${nsPath}/Component.js`, f.code, i);
      if (rel.includes('/')) put(`${nsPath}/${rel}`, f.code, i);
      for (const dir of ['model', 'util', 'utils', 'controller', 'formatter', '']) put(dir ? `${nsPath}/${dir}/${b}` : `${nsPath}/${b}`, f.code, i);
      return;
    }
    if (isProps(f)) {
      put(`${nsPath}/i18n/${b}`, f.code, i);
      if (rel.includes('/')) put(`${nsPath}/${rel}`, f.code, i);
      return;
    }
    if (isCss(f)) { css.push(f.code); return; }
    if (isJson(f)) {
      for (const dir of ['model', 'localService/mockdata', 'localService', '']) put(dir ? `${nsPath}/${dir}/${b}` : `${nsPath}/${b}`, f.code, i);
      try { dataFiles.push({ idx: i, name: b, data: JSON.parse(f.code) }); } catch { /* 예시 데이터가 아니면 넘어가요 */ }
    }
  });

  // i18n: manifest가 부르는데 파일이 없으면 빈 묶음을 넣어 오류 없이 키 이름이 보이게 해요.
  const bundles = new Set<string>();
  if (typeof m?.['sap.app']?.i18n === 'string') bundles.add(`${nsPath}/${m['sap.app'].i18n}`);
  else if (m?.['sap.app']?.i18n?.bundleUrl) bundles.add(`${nsPath}/${m['sap.app'].i18n.bundleUrl}`);
  for (const mm of Object.values<any>(ui5?.models ?? {})) {
    const bn = mm?.settings?.bundleName;
    if (typeof bn === 'string') bundles.add(`${bn.replace(/\./g, '/')}.properties`);
  }
  for (const b of bundles) {
    if (!(b in modules)) {
      const any = Object.keys(modules).find((k) => k.endsWith('.properties'));
      modules[b] = any ? modules[any] : '';
      if (!any) notes.push('i18n 파일이 없어서 {i18n>…} 자리에는 키 이름이 그대로 보여요');
    }
    // i18n_ko 같은 언어별 파일을 먼저 찾으니 같은 내용을 넣어 둬요.
    for (const lang of ['ko', 'ko_KR', 'en', 'en_US']) { const k = b.replace(/\.properties$/, `_${lang}.properties`); if (!(k in modules)) modules[k] = modules[b]; }
  }

  // manifest 손보기: 서버(OData)·외부 CSS 연결은 미리보기에서 못 하니 빼고, 예시 데이터가 있으면 그걸로 바꿔요.
  if (m) {
    const ds = m['sap.app']?.dataSources ?? {};
    const odata = Object.entries<any>(ds).filter(([, d]) => !d?.type || /OData/i.test(d.type)).map(([k]) => k);
    if (odata.length) {
      for (const k of odata) delete ds[k];
      const mdl = ui5?.models ?? {};
      const removed: string[] = [];
      for (const [name, def] of Object.entries<any>(mdl)) if (def?.dataSource && odata.includes(def.dataSource)) { removed.push(name); delete mdl[name]; }
      const data = dataFiles.filter((d) => d.data && typeof d.data === 'object');
      if (data.length) {
        for (const name of removed) models.push({ name, data: data[0].data });
        notes.push(`OData 서버 대신 ${data[0].name}을 예시 데이터로 연결했어요`);
      } else {
        notes.push('미리보기에서는 SAP 서버(OData)에 연결할 수 없어요 · data.json 같은 예시 데이터를 올리면 그걸로 보여 줘요');
      }
    }
    if (ui5?.resources?.css) delete ui5.resources.css;
    if (m['sap.app']?.resources) delete m['sap.app'].resources;
    modules[`${nsPath}/manifest.json`] = JSON.stringify(m);
    owners[`${nsPath}/manifest.json`] = files.findIndex(isManifest);
    if (!Object.keys(modules).some((k) => k === `${nsPath}/Component.js`)) {
      modules[`${nsPath}/Component.js`] = `sap.ui.define(["sap/ui/core/UIComponent"], function (UIComponent) {
  "use strict";
  return UIComponent.extend("${ns}.Component", {
    metadata: { manifest: "json" },
    init: function () { UIComponent.prototype.init.apply(this, arguments); var r = this.getRouter(); if (r) { r.initialize(); } }
  });
});`;
    }
  } else if (dataFiles.length && dataFiles[0].data && typeof dataFiles[0].data === 'object') {
    models.push({ name: '', data: dataFiles[0].data });
  }

  // 뷰가 부르는데 없는 Controller는 빈 것으로 채워서 화면은 먼저 보이게 해요.
  for (const f of files.filter(isView)) {
    const cn = f.code.match(/controllerName\s*=\s*"([\w.]+)"/)?.[1];
    if (!cn) continue;
    const key = `${cn.replace(/\./g, '/')}.controller.js`;
    if (!(key in modules)) {
      modules[key] = `sap.ui.define(["sap/ui/core/mvc/Controller"], function (C) { "use strict"; return C.extend("${cn}", {}); });`;
      notes.push(`${cn} Controller 파일이 없어서 빈 Controller로 실행했어요`);
    }
  }

  let boot: Ui5Build['boot'] = { mode: 'component' };
  if (!m) {
    const views = files.filter(isView);
    const root = views.find((v) => /<(\w+:)?(App|Shell|SplitApp|NavContainer)\b/.test(v.code)) ?? views.find((v) => /^(Main|App|View1)\b/.test(base(v.name))) ?? views[0];
    if (root) {
      const file = base(root.name).replace(/\.view\.xml$/i, '').replace(/\.xml$/i, '');
      boot = { mode: 'view', viewName: `${ns}.view.${file}`, wrap: !/<(\w+:)?(App|Shell|SplitApp|NavContainer)\b/.test(root.code) };
    } else {
      notes.push('실행할 View가 없어요 · XML View 파일을 올려 주세요');
      boot = { mode: 'view', viewName: '', wrap: true };
    }
  }
  return { ns, modules, owners, css, boot, models, notes };
}

/** 자주 나는 오류에 한국어 힌트를 붙여요. */
export function hintFor(text: string): string | null {
  if (/reading 'getProperty'|reading 'setProperty'|reading 'getData'/.test(text)) return '모델이 아직 없어요. getModel("이름")의 이름이 manifest·setModel과 같은지 확인해 보세요.';
  if (/failed to load '([^']+)'|Cannot load|could not find|404/i.test(text)) return '부르는 파일을 찾지 못했어요. controllerName·viewName·define 경로가 파일 이름과 맞는지 확인해 보세요.';
  if (/is not a function/.test(text)) return '없는 함수를 불렀어요. 이름 철자나 this가 가리키는 대상을 확인해 보세요. (이벤트 함수 안에서는 .bind(this)가 필요할 때가 있어요)';
  if (/Invalid XML|XML.*(parse|error)|ParseError|mismatched tag/i.test(text)) return 'XML 모양이 깨졌어요. 태그를 닫았는지, 속성 따옴표가 맞는지 확인해 보세요.';
  if (/failed to load JavaScript resource|SyntaxError/.test(text)) return 'JS 문법 오류예요. 괄호·쉼표·따옴표를 확인해 보세요.';
  if (/is not defined/.test(text)) return '선언하지 않은 이름을 썼어요. sap.ui.define의 의존성 목록과 함수 인자를 확인해 보세요.';
  return null;
}

const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
const esc = (s: string) => s.replace(/</g, "\\u003c").split(LS).join("\\u2028").split(PS).join("\\u2029");

/** iframe 안 공통: 콘솔·오류를 부모로 보내고, 막힌 저장소를 메모리로 대신해요. */
function shim(runId: string, names: Record<string, number>): string {
  return `<script>(function(){
var RUN=${JSON.stringify(runId)}, NAMES=${esc(JSON.stringify(names))};
function mem(){var d={};return{getItem:function(k){return k in d?d[k]:null},setItem:function(k,v){d[k]=String(v)},removeItem:function(k){delete d[k]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}
['localStorage','sessionStorage'].forEach(function(s){try{window[s].length}catch(e){try{Object.defineProperty(window,s,{value:mem(),configurable:true})}catch(_){}}});
function at(text){if(!text)return null;var lines=String(text).split('\\n');for(var i=0;i<lines.length;i++){for(var k in NAMES){var p=lines[i].indexOf(k);if(p>=0){var m=lines[i].slice(p+k.length).match(/^(?:\\?eval)?:(\\d+)/);return{file:NAMES[k],line:m?+m[1]:null}}}}return null}
function fmt(a){return Array.prototype.map.call(a,function(x){if(x instanceof Error)return x.name+': '+x.message;if(x&&typeof x==='object'){try{return JSON.stringify(x)}catch(e){return String(x)}}return String(x)}).join(' ')}
function send(kind,text,where){try{parent.postMessage({cvRun:RUN,type:'log',kind:kind,text:String(text).slice(0,2000),at:where||null},'*')}catch(e){}}
window.__cvSend=function(type,extra){try{var m={cvRun:RUN,type:type};for(var k in extra)m[k]=extra[k];parent.postMessage(m,'*')}catch(e){}};
window.__cvLog=send;window.__cvAt=at;
var UI5LOG=/^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}/;
['log','info','warn','error','debug'].forEach(function(k){var o=console[k];console[k]=function(){var t=fmt(arguments);if(!UI5LOG.test(t)){send(k==='warn'||k==='error'?k:'log',t,at(new Error().stack.split('\\n').slice(2).join('\\n')));}try{o&&o.apply(console,arguments)}catch(e){}}});
window.addEventListener('error',function(e){if(e.target&&e.target!==window&&e.target.src){send('error','파일을 불러오지 못했어요: '+e.target.src);return}send('error',e.message,(e.filename?at(e.filename+':'+e.lineno):null)||at(e.error&&e.error.stack))});
window.addEventListener('unhandledrejection',function(e){var r=e.reason;send('error',r&&r.message?r.message:String(r),at(r&&r.stack))});
})();</script>`;
}

export function buildRunner(files: RunFile[], o: RunOptions): RunPlan | null {
  const kind = runKind(files);
  if (!kind) return null;
  const ui5Base = o.base ?? UI5_BASE;

  if (kind === 'ui5') {
    const b = buildUi5(files);
    const names: Record<string, number> = { ...b.owners };
    const cfg = { ns: b.ns, nsPath: b.ns.replace(/\./g, '/'), boot: b.boot, models: b.models, compact: o.compact };
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
${shim(o.runId, names)}
<style>html,body,#content{height:100%;margin:0}${b.css.join('\n').replace(/<\/style/gi, '<\\/style')}</style>
<script>window.__cvModules=${esc(JSON.stringify(b.modules))};window.__cvCfg=${esc(JSON.stringify(cfg))};
window.__cvBoot=function(){var C=window.__cvCfg;try{sap.ui.require.preload(window.__cvModules,C.ns.replace(/\\./g,'/')+'/cv-preload');}catch(e){__cvLog('error','파일을 넘기지 못했어요: '+e.message);}
sap.ui.require(['sap/base/Log'],function(Log){Log.addLogListener({onLogEntry:function(e){if(e.level<=Log.Level.ERROR){__cvLog('error',e.message+(e.details?' — '+e.details:''),__cvAt(e.details));}}});});
if(C.compact)document.body.classList.add('sapUiSizeCompact');else document.body.classList.add('sapUiSizeCozy');
var models=function(target){C.models.forEach(function(m){sap.ui.require(['sap/ui/model/json/JSONModel'],function(J){target.setModel(new J(m.data),m.name||undefined);});});};
if(C.boot.mode==='component'){sap.ui.require(['sap/ui/core/Component','sap/ui/core/ComponentContainer'],function(Component,CC){Component.create({name:C.ns,manifest:true}).then(function(comp){models(comp);new CC({component:comp,height:'100%'}).placeAt('content');__cvSend('ready',{});}).catch(function(e){__cvLog('error',e.message||String(e),__cvAt(e.stack));__cvSend('fail',{});});});}
else{if(!C.boot.viewName){__cvSend('fail',{});return;}sap.ui.require(['sap/ui/core/mvc/XMLView','sap/m/App','sap/ui/core/Core'],function(XMLView,App){XMLView.create({viewName:C.boot.viewName}).then(function(v){models(v);if(C.boot.wrap){new App({pages:[v]}).placeAt('content');}else{v.placeAt('content');}__cvSend('ready',{});}).catch(function(e){__cvLog('error',e.message||String(e),__cvAt(e.stack));__cvSend('fail',{});});});}};
</script>
<script id="sap-ui-bootstrap" src="${ui5Base}sap-ui-core.js" data-sap-ui-theme="${o.theme}" data-sap-ui-libs="sap.m" data-sap-ui-compatVersion="edge" data-sap-ui-async="true" data-sap-ui-oninit="__cvBoot" data-sap-ui-language="ko" onerror="__cvLog('error','UI5를 불러오지 못했어요 · 인터넷 연결을 확인해 주세요');__cvSend('fail',{})"></script>
</head><body class="sapUiBody" id="content"></body></html>`;
    return { html, kind, notes: b.notes };
  }

  // 일반 웹: HTML에 올린 CSS·JS를 이어 붙여요. src·href가 올린 파일 이름이면 그 내용으로 바꿔요.
  const names: Record<string, number> = {};
  files.forEach((f, i) => { names[`cv/${base(f.name)}`] = i; });
  const scriptOf = (f: RunFile) => `<script${/^\s*(import|export)\s/m.test(f.code) ? ' type="module"' : ''}>${f.code.replace(/<\/script/gi, '<\\/script')}\n//# sourceURL=cv/${base(f.name)}</script>`;
  const styleOf = (f: RunFile) => `<style>${f.code.replace(/<\/style/gi, '<\\/style')}</style>`;
  const used = new Set<RunFile>();
  const byName = (src: string) => files.find((f) => ext(base(f.name)) === ext(base(src.split('?')[0])));
  let html: string;
  if (kind === 'web') {
    const page = files.find(isHtml)!;
    used.add(page);
    html = page.code
      .replace(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>\s*<\/script>/gi, (all, src) => { const f = byName(src); if (!f || !isJs(f)) return all; used.add(f); return scriptOf(f); })
      .replace(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi, (all, href) => { const f = byName(href); if (!f || !isCss(f)) return all; used.add(f); return styleOf(f); });
    const restCss = files.filter((f) => isCss(f) && !used.has(f)).map(styleOf).join('');
    const restJs = files.filter((f) => isJs(f) && !used.has(f)).map(scriptOf).join('');
    const head = shim(o.runId, names) + restCss;
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (h) => h + head) : head + html;
    html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${restJs}<script>__cvSend('ready',{})</script></body>`) : `${html}${restJs}<script>__cvSend('ready',{})</script>`;
  } else {
    html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">${shim(o.runId, names)}<style>body{font:14px/1.6 system-ui,sans-serif;color:#555;margin:16px}</style></head><body><p>화면이 없는 코드예요 · 실행 결과는 아래 콘솔에 나와요</p>${files.filter(isJs).map(scriptOf).join('')}<script>__cvSend('ready',{})</script></body></html>`;
  }
  return { html, kind, notes: [] };
}
