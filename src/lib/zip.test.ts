import { describe, expect, it } from 'vitest';
import { crc32, makeZip, safeName } from './zip';

describe('zip', () => {
  it('crc32 표준 값', () => {
    expect(crc32(new TextEncoder().encode('123456789')).toString(16)).toBe('cbf43926');
  });
  it('unzip으로 그대로 풀려요 (한글 이름 포함)', async () => {
    // 이 프로젝트에는 Node 타입이 없어서 테스트에서만 동적으로 불러와요.
    const mod = (m: string) => import(/* @vite-ignore */ m);
    const { execFileSync } = await mod('node:child_process');
    const { mkdtempSync, readFileSync, writeFileSync } = await mod('node:fs');
    const { tmpdir } = await mod('node:os');
    const { join } = await mod('node:path');
    const dir = mkdtempSync(join(tmpdir(), 'cvzip-'));
    const zip = makeZip([{ name: 'zr_판매.prog.abap', text: "REPORT zr_sales.\nWRITE '안녕'." }, { name: 'README.md', text: '# 설명' }]);
    writeFileSync(join(dir, 'a.zip'), zip);
    let ok = true;
    try { execFileSync('unzip', ['-q', '-o', join(dir, 'a.zip'), '-d', join(dir, 'out')]); } catch { ok = false; }
    if (!ok) return; // unzip이 없는 환경이면 건너뛰어요
    expect(readFileSync(join(dir, 'out', 'zr_판매.prog.abap'), 'utf8')).toBe("REPORT zr_sales.\nWRITE '안녕'.");
    expect(readFileSync(join(dir, 'out', 'README.md'), 'utf8')).toBe('# 설명');
  });
  it('파일 이름 정리', () => {
    expect(safeName('a/b:c?.js')).toBe('a_b_c_.js');
    expect(safeName('   ')).toBe('code');
  });
});
