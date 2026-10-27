import { describe, expect, it } from 'vitest';
import { folderCount, hasFolders, splitPath, treeRows } from './tree';
import { templateSetFiles } from './templates';

const files = templateSetFiles('ui5-nav');

describe('tree', () => {
  it('세트 파일은 폴더 안에 들어가요', () => {
    expect(files.map((f) => f.name)).toContain('view/List.view.xml');
    expect(files.map((f) => f.name)).toContain('manifest.json');
    expect(hasFolders(files)).toBe(true);
    expect(hasFolders([{ name: 'Main.view.xml' }])).toBe(false);
    expect(folderCount(files)).toBe(3);
  });
  it('폴더 먼저, 이름 순서로 줄을 만들어요', () => {
    const rows = treeRows(files);
    expect(rows.map((r) => `${'  '.repeat(r.depth)}${r.label}`)).toEqual([
      'controller', '  Detail.controller.js', '  List.controller.js',
      'model', '  data.json',
      'view', '  App.view.xml', '  Detail.view.xml', '  List.view.xml',
      'manifest.json',
    ]);
    expect(rows.find((r) => r.label === 'view')!.inside.length).toBe(3);
  });
  it('접힌 폴더 안은 빼요', () => {
    expect(treeRows(files, new Set(['view'])).map((r) => r.label)).not.toContain('App.view.xml');
  });
  it('경로를 나눠요 (\\ 와 앞의 ./ 도)', () => {
    expect(splitPath('./webapp\\view/Main.view.xml')).toEqual({ dirs: ['webapp', 'view'], base: 'Main.view.xml' });
    expect(treeRows([{ name: 'a/' }, { name: '' }]).filter((r) => r.kind === 'file').map((r) => r.label)).toEqual(['파일 1', '파일 2']);
  });
});
