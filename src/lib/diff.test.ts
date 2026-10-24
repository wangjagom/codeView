import { describe, expect, it } from 'vitest';
import { lineMapper } from './diff';

describe('lineMapper', () => {
  it('위에 줄을 넣으면 아래 리뷰가 따라 내려가요', () => {
    const f = lineMapper('a\nb\nc', 'x\ny\na\nb\nc');
    expect([f(1), f(2), f(3)]).toEqual([3, 4, 5]);
  });
  it('중간 줄을 지우면 뒤 줄이 올라와요', () => {
    const f = lineMapper('a\nb\nc\nd', 'a\nd');
    expect(f(1)).toBe(1);
    expect(f(4)).toBe(2);
    expect(f(2)).toBe(2); // 지워진 줄은 앞에 남은 줄 다음으로
  });
  it('줄 내용을 고치면 같은 자리에 남아요', () => {
    const f = lineMapper('a\nconsole.log(e);\nc', 'a\nconsole.error(e);\nthrow e;\nc');
    expect(f(1)).toBe(1);
    expect(f(3)).toBe(4);
    expect(f(2)).toBe(2);
  });
});
