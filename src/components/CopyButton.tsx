import { useEffect, useRef, useState } from 'react';
import { copyText } from '../lib/util';
import { Icon } from './Icon';

/** 누르면 잠깐 "복사했어요"로 바뀌는 복사 버튼. 복사가 막히면 안내 문구를 토스트로 보여 줘요. */
export function CopyButton({ text, label, icon = 'copy', className = '', onFail }: {
  text: () => string; label: string; icon?: string; className?: string; onFail?: (msg: string) => void;
}) {
  const [done, setDone] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <button type="button" className={`act-btn ${done ? 'done' : ''} ${className}`} aria-live="polite"
      onClick={async () => {
        if (await copyText(text())) {
          setDone(true);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setDone(false), 1800);
        } else onFail?.('복사가 막혀 있어요. 코드를 길게 눌러 직접 복사해 주세요');
      }}>
      <Icon name={done ? 'check' : icon} />{done ? '복사했어요' : label}
    </button>
  );
}
