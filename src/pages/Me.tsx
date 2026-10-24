import { useEffect, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Header } from '../components/Layout';
import { friendlyError, getNotificationPrefs, saveNotificationPrefs, updateProfile, type NotificationPrefs } from '../lib/api';
import { MIN_PASSWORD } from '../lib/auth';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { ColorPicker } from './Auth';
import { ProfileFields } from '../components/ProfileFields';

function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return <button type="button" className="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />;
}

export function Me({ onTeam }: { onTeam: () => void }) {
  const { me, refresh, toast, signOut } = useStore();
  const [color, setColor] = useState(me.color);
  const [avatar, setAvatar] = useState<string | null>(me.avatar ?? null);
  const [bio, setBio] = useState(me.bio ?? '');
  const [openEdit, setOpenEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const profileDirty = color !== me.color || avatar !== (me.avatar ?? null) || bio.trim() !== (me.bio ?? '');
  const saveProfile = async () => {
    setSaving(true);
    try {
      const patch: { color?: string; avatar?: string | null; bio?: string | null } = {};
      if (color !== me.color) patch.color = color;
      if (avatar !== (me.avatar ?? null)) patch.avatar = avatar;
      if (bio.trim() !== (me.bio ?? '')) patch.bio = bio.trim() || null;
      await updateProfile(me.id, patch); await refresh(); setOpenEdit(false); toast('프로필을 저장했어요');
    } catch (x) { toast(friendlyError(x)); }
    setSaving(false);
  };
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [openPw, setOpenPw] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [notifyOn, setNotifyOn] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);

  useEffect(() => {
    getNotificationPrefs()
      .then((p) => { setPrefs(p ?? { email: '', on_review: true, on_request: true }); setNotifyOn(Boolean(p?.email)); })
      .catch(() => setPrefs({ email: '', on_review: true, on_request: true }));
  }, []);

  const change = (patch: Partial<NotificationPrefs>) => { if (prefs) { setPrefs({ ...prefs, ...patch }); setDirty(true); } };

  const savePrefs = async (on = notifyOn) => {
    if (!prefs) return;
    const email = on ? prefs.email.trim() : '';
    if (on && !/^\S+@\S+\.\S+$/.test(email)) { toast('알림 받을 이메일을 적어 주세요'); document.getElementById('notifyEmail')?.focus(); return; }
    try { await saveNotificationPrefs(me.id, { ...prefs, email }); setDirty(false); toast(email ? '알림 설정을 저장했어요' : '이메일 알림을 껐어요'); }
    catch (e) { toast(friendlyError(e)); }
  };

  const changePassword = async () => {
    if (pw.length < MIN_PASSWORD) { toast(`비밀번호는 ${MIN_PASSWORD}자 이상이에요`); return; }
    if (pw !== pw2) { toast('비밀번호 확인이 달라요'); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast(friendlyError(error)); else { setPw(''); setPw2(''); setOpenPw(false); toast('비밀번호를 바꿨어요'); }
  };

  return (
    <section>
      <Header onTeam={onTeam} />

      <div className="card profile">
        <Avatar person={{ ...me, color, avatar }} size="lg" />
        <div className="body"><b>{me.name}</b>{me.bio ? <span className="bio">{me.bio}</span> : <span className="muted small">소개 없음</span>}</div>
        <button type="button" className="btn sm" aria-expanded={openEdit} onClick={() => {
          if (openEdit) { setColor(me.color); setAvatar(me.avatar ?? null); setBio(me.bio ?? ''); }
          setOpenEdit(!openEdit);
        }}>{openEdit ? '닫기' : '프로필 편집'}</button>
      </div>
      {openEdit && (
        <div className="card card-pad stack">
          <ProfileFields name={me.name} color={color} avatar={avatar} bio={bio} onError={toast}
            onChange={(p) => { if ('avatar' in p) setAvatar(p.avatar ?? null); if (p.bio !== undefined) setBio(p.bio); }} />
          <span className="lbl">색 <span className="muted">(사진이 없을 때)</span></span>
          <ColorPicker value={color} onChange={setColor} name={me.name} />
          <span className="muted small">로그인 이름은 바꿀 수 없어요 · 사진·소개는 선택이에요</span>
          <button type="button" className="btn primary wide pf-save" disabled={!profileDirty || saving} onClick={saveProfile}>{saving ? '저장 중…' : '저장'}</button>
        </div>
      )}

      <div className="sec-h"><h2>알림</h2><span className="muted small">선택</span></div>
      <div className="card list">
        {!prefs ? <div className="item"><span className="muted small">불러오는 중…</span></div> : (
          <>
            <div className="item">
              <span className="body"><span className="t">이메일로 알림 받기</span><span className="m">{notifyOn && prefs.email ? prefs.email : '이메일은 알림에만 쓰고 로그인에는 쓰지 않아요'}</span></span>
              <Switch on={notifyOn} label="이메일로 알림 받기" onChange={(v) => { setNotifyOn(v); if (!v) savePrefs(false); else setDirty(true); }} />
            </div>
            {notifyOn && (
              <>
                <div className="item"><input className="inp" id="notifyEmail" type="email" autoComplete="email" value={prefs.email} placeholder="알림 받을 이메일" onChange={(e) => change({ email: e.target.value })} /></div>
                <div className="item"><span className="body"><span className="t">내 코드에 리뷰가 달리면</span></span><Switch on={prefs.on_review} label="내 코드에 리뷰가 달리면" onChange={(v) => change({ on_review: v })} /></div>
                <div className="item"><span className="body"><span className="t">누가 리뷰를 부탁하면</span></span><Switch on={prefs.on_request} label="누가 리뷰를 부탁하면" onChange={(v) => change({ on_request: v })} /></div>
                {dirty && <div className="item"><button type="button" className="btn primary wide" onClick={() => savePrefs()}>알림 설정 저장</button></div>}
              </>
            )}
          </>
        )}
      </div>
      <p className="muted small lead">메일 발송 준비 중 · 이메일은 본인만 볼 수 있어요</p>

      <div className="sec-h"><h2>계정</h2></div>
      <div className="card list">
        <button type="button" className="item" aria-expanded={openPw} onClick={() => setOpenPw(!openPw)}><span className="body"><span className="t">비밀번호 바꾸기</span></span><Icon name={openPw ? 'down' : 'chev'} className="chev" /></button>
        {openPw && (
          <form className="item stack" onSubmit={(e) => { e.preventDefault(); changePassword(); }}>
            <input type="text" autoComplete="username" value={me.name} readOnly hidden />
            <input className="inp" id="newPw" type="password" autoComplete="new-password" value={pw} placeholder={`새 비밀번호 (${MIN_PASSWORD}자 이상)`} onChange={(e) => setPw(e.target.value)} />
            <input className="inp" id="newPw2" type="password" autoComplete="new-password" value={pw2} placeholder="새 비밀번호 확인" onChange={(e) => setPw2(e.target.value)} />
            <span className="hint">잊으면 되찾을 수 없어요</span>
            <button className="btn primary wide" disabled={!pw}>비밀번호 바꾸기</button>
          </form>
        )}
        <button type="button" className="item" aria-expanded={confirmOut} onClick={() => setConfirmOut(!confirmOut)}><span className="body"><span className="t">로그아웃</span></span><Icon name={confirmOut ? 'down' : 'chev'} className="chev" /></button>
        {confirmOut && (
          <div className="item stack">
            <span className="small">로그아웃할까요? 이름과 비밀번호로 다시 들어올 수 있어요.</span>
            <div className="two-btn"><button type="button" className="btn" onClick={() => setConfirmOut(false)}>취소</button><button type="button" className="btn danger-btn" onClick={signOut}>로그아웃</button></div>
          </div>
        )}
      </div>
    </section>
  );
}
