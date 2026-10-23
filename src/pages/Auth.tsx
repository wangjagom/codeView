import { useState, type ReactNode } from 'react';
import { createProfile, friendlyError } from '../lib/api';
import { PALETTE, TEAM_NAME } from '../lib/config';
import { supabase } from '../lib/supabase';

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <div className="auth-card">
        <div className="brand"><span className="mark">줄</span>줄톡</div>
        {children}
      </div>
    </div>
  );
}

export function Login() {
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
    <Card>
      <h1>{TEAM_NAME}</h1>
      {sent ? (
        <>
          <p><b>{email}</b>로 로그인 링크를 보냈어요. 메일함에서 링크를 누르면 바로 들어와요.</p>
          <p className="muted small">메일이 안 보이면 스팸함을 확인하거나 잠시 뒤 다시 보내 주세요.</p>
          <button type="button" className="btn" onClick={() => setSent(false)}>다른 이메일로 보내기</button>
        </>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="auth-form">
          <p>조장에게 등록한 이메일로 로그인해요. 비밀번호 없이 메일로 링크를 보내 드려요.</p>
          <label htmlFor="email" className="lbl">이메일</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="me@example.com" />
          {err && <p className="err">{err}</p>}
          <button className="btn primary wide" disabled={busy}>{busy ? '보내는 중…' : '로그인 링크 받기'}</button>
        </form>
      )}
    </Card>
  );
}

export function NotMember({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <Card>
      <h1>팀 명단에 없는 계정이에요</h1>
      <p><b>{email}</b>은 아직 {TEAM_NAME} 명단에 없어요. 조장에게 이 이메일을 등록해 달라고 말해 주세요.</p>
      <p className="muted small">등록되면 이 화면을 새로고침하면 돼요.</p>
      <div className="row-btns"><button type="button" className="btn" onClick={() => location.reload()}>새로고침</button><button type="button" className="btn ghost" onClick={onSignOut}>로그아웃</button></div>
    </Card>
  );
}

export function Onboarding({ userId, email, onDone }: { userId: string; email: string; onDone: () => void }) {
  const [name, setName] = useState(email.split('@')[0].slice(0, 20));
  const [color, setColor] = useState(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <Card>
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
    </Card>
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
