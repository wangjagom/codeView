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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const send = async () => {
    const v = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(v)) { setErr('이메일 주소를 확인해 주세요.'); return; }
    setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithOtp({ email: v, options: { emailRedirectTo: location.origin + location.pathname } });
    setBusy(false);
    if (error) setErr(friendlyError(error)); else setSent(true);
  };

  return (
    <AuthCard>
      <h1>{invited ? '조에 초대받았어요' : '조원끼리 코드 리뷰하는 곳'}</h1>
      {sent ? (
        <>
          <p><b>{email}</b>로 로그인 링크를 보냈어요. 메일함에서 링크를 누르면 바로 들어와요.</p>
          <p className="muted small">메일이 안 보이면 스팸함을 확인하거나 잠시 뒤 다시 보내 주세요.</p>
          <button type="button" className="btn" onClick={() => setSent(false)}>다른 이메일로 보내기</button>
        </>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="auth-form">
          <p>{invited ? '로그인하면 바로 초대받은 조에 들어가요. ' : ''}비밀번호 없이 이메일로 로그인 링크를 보내 드려요.</p>
          <label htmlFor="email" className="lbl">이메일</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="me@example.com" />
          {err && <p className="err">{err}</p>}
          <button className="btn primary wide" disabled={busy}>{busy ? '보내는 중…' : '로그인 링크 받기'}</button>
        </form>
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
