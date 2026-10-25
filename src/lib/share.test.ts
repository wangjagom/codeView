import { describe, expect, it } from 'vitest';
import { discordText, plainText, type ShareInput } from './share';

const base: ShareInput = {
  title: '판매 리포트', share: false, status: '리뷰 대기', author: '지은', file: 'zr_sales.prog.abap', lang: 'ABAP', fence: 'abap',
  version: 2, code: 'REPORT z.\nSELECT * FROM vbak INTO TABLE @DATA(lt).', ask: 'WHERE를 어떻게 줄까요?\n둘째 줄',
  errors: 1, warnings: 0, reviews: 3, otherFiles: [], link: 'https://example.com/#/post/p1',
};

describe('discordText', () => {
  it('제목·파일·코드 블록·링크를 담아요', () => {
    const t = discordText(base);
    expect(t.startsWith('**[리뷰 요청 · 리뷰 대기] 판매 리포트**\nzr_sales.prog.abap · ABAP · v2 · 지은')).toBe(true);
    expect(t).toContain('> WHERE를 어떻게 줄까요? 둘째 줄');
    expect(t).toContain('```abap\nREPORT z.\nSELECT * FROM vbak INTO TABLE @DATA(lt).\n```');
    expect(t).toContain('오류 1 · 리뷰 3');
    expect(t.endsWith('<https://example.com/#/post/p1>')).toBe(true);
    expect(t).not.toContain('줄만 보여요');
  });
  it('긴 코드는 앞부분만 넣고 2000자를 넘지 않아요', () => {
    const code = Array.from({ length: 60 }, (_, i) => `    DATA(lv_${i}) = ${'x'.repeat(120)}.`).join('\n');
    const t = discordText({ ...base, code });
    expect(t.length).toBeLessThanOrEqual(2000);
    expect(t).toMatch(/… 60줄 중 \d+줄만 보여요/);
    expect(t).toContain('```abap\n    DATA(lv_0)');
  });
  it('공유 글은 상태 대신 코드 공유로 표시해요', () => {
    expect(discordText({ ...base, share: true, status: undefined, errors: 0 })).toContain('**[코드 공유] 판매 리포트**');
    expect(discordText({ ...base, share: true, errors: 0 })).toContain('질문·의견 3');
  });
});

describe('plainText', () => {
  it('마크다운 없이 짧게', () => {
    const code = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n');
    const t = plainText({ ...base, code, otherFiles: ['a.ddls'] });
    expect(t).not.toContain('```');
    expect(t).not.toContain('**');
    expect(t).toContain('line 8\n… (20줄 중 8줄)');
    expect(t).toContain('오류 1 · 리뷰 3 · 파일 2개');
    expect(t.endsWith('코드 전체 보기: https://example.com/#/post/p1')).toBe(true);
  });
});
