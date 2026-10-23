import { useState, type ReactNode } from 'react';
import { createProfile, friendlyError } from '../lib/api';
import { PALETTE } from '../lib/config';
import { supabase } from '../lib/supabase';

export function AuthCard({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="auth">
      <div className={`auth-card ${wide ? 'wide' : ''}`}>
        <div className="brand"><span className="mark">cv</span>codeView</div>
        {children}
      </div>
    </div>
  );
}

export function Login({ invited }: { invited?: boolean }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<'anon' | 'email' | null>(null);
  const [err, setErr] = useState('');

  const send = async () => {
    const v = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(v)) { setErr('이메일 주소를 확인해 주세요.'); return; }
    setBusy('email'); setErr('');
    const { error } = await supabase.auth.signInWithOtp({ email: v, options: { emailRedirectTo: location.origin + location.pathname } });
    setBusy(null);
    if (error) setErr(friendlyError(error)); else setSent(true);
  };

  // 로그인되면 App의 onAuthStateChange가 이름 정하기 화면으로 넘겨요.
  const startAnon = async () => {
    setBusy('anon'); setErr('');
    const { error } = await supabase.auth.signInAnonymously();
    if (error) { setErr(friendlyError(error)); setBusy(null); }
  };

  return (
    <AuthCard>
      <h1>{invited ? '조에 초대받았어요' : '조원끼리 코드 리뷰하는 곳'}</h1>
      {sent ? (
        <>
          <p><b>{email}</b>로 로그인 링크를 보냈어요. 메일함에서 링크를 누르면 바로 들어와요.</p>
          <p className="muted small">메일이 안 보이면 스팸함을 확인하거나 잠시 뒤 다시 보내 주세요.</p>
          <button type="button" className="btn" onClick={() => setSent(false)}>다른 방법으로 로그인</button>
        </>
      ) : (
        <>
          <div className="auth-form">
            <p>{invited ? '시작하면 바로 초대받은 조에 들어가요. ' : ''}이메일 없이 이름만 정하고 바로 시작할 수 있어요.</p>
            <button type="button" className="btn primary wide" disabled={busy !== null} onClick={startAnon}>{busy === 'anon' ? '시작하는 중…' : '이메일 없이 시작하기'}</button>
            <p className="muted small">이 브라우저에서만 기억돼요. 다른 기기에서도 쓰려면 나중에 내 정보에서 이메일을 연결하세요.</p>
          </div>
          <div className="or"><span>또는 이메일로 로그인</span></div>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="auth-form">
            <label htmlFor="email" className="lbl">이메일</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="me@example.com" />
            <button className="btn wide" disabled={busy !== null}>{busy === 'email' ? '보내는 중…' : '로그인 링크 받기'}</button>
          </form>
          {err && <p className="err" role="alert">{err}</p>}
        </>
      )}
    </AuthCard>
  );
}

export function Onboarding({ userId, email, onDone }: { userId: string; email: string; onDone: () => void }) {
  const [name, setName] = useState(email.split('@')[0].slice(0, 20));
  const [color, setColor] = useState(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <AuthCard>
      <h1>조원들에게 보일 이름을 정해요</h1>
      <form className="auth-form" onSubmit={async (e) => {
        e.preventDefault();
        const v = name.trim(); if (!v) { setErr('이름을 적어 주세요.'); return; }
        setBusy(true); setErr('');
        try { await createProfile(userId, v, color); onDone(); } catch (x) { setErr(friendlyError(x)); setBusy(false); }
      }}>
        <label htmlFor="name" className="lbl">이름</label>
        <input id="name" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
        <span className="lbl">색</span>
        <ColorPicker value={color} onChange={setColor} name={name} />
        {err && <p className="err">{err}</p>}
        <button className="btn primary wide" disabled={busy}>시작하기</button>
      </form>
    </AuthCard>
  );
}

export function ColorPicker({ value, onChange, name }: { value: string; onChange: (c: string) => void; name: string }) {
  return (
    <div className="colors" role="radiogroup" aria-label="아바타 색">
      {PALETTE.map((c) => (
        <button key={c} type="button" role="radio" aria-checked={value === c} className="ava md" style={{ background: c }} onClick={() => onChange(c)}>
          {value === c ? (name.trim()[0] ?? '✓') : ''}
        </button>
      ))}
    </div>
  );
}
