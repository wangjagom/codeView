import { useEffect, useRef, useState, type ReactNode } from 'react';
import { readPref, writePref } from '../lib/util';
import { Icon } from './Icon';
import { LangIcon } from './LangIcon';

const MIN = 12, MAX = 20;

/** 크게 보기: 코드만 화면 가득. 글자 크기·줄바꿈을 바꾸고, 파일이 여러 개면 앞뒤로 넘겨요. Esc나 닫기로 돌아가요. */
export function CodeFull({ name, lang, index, total, wrap, onWrap, onFile, onClose, children }: {
  name: string; lang: string; index: number; total: number; wrap: boolean; onWrap: () => void;
  onFile: (i: number) => void; onClose: () => void; children: (fontPx: number) => ReactNode;
}) {
  const [fs, setFs] = useState(() => { const n = Number(readPref('cv-fs')); return n >= MIN && n <= MAX ? n : 15; });
  const box = useRef<HTMLDivElement>(null);
  const size = (d: number) => setFs((cur) => { const n = Math.min(MAX, Math.max(MIN, cur + d)); writePref('cv-fs', String(n)); return n; });

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const back = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLButtonElement>('.cf-close')?.focus();
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === 'Escape' && !t.closest('textarea, input, [role="listbox"], .menu')) { e.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); back?.focus?.(); };
  }, [onClose]);

  useEffect(() => { box.current?.querySelector('.cf-body')?.scrollTo({ top: 0 }); }, [index]);

  return (
    <div className="code-full" role="dialog" aria-modal="true" aria-label={`${name} 크게 보기`} ref={box}>
      <div className="cf-bar">
        <LangIcon lang={lang} size={18} />
        <span className="cf-name">{name}{total > 1 && <small>{index + 1}/{total}</small>}</span>
        <button type="button" className="cf-btn" aria-label="글자 작게" disabled={fs <= MIN} onClick={() => size(-1)}>가<sup>−</sup></button>
        <button type="button" className="cf-btn big" aria-label="글자 크게" disabled={fs >= MAX} onClick={() => size(1)}>가<sup>+</sup></button>
        <button type="button" className="cf-btn" aria-label="줄바꿈" aria-pressed={wrap} title={wrap ? '줄바꿈 끄기' : '줄바꿈 켜기'} onClick={onWrap}><Icon name="wrap" /></button>
        <button type="button" className="cf-btn cf-close" aria-label="닫기" onClick={onClose}><Icon name="close" /></button>
      </div>
      <div className="cf-body">{children(fs)}</div>
      {total > 1 && (
        <div className="cf-foot">
          <button type="button" disabled={index === 0} onClick={() => onFile(index - 1)}><Icon name="back" />이전 파일</button>
          <button type="button" disabled={index === total - 1} onClick={() => onFile(index + 1)}>다음 파일<Icon name="chev" /></button>
        </div>
      )}
    </div>
  );
}
