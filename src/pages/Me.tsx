import { useState } from 'react';
import { friendlyError, updateProfile } from '../lib/api';
import { href } from '../lib/router';
import { useStore } from '../lib/store';
import { ColorPicker } from './Auth';

export function Me() {
  const { me, refresh, toast, signOut } = useStore();
  const [name, setName] = useState(me.name);
  const [color, setColor] = useState(me.color);
  return (
    <section>
      <a className="back" href={href({ name: 'feed' })}>← 목록으로</a>
      <div className="head"><div><h1>내 정보</h1><p>조원들에게 보이는 이름과 색을 바꿀 수 있어요.</p></div></div>
      <form className="form narrow" onSubmit={async (e) => {
        e.preventDefault();
        try { await updateProfile(me.id, { name: name.trim() || me.name, color }); await refresh(); toast('저장했어요'); }
        catch (x) { toast(friendlyError(x)); }
      }}>
        <div className="field"><label htmlFor="meName">이름</label><input id="meName" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><span className="lbl">색</span><ColorPicker value={color} onChange={setColor} name={name} /></div>
        <div className="form-foot"><button type="button" className="btn ghost" onClick={signOut}>로그아웃</button><button className="btn primary">저장</button></div>
      </form>
    </section>
  );
}
