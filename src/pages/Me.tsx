import { useEffect, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Header } from '../components/Layout';
import { friendlyError, getNotificationPrefs, saveNotificationPrefs, updateProfile, type NotificationPrefs } from '../lib/api';
import { MIN_PASSWORD } from '../lib/auth';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { ColorPicker } from './Auth';
import { PostItem } from './Feed';
import { href } from '../lib/router';
import { getTheme, setTheme, type Theme } from '../lib/theme';
import { ProfileFields } from '../components/ProfileFields';
import { Dots, Expand, Loading } from '../components/Motion';

const THEMES: [Theme, string][] = [['system', '시스템'], ['light', '라이트'], ['dark', '다크']];

function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return <button type="button" className="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />;
}

export function Me({ onTeam, onShowAll }: { onTeam: () => void; onShowAll: (view: 'mine' | 'saved') => void }) {
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
  const [theme, setThemeState] = useState<Theme>(getTheme);

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
      <Expand open={openEdit}>
        <div className="card card-pad stack">
          <ProfileFields name={me.name} color={color} avatar={avatar} bio={bio} onError={toast}
            onChange={(p) => { if ('avatar' in p) setAvatar(p.avatar ?? null); if (p.bio !== undefined) setBio(p.bio); }} />
          <span className="lbl">색 <span className="muted">(사진이 없을 때)</span></span>
          <ColorPicker value={color} onChange={setColor} name={me.name} />
          <span className="muted small">로그인 이름은 바꿀 수 없어요 · 사진·소개는 선택이에요</span>
          <button type="button" className="btn primary wide pf-save" disabled={!profileDirty || saving} onClick={saveProfile}>{saving ? <>저장 중<Dots /></> : '저장'}</button>
        </div>
      </Expand>

      <MyCode onShowAll={onShowAll} />

      <div className="sec-h"><h2>설정</h2></div>
      <div className="card list">
        <div className="item set-row">
          <span className="body"><span className="t">화면 모드</span><span className="m">{theme === 'system' ? '기기 설정을 따라가요' : '이 브라우저에서만 바뀌어요'}</span></span>
          <div className="seg seg3 theme-seg" role="radiogroup" aria-label="화면 모드">
            {THEMES.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={theme === v} aria-pressed={theme === v} onClick={() => { setTheme(v); setThemeState(v); }}>{l}</button>)}
          </div>
        </div>
      </div>

      <div className="sec-h"><h2>알림</h2><span className="muted small">선택</span></div>
      <div className="card list">
        {!prefs ? <div className="item"><Loading className="muted small" /></div> : (
          <>
            <div className="item">
              <span className="body"><span className="t">이메일로 알림 받기</span><span className="m">{notifyOn && prefs.email ? prefs.email : '이메일은 알림에만 쓰고 로그인에는 쓰지 않아요'}</span></span>
              <Switch on={notifyOn} label="이메일로 알림 받기" onChange={(v) => { setNotifyOn(v); if (!v) savePrefs(false); else setDirty(true); }} />
            </div>
            <Expand open={notifyOn}>
                <div className="item"><input className="inp" id="notifyEmail" type="email" autoComplete="email" value={prefs.email} placeholder="알림 받을 이메일" onChange={(e) => change({ email: e.target.value })} /></div>
                <div className="item"><span className="body"><span className="t">내 코드에 리뷰가 달리면</span></span><Switch on={prefs.on_review} label="내 코드에 리뷰가 달리면" onChange={(v) => change({ on_review: v })} /></div>
                <div className="item"><span className="body"><span className="t">누가 리뷰를 부탁하면</span></span><Switch on={prefs.on_request} label="누가 리뷰를 부탁하면" onChange={(v) => change({ on_request: v })} /></div>
                {dirty && <div className="item"><button type="button" className="btn primary wide" onClick={() => savePrefs()}>알림 설정 저장</button></div>}
            </Expand>
          </>
        )}
      </div>
      <p className="muted small lead">메일 발송 준비 중 · 이메일은 본인만 볼 수 있어요</p>

      <div className="sec-h"><h2>계정</h2></div>
      <div className="card list">
        <button type="button" className="item" aria-expanded={openPw} onClick={() => setOpenPw(!openPw)}><span className="body"><span className="t">비밀번호 바꾸기</span></span><Icon name={openPw ? 'down' : 'chev'} className="chev" /></button>
        <Expand open={openPw}>
          <form className="item stack" onSubmit={(e) => { e.preventDefault(); changePassword(); }}>
            <input type="text" autoComplete="username" value={me.name} readOnly hidden />
            <input className="inp" id="newPw" type="password" autoComplete="new-password" value={pw} placeholder={`새 비밀번호 (${MIN_PASSWORD}자 이상)`} onChange={(e) => setPw(e.target.value)} />
            <input className="inp" id="newPw2" type="password" autoComplete="new-password" value={pw2} placeholder="새 비밀번호 확인" onChange={(e) => setPw2(e.target.value)} />
            <span className="hint">잊으면 되찾을 수 없어요</span>
            <button className="btn primary wide" disabled={!pw}>비밀번호 바꾸기</button>
          </form>
        </Expand>
        <button type="button" className="item" aria-expanded={confirmOut} onClick={() => setConfirmOut(!confirmOut)}><span className="body"><span className="t">로그아웃</span></span><Icon name={confirmOut ? 'down' : 'chev'} className="chev" /></button>
        <Expand open={confirmOut}>
          <div className="item stack">
            <span className="small">로그아웃할까요? 이름과 비밀번호로 다시 들어올 수 있어요.</span>
            <div className="two-btn"><button type="button" className="btn" onClick={() => setConfirmOut(false)}>취소</button><button type="button" className="btn danger-btn" onClick={signOut}>로그아웃</button></div>
          </div>
        </Expand>
      </div>
    </section>
  );
}

/** 내가 올린 코드 · 🔖 저장한 코드 (최근 5개, 더 있으면 홈에서 모아 봐요) */
function MyCode({ onShowAll }: { onShowAll: (view: 'mine' | 'saved') => void }) {
  const { me, posts, likes, bookmarks } = useStore();
  const [tab, setTab] = useState<'mine' | 'saved'>('mine');
  const mine = posts.filter((p) => p.author_id === me.id);
  const saved = posts.filter((p) => bookmarks.has(p.id));
  const list = tab === 'mine' ? mine : saved;
  const shown = list.slice(0, 5);
  return (
    <>
      <div className="sec-h"><h2>내 코드</h2>
        {list.length > shown.length && <button type="button" onClick={() => onShowAll(tab)}>모두 보기<Icon name="chev" /></button>}
      </div>
      <div className="seg my-tabs" role="tablist" aria-label="내 코드">
        <button type="button" role="tab" aria-selected={tab === 'mine'} aria-pressed={tab === 'mine'} onClick={() => setTab('mine')}>내가 올린 코드 <span className="chip-n">{mine.length}</span></button>
        <button type="button" role="tab" aria-selected={tab === 'saved'} aria-pressed={tab === 'saved'} onClick={() => setTab('saved')}>저장한 코드 <span className="chip-n">{saved.length}</span></button>
      </div>
      <div className="card list">
        {shown.length ? shown.map((p) => <PostItem key={p.id} post={p} likes={likes.filter((l) => l.post_id === p.id).length} saved={tab === 'saved'} />) : tab === 'mine' ? (
          <div className="empty small-empty">아직 올린 코드가 없어요<br /><a href={href({ name: 'new' })}>코드 올리기</a></div>
        ) : (
          <div className="empty small-empty"><Icon name="bookmark" className="empty-ic" />저장한 코드가 없어요<br /><span className="muted small">글 상세에서 '저장'을 누르면 여기 모여요</span></div>
        )}
      </div>
    </>
  );
}
