import { useEffect, useState } from 'react';
import { friendlyError, getNotificationPrefs, saveNotificationPrefs, updateProfile, type NotificationPrefs } from '../lib/api';
import { MIN_PASSWORD } from '../lib/auth';
import { href } from '../lib/router';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { ColorPicker } from './Auth';

export function Me() {
  const { me, refresh, toast, signOut } = useStore();
  const [color, setColor] = useState(me.color);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [notifyOn, setNotifyOn] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);

  useEffect(() => {
    getNotificationPrefs()
      .then((p) => { setPrefs(p ?? { email: '', on_review: true, on_request: true }); setNotifyOn(Boolean(p?.email)); })
      .catch(() => setPrefs({ email: '', on_review: true, on_request: true }));
  }, []);

  const savePrefs = async () => {
    if (!prefs) return;
    const email = notifyOn ? prefs.email.trim() : '';
    if (notifyOn && !/^\S+@\S+\.\S+$/.test(email)) { toast('알림 받을 이메일을 확인해 주세요'); document.getElementById('notifyEmail')?.focus(); return; }
    try { await saveNotificationPrefs(me.id, { ...prefs, email }); toast(email ? '알림 설정을 저장했어요' : '이메일 알림을 껐어요'); }
    catch (e) { toast(friendlyError(e)); }
  };

  const changePassword = async () => {
    if (pw.length < MIN_PASSWORD) { toast(`비밀번호는 ${MIN_PASSWORD}자 이상이에요`); return; }
    if (pw !== pw2) { toast('비밀번호 확인이 달라요'); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast(friendlyError(error)); else { setPw(''); setPw2(''); toast('비밀번호를 바꿨어요'); }
  };

  return (
    <section>
      <a className="back" href={href({ name: 'feed' })}>← 목록으로</a>
      <div className="head"><div><h1>내 정보</h1><p>로그인 이름 <b>{me.name}</b> · 이름은 바꿀 수 없어요.</p></div></div>
      <div className="settings narrow-col">
        <form className="panel" onSubmit={async (e) => {
          e.preventDefault();
          try { await updateProfile(me.id, { color }); await refresh(); toast('색을 바꿨어요'); } catch (x) { toast(friendlyError(x)); }
        }}>
          <h2>아바타 색</h2>
          <div className="panel-body">
            <ColorPicker value={color} onChange={setColor} name={me.name} />
            <div className="form-foot"><button className="btn primary" disabled={color === me.color}>저장</button></div>
          </div>
        </form>

        <form className="panel" onSubmit={(e) => { e.preventDefault(); savePrefs(); }}>
          <h2>알림 받기 <span>선택</span></h2>
          <div className="panel-body">
            {!prefs ? <p className="muted small">불러오는 중…</p> : (
              <>
                <label className="check-row"><input type="checkbox" checked={notifyOn} onChange={(e) => setNotifyOn(e.target.checked)} /> 이메일로 알림 받기</label>
                {notifyOn && (
                  <>
                    <div className="field"><label htmlFor="notifyEmail">알림 받을 이메일</label>
                      <input id="notifyEmail" type="email" autoComplete="email" value={prefs.email} placeholder="me@example.com" onChange={(e) => setPrefs({ ...prefs, email: e.target.value })} /></div>
                    <label className="check-row"><input type="checkbox" checked={prefs.on_review} onChange={(e) => setPrefs({ ...prefs, on_review: e.target.checked })} /> 내 코드에 리뷰가 달리면</label>
                    <label className="check-row"><input type="checkbox" checked={prefs.on_request} onChange={(e) => setPrefs({ ...prefs, on_request: e.target.checked })} /> 누가 나에게 리뷰를 부탁하면</label>
                  </>
                )}
                <p className="muted small">이메일은 알림에만 쓰고 로그인에는 쓰지 않아요. 본인만 볼 수 있어요. 메일 발송 기능은 준비 중이라, 지금은 설정만 저장돼요.</p>
                <div className="form-foot"><button className="btn primary">저장</button></div>
              </>
            )}
          </div>
        </form>

        <form className="panel" onSubmit={(e) => { e.preventDefault(); changePassword(); }}>
          <h2>비밀번호 바꾸기</h2>
          <div className="panel-body">
            <input type="text" autoComplete="username" value={me.name} readOnly hidden />
            <div className="field"><label htmlFor="newPw">새 비밀번호</label><input id="newPw" type="password" autoComplete="new-password" value={pw} placeholder={`${MIN_PASSWORD}자 이상`} onChange={(e) => setPw(e.target.value)} /></div>
            <div className="field"><label htmlFor="newPw2">새 비밀번호 확인</label><input id="newPw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
            <p className="muted small">비밀번호를 잊으면 되찾을 방법이 없어요. 잊어버렸다면 조장에게 말해서 새 이름으로 다시 들어오면 돼요.</p>
            <div className="form-foot"><button className="btn" disabled={!pw}>비밀번호 바꾸기</button></div>
          </div>
        </form>

        <div className="panel">
          <h2>로그아웃</h2>
          <div className="panel-body">
            {confirmOut ? (
              <div className="danger"><span>로그아웃할까요? 이름과 비밀번호로 다시 들어올 수 있어요.</span><button type="button" className="btn sm" onClick={() => setConfirmOut(false)}>취소</button><button type="button" className="btn sm danger-btn" onClick={signOut}>로그아웃</button></div>
            ) : <div className="danger"><button type="button" className="btn ghost sm" onClick={() => setConfirmOut(true)}>로그아웃</button></div>}
          </div>
        </div>
      </div>
    </section>
  );
}
