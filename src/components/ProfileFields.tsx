import { useRef, useState } from 'react';
import { toAvatar } from '../lib/image';
import { Avatar } from './Avatar';
import { Dots } from './Motion';

export const BIO_MAX = 80;

/** 프로필 사진과 한 줄 소개 (둘 다 선택). 가입 화면과 내 정보에서 같이 써요. */
export function ProfileFields({ name, color, avatar, bio, onChange, onError }: {
  name: string; color: string; avatar: string | null; bio: string;
  onChange: (patch: { avatar?: string | null; bio?: string }) => void;
  onError: (msg: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="pf">
      <div className="pf-photo">
        <Avatar person={{ id: '', name: name.trim() || '?', color, avatar }} size="xl" />
        <div className="pf-acts">
          <button type="button" className="btn sm" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? <>줄이는 중<Dots /></> : avatar ? '사진 바꾸기' : '사진 고르기'}</button>
          {avatar && <button type="button" className="btn ghost sm" onClick={() => onChange({ avatar: null })}>사진 빼기</button>}
          <span className="muted small">정사각형으로 잘라서 작게 저장해요</span>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = '';
          if (!f) return;
          setBusy(true);
          try { onChange({ avatar: await toAvatar(f) }); } catch (x) { onError(x instanceof Error ? x.message : '사진을 읽지 못했어요'); }
          setBusy(false);
        }} />
      </div>
      <label className="lbl" htmlFor="pfBio">한 줄 소개 <span className="muted">({bio.length}/{BIO_MAX})</span></label>
      <input id="pfBio" className="inp" value={bio} maxLength={BIO_MAX} placeholder="예: ABAP 2개월차, UI5 공부 중" onChange={(e) => onChange({ bio: e.target.value })} />
    </div>
  );
}
