import { describe, expect, it } from 'vitest';
import { similarTasks, taskProblem } from './tasks';

describe('tasks', () => {
  it('같은 이름은 띄어쓰기·대소문자를 무시하고 막아요', () => {
    expect(taskProblem('3주차 과제', ['3주차과제'])).toContain('이미 있는');
    expect(taskProblem('  ', [])).toContain('적어');
    expect(taskProblem('a'.repeat(41), [])).toContain('40자');
    expect(taskProblem('새 과제', ['a'])).toBeNull();
  });
  it('비슷한 과제를 찾아요', () => {
    expect(similarTasks('3주차', ['3주차 과제', '4주차 과제', '자유 질문'])).toEqual(['3주차 과제']);
    expect(similarTasks('ABAP 과제', ['2. Back-End (ABAP)', 'ABAP 과제1'])).toEqual(['ABAP 과제1']);
    expect(similarTasks('프로젝', ['5. 프로젝트'])).toEqual(['5. 프로젝트']);
    expect(similarTasks('완전히 다른 것', ['3주차 과제'])).toEqual([]);
  });
});
