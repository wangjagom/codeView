import { useState, type ReactNode } from 'react';
import { createProfile, friendlyError } from '../lib/api';
import { PALETTE } from '../lib/config';
import { pendingProfile } from '../lib/store';
import { ProfileFields } from '../components/ProfileFields';
import { MIN_PASSWORD, nameProblem, normalizeName, signInWithName, signUpWithName } from '../lib/auth';
import { Dots, Expand } from '../components/Motion';

export function AuthCard({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="auth">
      <div className={`auth-card ${wide ? 'wide' : ''}`}>
        <div className="brand"><span className="logo-slot" aria-hidden="true" /><span className="wordmark">codeView</span></div>
        {children}
      </div>
    </div>
  );
}

export function Login({ invited }: { invited?: boolean }) {
  const [mode, setMode] = useState<'in' | 'up'>(invited ? 'up' : 'in');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [color, setColor] = useState(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
  const [openProfile, setOpenProfile] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // 로그인되면 App의 onAuthStateChange가 다음 화면으로 넘겨요.
  const submit = async () => {
    const problem = nameProblem(name);
    if (problem) { setErr(problem); document.getElementById('loginName')?.focus(); return; }
    if (password.length < MIN_PASSWORD) { setErr(`비밀번호는 ${MIN_PASSWORD}자 이상이에요.`); document.getElementById('loginPw')?.focus(); return; }
    if (mode === 'up' && password !== password2) { setErr('비밀번호 확인이 달라요.'); document.getElementById('loginPw2')?.focus(); return; }
    setBusy(true); setErr('');
    if (mode === 'in') {
      const { error } = await signInWithName(name, password);
      if (error) { setErr(friendlyError(error)); setBusy(false); }
      return;
    }
    // 사진·소개는 프로필이 만들어진 뒤에 App이 저장해요.
    pendingProfile.set(avatar || bio.trim() ? { avatar, bio: bio.trim() || null } : null);
    const { data, error } = await signUpWithName(name, password, color);
    if (error) { pendingProfile.set(null); setErr(friendlyError(error)); setBusy(false); return; }
    if (!data.session) { setErr('가입은 됐지만 바로 로그인되지 않았어요. Supabase에서 Confirm email을 꺼 주세요. (README 참고)'); setBusy(false); }
  };

  const switchMode = (m: 'in' | 'up') => { setMode(m); setErr(''); };

  return (
    <AuthCard>
      <h1 className="h-big">{invited ? '초대받은 조에 참여' : mode === 'up' ? '가입' : '로그인'}</h1>
      <div className="seg" role="tablist" aria-label="로그인 방식">
        <button type="button" role="tab" aria-pressed={mode === 'in'} aria-selected={mode === 'in'} onClick={() => switchMode('in')}>로그인</button>
        <button type="button" role="tab" aria-pressed={mode === 'up'} aria-selected={mode === 'up'} onClick={() => switchMode('up')}>처음이에요</button>
      </div>
      <form className="auth-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {mode === 'up' && <p className="small muted">{invited ? '가입하면 바로 조에 들어가요. ' : ''}이름은 중복 불가, 나중에 못 바꿔요. 이메일 필요 없음.</p>}
        <label htmlFor="loginName" className="lbl">이름</label>
        <input id="loginName" value={name} maxLength={20} autoComplete="username" autoCapitalize="off" spellCheck={false} placeholder="예: 준호, dev_kim" onChange={(e) => setName(e.target.value)} />
        <label htmlFor="loginPw" className="lbl">비밀번호</label>
        <input id="loginPw" type="password" value={password} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} placeholder={`${MIN_PASSWORD}자 이상`} onChange={(e) => setPassword(e.target.value)} />
        <Expand open={mode === 'up'} className="sub-form">
            <label htmlFor="loginPw2" className="lbl">비밀번호 확인</label>
            <input id="loginPw2" type="password" value={password2} autoComplete="new-password" onChange={(e) => setPassword2(e.target.value)} />
            <span className="lbl">아바타 색</span>
            <ColorPicker value={color} onChange={setColor} name={name} />
            <button type="button" className="btn ghost sm opt-toggle" aria-expanded={openProfile} onClick={() => setOpenProfile(!openProfile)}>
              {openProfile ? '사진·소개 접기' : '+ 사진·소개 (선택)'}
            </button>
            <Expand open={openProfile}><ProfileFields name={name} color={color} avatar={avatar} bio={bio} onError={setErr}
              onChange={(p) => { if ('avatar' in p) setAvatar(p.avatar ?? null); if (p.bio !== undefined) setBio(p.bio); }} /></Expand>
        </Expand>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn primary wide" disabled={busy}>{busy ? <>잠시만요<Dots /></> : mode === 'in' ? '로그인' : '가입하고 시작하기'}</button>
        {mode === 'in'
          ? <p className="small muted center">처음이라면 <button type="button" className="linkish" onClick={() => switchMode('up')}>가입하기</button></p>
          : <p className="small muted center">이미 이름이 있다면 <button type="button" className="linkish" onClick={() => switchMode('in')}>로그인</button></p>}
      </form>
    </AuthCard>
  );
}

/** 계정은 있는데 프로필(이름)이 없는 경우에만 나와요. */
export function Onboarding({ userId, onDone, onSignOut }: { userId: string; onDone: () => void; onSignOut: () => void }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <AuthCard>
      <h1 className="h-big">표시 이름</h1>
      <form className="auth-form" onSubmit={async (e) => {
        e.preventDefault();
        const problem = nameProblem(name); if (problem) { setErr(problem); return; }
        setBusy(true); setErr('');
        try { await createProfile(userId, normalizeName(name), color); onDone(); } catch (x) { setErr(friendlyError(x)); setBusy(false); }
      }}>
        <label htmlFor="name" className="lbl">이름 (겹치지 않게, 바꿀 수 없어요)</label>
        <input id="name" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
        <span className="lbl">색</span>
        <ColorPicker value={color} onChange={setColor} name={name} />
        {err && <p className="err">{err}</p>}
        <button className="btn primary wide" disabled={busy}>시작하기</button>
        <button type="button" className="btn ghost sm" onClick={onSignOut}>로그아웃</button>
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
