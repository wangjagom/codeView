/** SAP 부트캠프 과정에서 쓰는 언어만 골라요. id는 DB(posts.lang)에 그대로 저장돼요. */
export interface Lang {
  id: string;
  label: string;
  /** 어느 과정에서 주로 쓰는지 */
  course: string;
  /** 디스코드 코드 블록 언어 */
  fence: string;
  /** 파일 이름 끝 (긴 것부터 확인해요) */
  exts: string[];
  /** 파일 이름 예시 */
  sample: string;
}

export const LANGS: Lang[] = [
  { id: 'ABAP', label: 'ABAP', course: 'Back-End · Clean Core', fence: 'abap', exts: ['.prog.abap', '.clas.abap', '.intf.abap', '.fugr.abap', '.abap'], sample: 'zr_sales_report.prog.abap' },
  { id: 'CDS', label: 'CDS View', course: 'Clean Core Back-End', fence: 'sql', exts: ['.ddls.asddls', '.asddls', '.ddls', '.cds'], sample: 'zi_salesorder.ddls.asddls' },
  { id: 'SQLScript', label: 'SQLScript (AMDP)', course: 'ABAP for HANA', fence: 'sql', exts: ['.sql', '.hdbprocedure'], sample: 'zcl_amdp_sales.sql' },
  { id: 'XML', label: 'UI5 XML View', course: 'UI · Fiori', fence: 'xml', exts: ['.view.xml', '.fragment.xml', '.xml'], sample: 'Main.view.xml' },
  { id: 'JavaScript', label: 'JavaScript (UI5)', course: 'UI 프로그래밍 · Fiori', fence: 'js', exts: ['.controller.js', '.js'], sample: 'Main.controller.js' },
  { id: 'HTML', label: 'HTML', course: 'UI 프로그래밍', fence: 'html', exts: ['.html', '.htm'], sample: 'index.html' },
  { id: 'CSS', label: 'CSS', course: 'UI 프로그래밍', fence: 'css', exts: ['.css'], sample: 'style.css' },
  { id: 'JSON', label: 'JSON (manifest)', course: 'Fiori', fence: 'json', exts: ['.json'], sample: 'manifest.json' },
  { id: 'Properties', label: 'i18n (properties)', course: 'Fiori', fence: 'properties', exts: ['.properties'], sample: 'i18n.properties' },
];

const BY_ID = new Map(LANGS.map((l) => [l.id, l]));
/** 예전에 올라온 글의 언어(TypeScript 등)도 이름은 그대로 보여 줘요. */
export const langLabel = (id: string) => BY_ID.get(id)?.label ?? id;
export const fenceOf = (id: string) => BY_ID.get(id)?.fence ?? id.toLowerCase();

export function langFromFile(name: string): string | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  let best: { id: string; len: number } | null = null;
  for (const l of LANGS) for (const e of l.exts) if (n.endsWith(e) && (!best || e.length > best.len)) best = { id: l.id, len: e.length };
  return best?.id ?? null;
}

/** 붙여넣은 코드만 보고 언어를 짐작해요. 모르면 null. */
export function langFromCode(code: string): string | null {
  const c = code.trim();
  if (!c) return null;
  if (/^\s*[{[]/.test(c)) { try { JSON.parse(c); return 'JSON'; } catch { if (/"sap\.app"|"sap\.ui5"/.test(c)) return 'JSON'; } }
  if (/<(mvc:View|core:FragmentDefinition|View)\b|xmlns(:\w+)?="sap\.m"/.test(c)) return 'XML';
  if (/^\s*(@\w+(\.\w+)*\s*:|define\s+(root\s+)?view(\s+entity)?\b)/im.test(c) && /\bdefine\s+(root\s+)?view\b/i.test(c)) return 'CDS';
  if (/\b(METHOD\s+\w+\s+BY\s+DATABASE\s+PROCEDURE|LANGUAGE\s+SQLSCRIPT)\b/i.test(c)) return 'SQLScript';
  if (/^\s*(REPORT|PROGRAM|CLASS\s+\S+\s+DEFINITION|FUNCTION|FORM|DATA(\(|:|\s))|^\s*(DATA|TYPES|SELECT|LOOP\s+AT|WRITE|PARAMETERS|START-OF-SELECTION)\b[^;]*\.\s*$/im.test(c)) return 'ABAP';
  if (/<!doctype html|<html[\s>]|<(div|body|head|script)[\s>]/i.test(c)) return 'HTML';
  if (/sap\.ui\.define|sap\.ui\.require|\bfunction\b|=>|\bconst\b|\blet\b/.test(c)) return 'JavaScript';
  if (/^[^{}]+\{[^{}]*:[^{}]*;[^{}]*\}/m.test(c)) return 'CSS';
  return null;
}
