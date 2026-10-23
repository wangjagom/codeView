import { useState } from 'react';
import { friendlyError, updateProfile } from '../lib/api';
import { href } from '../lib/router';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { ColorPicker } from './Auth';

export function Me() {
  const { me, isAnonymous, email, refresh, toast, signOut } = useStore();
  const [name, setName] = useState(me.name);
  const [color, setColor] = useState(me.color);
  const [newEmail, setNewEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);

  // 익명 계정에 이메일을 붙이면 같은 계정 그대로 다른 기기에서도 로그인할 수 있어요.
  const linkEmail = async () => {
    const v = newEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(v)) { toast('이메일 주소를 확인해 주세요'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: v }, { emailRedirectTo: location.origin + location.pathname });
    setBusy(false);
    if (error) toast(friendlyError(error)); else setSentTo(v);
  };

  return (
    <section>
      <a className="back" href={href({ name: 'feed' })}>← 목록으로</a>
      <div className="head"><div><h1>내 정보</h1><p>조원들에게 보이는 이름과 색을 바꿀 수 있어요.</p></div></div>
      <div className="settings narrow-col">
        <form className="form" onSubmit={async (e) => {
          e.preventDefault();
          try { await updateProfile(me.id, { name: name.trim() || me.name, color }); await refresh(); toast('저장했어요'); }
          catch (x) { toast(friendlyError(x)); }
        }}>
          <div className="field"><label htmlFor="meName">이름</label><input id="meName" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><span className="lbl">색</span><ColorPicker value={color} onChange={setColor} name={name} /></div>
          <div className="form-foot"><button className="btn primary">저장</button></div>
        </form>

        <div className="panel">
          <h2>로그인 방법</h2>
          <div className="panel-body">
            {!isAnonymous ? (
              <p className="small">이메일 <b>{email}</b>로 로그인하고 있어요. 다른 기기에서도 같은 이메일로 로그인하면 돼요.</p>
            ) : sentTo ? (
              <p className="small"><b>{sentTo}</b>로 확인 메일을 보냈어요. 메일의 링크를 누르면 연결이 끝나고, 그다음부터는 이 이메일로 어디서든 로그인할 수 있어요.</p>
            ) : (
              <form className="auth-form" onSubmit={(e) => { e.preventDefault(); linkEmail(); }}>
                <p className="warn-box">지금은 <b>이메일 없이</b> 쓰고 있어요. 이 브라우저의 기록을 지우거나 다른 기기에서 열면 이 계정으로 다시 들어올 수 없어요. 이메일을 연결해 두면 안전해요.</p>
                <label htmlFor="linkEmail" className="lbl">연결할 이메일</label>
                <input id="linkEmail" type="email" autoComplete="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="me@example.com" />
                <div className="form-foot"><button className="btn primary" disabled={busy}>{busy ? '보내는 중…' : '확인 메일 받기'}</button></div>
              </form>
            )}
          </div>
        </div>

        <div className="panel">
          <h2>로그아웃</h2>
          <div className="panel-body">
            {confirmOut ? (
              <div className="danger">
                <span>{isAnonymous ? '이메일이 연결되지 않아서, 로그아웃하면 이 계정으로 다시 들어올 수 없어요. 그래도 로그아웃할까요?' : '로그아웃할까요?'}</span>
                <button type="button" className="btn sm" onClick={() => setConfirmOut(false)}>취소</button>
                <button type="button" className="btn sm danger-btn" onClick={signOut}>로그아웃</button>
              </div>
            ) : (
              <div className="danger"><button type="button" className="btn ghost sm" onClick={() => setConfirmOut(true)}>로그아웃</button></div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
