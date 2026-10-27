import { useEffect, useMemo, useRef, useState } from 'react';
import { buildRunner, hintFor, type RunFile, type Ui5Theme } from '../lib/runner';
import { readPref, writePref } from '../lib/util';
import { Icon } from './Icon';
import { Dots } from './Motion';
import { Picker } from './Picker';

interface Log { kind: 'log' | 'warn' | 'error' | 'info'; text: string; at: { file: number; line: number | null } | null }

const THEMES: { value: Ui5Theme; label: string }[] = [
  { value: 'sap_horizon', label: 'Horizon' },
  { value: 'sap_horizon_dark', label: 'Horizon 다크' },
  { value: 'sap_fiori_3', label: 'Quartz (Fiori 3)' },
];
const DEVICES = [['phone', '휴대폰', 390], ['tablet', '태블릿', 820], ['pc', 'PC', 0]] as const;
type Device = typeof DEVICES[number][0];

/**
 * 코드 실행 화면. 올린 파일로 만든 페이지를 샌드박스 iframe에서 돌려요.
 * iframe은 앱과 출처가 달라서(allow-same-origin 없음) 로그인 정보·앱 데이터에 손댈 수 없어요.
 */
export function Runner({ title, files, onClose, onGoto }: {
  title: string; files: RunFile[]; onClose: () => void; onGoto: (file: number, line: number | null) => void;
}) {
  const [theme, setTheme] = useState<Ui5Theme>(() => (THEMES.some((t) => t.value === readPref('cv-run-theme')) ? readPref('cv-run-theme') as Ui5Theme : 'sap_horizon'));
  const [compact, setCompact] = useState(() => readPref('cv-run-compact') === '1');
  const [device, setDevice] = useState<Device>(() => (readPref('cv-run-device') as Device) || 'phone');
  const [round, setRound] = useState(0);
  const [logs, setLogs] = useState<Log[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fail'>('loading');
  const [open, setOpen] = useState(true);
  const frame = useRef<HTMLIFrameElement>(null);
  const runId = useMemo(() => `run-${round}-${theme}-${compact ? 1 : 0}-${Date.now().toString(36)}`, [round, theme, compact]);
  // cv-ui5-base: UI5를 다른 주소(사내 미러 등)에서 받고 싶을 때만 쓰는 숨은 설정이에요.
  const plan = useMemo(() => buildRunner(files, { runId, theme, compact, base: readPref('cv-ui5-base') ?? undefined }), [files, runId, theme, compact]);

  useEffect(() => { setLogs(plan?.notes.map((n) => ({ kind: 'info' as const, text: n, at: null })) ?? []); setStatus('loading'); }, [plan]);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.cvRun !== runId || e.source !== frame.current?.contentWindow) return;
      if (d.type === 'ready') setStatus('ready');
      else if (d.type === 'fail') setStatus('fail');
      else if (d.type === 'log') setLogs((ls) => (ls.length > 300 ? ls : [...ls, { kind: d.kind, text: String(d.text), at: d.at }]));
    };
    window.addEventListener('message', onMsg);
    const t = window.setTimeout(() => setStatus((s) => (s === 'loading' ? 'fail' : s)), 30000);
    return () => { window.removeEventListener('message', onMsg); window.clearTimeout(t); };
  }, [runId]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const errors = logs.filter((l) => l.kind === 'error').length;
  const width = DEVICES.find((d) => d[0] === device)![2];
  const isUi5 = plan?.kind === 'ui5';

  return (
    <div className="run" role="dialog" aria-modal="true" aria-label={`${title} 실행`}>
      <div className="run-bar">
        <span className={`run-dot ${status === 'fail' || errors ? 'bad' : status === 'ready' ? 'ok' : ''}`} aria-hidden="true">{status === 'fail' || errors ? '!' : <Icon name="play" />}</span>
        <span className="run-t"><b>{title}</b><small>{status === 'loading' ? <>{isUi5 ? 'UI5 불러오는 중' : '실행 중'}<Dots /></> : status === 'fail' ? '실행하지 못했어요' : errors ? `오류 ${errors}` : `실행 중 · 파일 ${files.length}개`}</small></span>
        <button type="button" className="cf-btn" aria-label="다시 실행" title="다시 실행" onClick={() => setRound((r) => r + 1)}><Icon name="reload" /></button>
        <button type="button" className="cf-btn cf-close" aria-label="닫기" onClick={onClose}><Icon name="close" /></button>
      </div>
      <div className="run-opts">
        <div className="seg seg3 run-seg" role="radiogroup" aria-label="화면 폭">
          {DEVICES.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={device === v} aria-pressed={device === v} onClick={() => { setDevice(v); writePref('cv-run-device', v); }}>{l}</button>)}
        </div>
        {isUi5 && (
          <>
            <Picker variant="mini" label="테마" value={theme} options={THEMES} onChange={(v) => { setTheme(v); writePref('cv-run-theme', v); }} />
            <Picker variant="mini" label="화면 밀도" value={compact ? 'compact' : 'cozy'} options={[{ value: 'cozy', label: '넉넉하게', hint: '터치용 (cozy)' }, { value: 'compact', label: '촘촘하게', hint: 'PC용 (compact)' }]}
              onChange={(v) => { setCompact(v === 'compact'); writePref('cv-run-compact', v === 'compact' ? '1' : null); }} />
          </>
        )}
      </div>
      <div className="run-stage">
        {plan ? (
          <iframe key={runId} ref={frame} className="run-frame" title={`${title} 실행 화면`} sandbox="allow-scripts allow-modals" srcDoc={plan.html}
            style={width ? { width: `min(${width}px, 100%)` } : undefined} />
        ) : <p className="run-none">실행할 수 있는 파일이 없어요</p>}
        {status === 'fail' && !logs.some((l) => l.kind === 'error') && (
          <div className="run-fail">{isUi5 ? 'UI5를 불러오지 못했어요 · 인터넷 연결을 확인하고 다시 실행해 주세요' : '실행하지 못했어요 · 콘솔을 확인해 주세요'}</div>
        )}
      </div>
      <div className={`run-console ${open ? 'open' : ''}`}>
        <button type="button" className="run-ch" aria-expanded={open} onClick={() => setOpen(!open)}>
          <b>콘솔</b><span className="muted">{logs.length}</span><span className="sp" />
          {errors ? <span className="run-err">오류 {errors}</span> : status === 'ready' ? <span className="run-ok">오류 없음</span> : null}
          <Icon name={open ? 'down' : 'up'} />
        </button>
        {open && (
          <div className="run-logs" role="log" aria-live="polite">
            {!logs.length ? <p className="muted small run-empty">console.log 결과와 오류가 여기에 나와요</p> : logs.map((l, i) => {
              const hint = l.kind === 'error' ? hintFor(l.text) : null;
              return (
                <div key={i} className={`run-log ${l.kind}`}>
                  <span className="run-k">{l.kind === 'info' ? '안내' : l.kind}</span>
                  <span className="run-x">
                    <span className="run-text">{l.text}</span>
                    {l.at && files[l.at.file] && (
                      <button type="button" className="run-at" onClick={() => onGoto(l.at!.file, l.at!.line)}>{files[l.at.file].name}{l.at.line ? ` ${l.at.line}번째 줄` : ''} · 코드 보기 ›</button>
                    )}
                    {hint && <span className="run-hint">{hint}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
