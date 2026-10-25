/**
 * 채팅에 붙여 넣을 글: 디스코드는 마크다운(굵게·코드 블록)을 그려 주고, 카톡 같은 메신저는 글자 그대로 보여 줘요.
 * 디스코드 한 메시지는 2000자까지라 코드는 앞부분만 넣고, 나머지는 링크로 보게 해요.
 */
export interface ShareInput {
  title: string;
  share: boolean;
  /** 리뷰 요청 글의 상태 ('리뷰 대기' 등) */
  status?: string;
  author: string;
  file: string;
  lang: string;
  fence: string;
  version: number;
  code: string;
  ask?: string;
  errors: number;
  warnings: number;
  reviews: number;
  otherFiles: string[];
  link: string;
}

const DISCORD_MAX = 2000;

const firstLines = (s: string, n: number) => s.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, n).join(' ');

function codePart(code: string, maxLines: number, maxChars: number) {
  const all = code.replace(/\s+$/, '').split('\n');
  let lines = all.slice(0, maxLines);
  while (lines.length > 1 && lines.join('\n').length > maxChars) lines = lines.slice(0, -1);
  let text = lines.join('\n');
  if (text.length > maxChars) text = text.slice(0, maxChars);
  return { text, shown: lines.length, total: all.length };
}

function countsLine(i: ShareInput) {
  const parts: string[] = [];
  if (i.errors) parts.push(`오류 ${i.errors}`);
  if (i.warnings) parts.push(`경고 ${i.warnings}`);
  parts.push(`${i.share ? '질문·의견' : '리뷰'} ${i.reviews}`);
  return parts.join(' · ');
}

const kindTag = (i: ShareInput) => (i.share ? '코드 공유' : `리뷰 요청${i.status ? ` · ${i.status}` : ''}`);

/** 디스코드용: 굵은 제목, 코드 블록(색칠됨), 링크는 <>로 감싸 큰 카드가 또 붙지 않게 해요. */
export function discordText(i: ShareInput): string {
  const head = `**[${kindTag(i)}] ${i.title}**\n${i.file} · ${i.lang} · v${i.version} · ${i.author}`;
  const ask = i.ask?.trim() ? `\n> ${firstLines(i.ask, 2).slice(0, 160)}` : '';
  const others = i.otherFiles.length ? `\n다른 파일: ${i.otherFiles.join(', ')}` : '';
  const tail = (more: string) => `${more}\n${countsLine(i)}${others}\n<${i.link}>`;
  // 코드 말고 부분의 길이를 먼저 재서 남는 만큼만 코드를 넣어요.
  const fixed = head.length + ask.length + tail('\n… 0000줄 중 0000줄만 보여요').length + `\n\`\`\`${i.fence}\n\n\`\`\``.length;
  const c = codePart(i.code, 15, Math.max(200, DISCORD_MAX - fixed - 20));
  const more = c.shown < c.total ? `\n… ${c.total}줄 중 ${c.shown}줄만 보여요` : '';
  return `${head}${ask}\n\`\`\`${i.fence}\n${c.text}\n\`\`\`${tail(more)}`;
}

/** 카톡·메신저용: 마크다운 없이 글자만. 코드는 짧게 맛보기로. */
export function plainText(i: ShareInput): string {
  const c = codePart(i.code, 8, 600);
  const lines = [
    `[${kindTag(i)}] ${i.title}`,
    `${i.file} · ${i.lang} · ${i.author}`,
    ...(i.ask?.trim() ? [`"${firstLines(i.ask, 2).slice(0, 120)}"`] : []),
    '',
    c.text,
    ...(c.shown < c.total ? [`… (${c.total}줄 중 ${c.shown}줄)`] : []),
    '',
    countsLine(i) + (i.otherFiles.length ? ` · 파일 ${i.otherFiles.length + 1}개` : ''),
    `코드 전체 보기: ${i.link}`,
  ];
  return lines.join('\n');
}
