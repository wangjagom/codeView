/**
 * 코드를 고친 뒤 예전 줄 번호가 새 코드의 몇 번째 줄이 됐는지 계산해요 (줄 단위 LCS).
 * 리뷰가 고친 코드를 따라가게 할 때 써요. 지워진 줄의 리뷰는 바로 앞에 남은 줄 다음으로 가요.
 */
export function lineMapper(oldText: string, newText: string): (oldLine: number) => number {
  const a = oldText.split('\n'), b = newText.split('\n');
  const n = a.length, m = b.length;
  const map = new Int32Array(n).fill(-1);
  // 앞뒤로 같은 줄은 그대로 짝지어요.
  let pre = 0;
  while (pre < n && pre < m && a[pre] === b[pre]) { map[pre] = pre; pre++; }
  let suf = 0;
  while (suf < n - pre && suf < m - pre && a[n - 1 - suf] === b[m - 1 - suf]) { map[n - 1 - suf] = m - 1 - suf; suf++; }
  const A = a.slice(pre, n - suf), B = b.slice(pre, m - suf);
  if (A.length && B.length && A.length * B.length <= 4_000_000) {
    const w = B.length + 1;
    const dp = new Uint16Array((A.length + 1) * w);
    for (let i = A.length - 1; i >= 0; i--) {
      for (let j = B.length - 1; j >= 0; j--) {
        dp[i * w + j] = A[i] === B[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
      }
    }
    let i = 0, j = 0;
    while (i < A.length && j < B.length) {
      if (A[i] === B[j]) { map[pre + i] = pre + j; i++; j++; }
      else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) i++;
      else j++;
    }
  }
  return (oldLine: number) => {
    const i = Math.min(Math.max(oldLine - 1, 0), n - 1);
    if (map[i] >= 0) return map[i] + 1;
    // 지워진 줄: 앞쪽에서 가장 가까운 남은 줄 다음 줄
    for (let k = i - 1; k >= 0; k--) if (map[k] >= 0) return Math.min(map[k] + 2, m);
    for (let k = i + 1; k < n; k++) if (map[k] >= 0) return Math.max(map[k], 1);
    return Math.min(oldLine, m);
  };
}
