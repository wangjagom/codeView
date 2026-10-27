/** 파일 이름의 / 를 폴더로 보고 VS Code 탐색기처럼 줄을 만들어요. */
export interface TreeRow {
  kind: 'folder' | 'file';
  /** 폴더는 'view' 'view/sub' 같은 경로, 파일은 files의 번호 */
  key: string;
  label: string;
  depth: number;
  /** 파일 번호 (파일 줄만) */
  index: number;
  /** 폴더 안의 파일 번호들 (폴더 줄만) */
  inside: number[];
}

/** 파일 이름에 폴더가 하나라도 있으면 트리로 보여 줘요. */
export const hasFolders = (files: { name: string }[]) => files.some((f) => cleanPath(f.name).includes('/'));

export const cleanPath = (name: string) => name.trim().replace(/\\/g, '/').replace(/^\.?\/+/, '').replace(/\/{2,}/g, '/');

/** 경로를 폴더 부분과 파일 이름으로 나눠요. */
export function splitPath(name: string): { dirs: string[]; base: string } {
  const parts = cleanPath(name).split('/');
  const base = parts.pop() ?? '';
  return { dirs: parts.filter(Boolean), base };
}

interface Node { dirs: Map<string, Node>; files: { index: number; base: string }[]; path: string }

/** 접힌 폴더(closed) 안은 빼고 보이는 줄만 돌려줘요. 폴더 먼저, 이름 순서예요. */
export function treeRows(files: { name: string }[], closed: Set<string> = new Set(), untitled = (i: number) => `파일 ${i + 1}`): TreeRow[] {
  const root: Node = { dirs: new Map(), files: [], path: '' };
  files.forEach((f, index) => {
    const { dirs, base } = splitPath(f.name);
    let n = root;
    for (const d of dirs) {
      let next = n.dirs.get(d);
      if (!next) { next = { dirs: new Map(), files: [], path: n.path ? `${n.path}/${d}` : d }; n.dirs.set(d, next); }
      n = next;
    }
    n.files.push({ index, base: base || untitled(index) });
  });
  const all = (n: Node): number[] => [...n.files.map((f) => f.index), ...[...n.dirs.values()].flatMap(all)];
  const cmp = (a: string, b: string) => a.localeCompare(b, 'en', { sensitivity: 'base' });
  const rows: TreeRow[] = [];
  const walk = (n: Node, depth: number) => {
    for (const [name, d] of [...n.dirs.entries()].sort((a, b) => cmp(a[0], b[0]))) {
      rows.push({ kind: 'folder', key: d.path, label: name, depth, index: -1, inside: all(d) });
      if (!closed.has(d.path)) walk(d, depth + 1);
    }
    for (const f of [...n.files].sort((a, b) => cmp(a.base, b.base))) rows.push({ kind: 'file', key: String(f.index), label: f.base, depth, index: f.index, inside: [] });
  };
  walk(root, 0);
  return rows;
}

/** 폴더 수 (중첩 폴더도 하나씩 세요) */
export function folderCount(files: { name: string }[]): number {
  const set = new Set<string>();
  for (const f of files) {
    const { dirs } = splitPath(f.name);
    dirs.forEach((_, i) => set.add(dirs.slice(0, i + 1).join('/')));
  }
  return set.size;
}
