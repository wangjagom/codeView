/**
 * OpenUI5 컨트롤 정보 (컨트롤·속성·집합(aggregation)·이벤트·연결·enum 값·모듈 경로·메서드 이름).
 * ui5meta.json은 OpenUI5를 실제로 불러 각 컨트롤의 metadata를 읽어서 만들었어요 (scripts/ui5meta 참고).
 * 커서 자동완성에서만 쓰니 필요할 때 따로 불러와요.
 */
interface Raw {
  v: string;
  /** 이름 → [부모, 플래그(1 추상, 2 기반 클래스), 기본 집합, 'prop:type,…', 'agg:type:multiple,…', 'event,…', 'assoc,…'] */
  c: Record<string, [string, number, string, string, string, string, string]>;
  e: Record<string, string>;
  m: string;
  f: string;
}

export interface Ui5Class {
  name: string;
  parent: string;
  abstract: boolean;
  base: boolean;
  defaultAgg: string;
  props: { name: string; type: string }[];
  aggs: { name: string; type: string; multiple: boolean }[];
  events: string[];
  assocs: string[];
}

export interface Ui5Meta {
  version: string;
  classes: Map<string, Ui5Class>;
  enums: Map<string, string[]>;
  modules: string[];
  methods: string[];
}

const split = (s: string) => (s ? s.split(',') : []);

export function parseMeta(raw: Raw): Ui5Meta {
  const classes = new Map<string, Ui5Class>();
  for (const [name, [parent, flags, defaultAgg, props, aggs, events, assocs]] of Object.entries(raw.c)) {
    classes.set(name, {
      name, parent, defaultAgg, abstract: !!(flags & 1), base: !!(flags & 2),
      props: split(props).map((p) => { const [n, t] = p.split(':'); return { name: n, type: t }; }),
      aggs: split(aggs).map((a) => { const [n, t, m] = a.split(':'); return { name: n, type: t, multiple: m === '1' }; }),
      events: split(events), assocs: split(assocs),
    });
  }
  return {
    version: raw.v, classes,
    enums: new Map(Object.entries(raw.e).map(([k, v]) => [k, split(v)])),
    modules: raw.m.split(' '), methods: raw.f.split(' '),
  };
}

let meta: Ui5Meta | null = null;
let loading: Promise<Ui5Meta> | null = null;

/** 불러 둔 정보 (아직이면 null) */
export const ui5Meta = () => meta;

/** 처음 한 번만 불러와요. */
export function loadUi5Meta(): Promise<Ui5Meta> {
  if (meta) return Promise.resolve(meta);
  loading ??= import('./ui5meta.json').then((m) => (meta = parseMeta((m.default ?? m) as unknown as Raw)));
  return loading;
}

/** 부모 클래스까지 거슬러 올라가며 모아요 (가까운 쪽 먼저). */
export function lineage(m: Ui5Meta, name: string): Ui5Class[] {
  const out: Ui5Class[] = [];
  for (let c = m.classes.get(name); c && out.length < 30; c = m.classes.get(c.parent)) out.push(c);
  return out;
}

export function isA(m: Ui5Meta, name: string, type: string): boolean {
  return lineage(m, name).some((c) => c.name === type);
}

/** 상속받은 것까지 모은 속성·집합·이벤트·연결 */
export function allMembers(m: Ui5Meta, name: string) {
  const line = lineage(m, name);
  return {
    props: line.flatMap((c) => c.props.map((p) => ({ ...p, from: c.name }))),
    aggs: line.flatMap((c) => c.aggs.map((a) => ({ ...a, from: c.name }))),
    events: line.flatMap((c) => c.events.map((e) => ({ name: e, from: c.name }))),
    assocs: line.flatMap((c) => c.assocs.map((a) => ({ name: a, from: c.name }))),
    defaultAgg: line.find((c) => c.defaultAgg)?.defaultAgg ?? '',
  };
}

/** XML에서 쓸 수 있는 컨트롤·요소 (추상·기반 클래스 빼고) */
export const usableClasses = (m: Ui5Meta) => [...m.classes.values()].filter((c) => !c.abstract && !c.base);
