/** 과제 목록 규칙: 이름 1~40자, 30개까지, 같은 이름(띄어쓰기·대소문자 무시)은 하나만. */
export const TASK_MAX = 30;
export const TASK_NAME_MAX = 40;
/** 부트캠프 과정 모듈 (팀을 처음 만들 때 기본으로 넣어 둬요) */
export const COURSE_TASKS = ['1. UI 프로그래밍', '2. Back-End (ABAP)', '3. Clean Core Back-End', '4. Clean Core UI', '5. 프로젝트', '자유 질문'];
/** 비교용: 띄어쓰기·문장부호를 빼고 소문자로 */
export const normTask = (s) => s.toLowerCase().replace(/[\s.,·:()[\]_\-/]+/g, '');
/** 넣을 수 없는 이유. 괜찮으면 null. */
export function taskProblem(name, list) {
    const t = name.trim();
    if (!t)
        return '과제 이름을 적어 주세요.';
    if (t.length > TASK_NAME_MAX)
        return `과제 이름은 ${TASK_NAME_MAX}자까지예요.`;
    if (list.some((x) => normTask(x) === normTask(t)))
        return '이미 있는 과제예요.';
    if (list.length >= TASK_MAX)
        return `과제는 ${TASK_MAX}개까지 만들 수 있어요.`;
    return null;
}
function editDistance(a, b) {
    const d = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        let prev = d[0];
        d[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const cur = d[j];
            d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
            prev = cur;
        }
    }
    return d[b.length];
}
/** 새로 적는 이름과 비슷한 기존 과제 (예: "3주차" → "3주차 과제"). 최대 3개. */
export function similarTasks(name, list) {
    const n = normTask(name);
    if (n.length < 2)
        return [];
    return list
        .map((t) => ({ t, k: normTask(t) }))
        .filter(({ k }) => k !== n && (k.includes(n) || n.includes(k) || editDistance(k, n) <= Math.max(1, Math.floor(Math.min(k.length, n.length) / 4))))
        .map(({ t }) => t)
        .slice(0, 3);
}
