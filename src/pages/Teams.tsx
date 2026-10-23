import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { createTeam, friendlyError, joinTeam, regenerateInvite, removeMember, setRole, updateTeam, deleteTeam } from '../lib/api';
import { DEFAULT_TASKS } from '../lib/config';
import { href, inviteUrl, navigate } from '../lib/router';
import { useStore } from '../lib/store';
import type { Team } from '../lib/types';
import { copyText } from '../lib/util';

/** 콤마나 줄바꿈으로 구분한 과제 목록을 정리해요. */
export function parseTasks(text: string): string[] {
  const list = text.split(/[,\n]/).map((t) => t.trim()).filter(Boolean);
  return [...new Set(list)].slice(0, 30);
}

/** 조 만들기 + 초대 코드로 참여하기. 첫 화면과 '#/teams' 화면에서 같이 써요. */
export function TeamForms({ onDone, initialError = '' }: { onDone: (team: Team, joined: boolean) => void; initialError?: string }) {
  const [name, setName] = useState('');
  const [tasks, setTasks] = useState('1. UI 프로그래밍, 2. Back-End (ABAP), 3. Clean Core Back-End, 4. Clean Core UI, 5. 프로젝트, 자유 질문');
  const [code, setCode] = useState('');
  const [err, setErr] = useState(initialError);
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);

  const create = async () => {
    if (!name.trim()) { setErr('조 이름을 적어 주세요.'); document.getElementById('teamName')?.focus(); return; }
    setBusy('create'); setErr('');
    try { onDone(await createTeam(name.trim(), parseTasks(tasks).length ? parseTasks(tasks) : DEFAULT_TASKS), false); }
    catch (e) { setErr(friendlyError(e)); setBusy(null); }
  };
  const join = async () => {
    const c = code.replace(/\s|-/g, '').toUpperCase();
    if (c.length < 6) { setErr('초대 코드 8자리를 확인해 주세요.'); document.getElementById('inviteCode')?.focus(); return; }
    setBusy('join'); setErr('');
    try { onDone(await joinTeam(c), true); }
    catch (e) { setErr(friendlyError(e)); setBusy(null); }
  };

  return (
    <div className="team-forms">
      <form className="tf-card" onSubmit={(e) => { e.preventDefault(); join(); }}>
        <h2>초대 코드로 참여하기</h2>
        <p className="muted small">조장에게 받은 8자리 코드나 초대 링크로 들어와요.</p>
        <label htmlFor="inviteCode" className="lbl">초대 코드</label>
        <input id="inviteCode" className="code-input" value={code} maxLength={12} autoComplete="off" placeholder="ABCD2345" onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <button className="btn primary wide" disabled={busy !== null}>{busy === 'join' ? '참여하는 중…' : '참여하기'}</button>
      </form>
      <form className="tf-card" onSubmit={(e) => { e.preventDefault(); create(); }}>
        <h2>새 조 만들기</h2>
        <p className="muted small">만든 사람이 조장이 돼요. 만든 뒤 초대 링크를 조원들에게 보내면 돼요.</p>
        <label htmlFor="teamName" className="lbl">조 이름</label>
        <input id="teamName" value={name} maxLength={40} placeholder="예: 프론트엔드 7기 3조" onChange={(e) => setName(e.target.value)} />
        <label htmlFor="teamTasks" className="lbl">과제 목록 <span className="muted">(쉼표로 구분, 나중에 바꿀 수 있어요)</span></label>
        <input id="teamTasks" value={tasks} onChange={(e) => setTasks(e.target.value)} />
        <button className="btn wide" disabled={busy !== null}>{busy === 'create' ? '만드는 중…' : '조 만들기'}</button>
      </form>
      {err && <p className="err" role="alert">{err}</p>}
    </div>
  );
}

/** '#/teams' — 이미 조가 있는 사람이 다른 조를 만들거나 참여할 때 */
export function TeamsPage() {
  const { teams, reloadTeams, toast } = useStore();
  return (
    <section>
      <a className="back" href={href({ name: 'feed' })}>← 목록으로</a>
      <div className="head"><div><h1>조 만들기 · 참여하기</h1><p>지금 속한 조 {teams.length}개. 조를 바꿔도 이전 조의 코드와 리뷰는 그대로 남아요.</p></div></div>
      <TeamForms onDone={async (t, joined) => { await reloadTeams(t.id); toast(joined ? `'${t.name}'에 참여했어요` : `'${t.name}'을 만들었어요. 조원들을 초대해 보세요`); navigate(joined ? { name: 'feed' } : { name: 'team' }); }} />
    </section>
  );
}

/** '#/team' — 지금 조 설정 (초대, 조원 관리, 이름·과제 바꾸기, 나가기) */
export function TeamSettings() {
  const { me, team, isOwner, profiles, posts, reloadTeams, toast } = useStore();
  const [name, setName] = useState(team.name);
  const [tasks, setTasks] = useState(team.tasks.join(', '));
  const [confirm, setConfirm] = useState<'leave' | 'delete' | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const owners = profiles.filter((p) => p.role === 'owner');
  const link = inviteUrl(team.invite_code);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); await reloadTeams(team.id); toast(ok); return true; } catch (e) { toast(friendlyError(e)); return false; }
  };
  const copy = async (text: string, what: string) => toast((await copyText(text)) ? `${what}을 복사했어요` : `복사가 막혀 있어요. ${what}을 직접 선택해 복사해 주세요`);

  return (
    <section>
      <a className="back" href={href({ name: 'feed' })}>← 목록으로</a>
      <div className="head"><div><h1>{team.name} 설정</h1><p>{isOwner ? '조장이라 이름, 과제, 조원을 관리할 수 있어요.' : '조 정보와 초대 링크를 볼 수 있어요. 바꾸는 건 조장이 해요.'}</p></div></div>

      <div className="settings">
        <div className="panel">
          <h2>조원 초대하기</h2>
          <div className="invite">
            <div className="invite-row"><span className="lbl">초대 링크</span><code className="invite-link">{link}</code><button type="button" className="btn sm" onClick={() => copy(link, '초대 링크')}>링크 복사</button></div>
            <div className="invite-row"><span className="lbl">초대 코드</span><code className="invite-code">{team.invite_code}</code><button type="button" className="btn sm" onClick={() => copy(team.invite_code, '초대 코드')}>코드 복사</button></div>
            <p className="muted small">링크를 받은 사람은 로그인하면 바로 이 조에 들어와요. 링크가 밖으로 퍼졌다면 새 코드를 만들어 주세요. 이전 링크는 더 이상 쓸 수 없어요.</p>
            {isOwner && <div><button type="button" className="btn ghost sm" onClick={() => run(() => regenerateInvite(team.id), '새 초대 코드를 만들었어요')}>새 초대 코드 만들기</button></div>}
          </div>
        </div>

        {isOwner && (
          <form className="panel" onSubmit={(e) => { e.preventDefault(); const t = parseTasks(tasks); run(() => updateTeam(team.id, { name: name.trim() || team.name, tasks: t.length ? t : DEFAULT_TASKS }), '조 정보를 저장했어요'); }}>
            <h2>조 정보</h2>
            <div className="panel-body">
              <div className="field"><label htmlFor="setName">조 이름</label><input id="setName" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></div>
              <div className="field"><label htmlFor="setTasks">과제 목록 <span className="muted">(쉼표로 구분)</span></label><input id="setTasks" value={tasks} onChange={(e) => setTasks(e.target.value)} />
                <span className="muted small">과제를 지워도 이미 올라온 코드의 과제 표시는 그대로 남아요.</span></div>
              <div className="form-foot"><button className="btn primary">저장</button></div>
            </div>
          </form>
        )}

        <div className="panel">
          <h2>조원 <span>{profiles.length}명</span></h2>
          <ul className="members">
            {profiles.map((p) => (
              <li key={p.id}>
                <Avatar person={p} />
                <span className="m-name">{p.name}{p.id === me.id ? ' (나)' : ''}<small>{p.role === 'owner' ? '조장' : '조원'} · 올린 코드 {posts.filter((x) => x.author_id === p.id).length}개</small></span>
                {isOwner && p.id !== me.id && (
                  confirmRemove === p.id ? (
                    <span className="m-act"><span className="small">내보낼까요?</span><button type="button" className="btn sm" onClick={() => setConfirmRemove(null)}>취소</button><button type="button" className="btn sm danger-btn" onClick={() => { setConfirmRemove(null); run(() => removeMember(team.id, p.id), `${p.name}님을 내보냈어요`); }}>내보내기</button></span>
                  ) : (
                    <span className="m-act">
                      <button type="button" className="btn ghost sm" onClick={() => run(() => setRole(team.id, p.id, p.role === 'owner' ? 'member' : 'owner'), p.role === 'owner' ? `${p.name}님을 조원으로 바꿨어요` : `${p.name}님을 조장으로 지정했어요`)}>{p.role === 'owner' ? '조원으로' : '조장으로'}</button>
                      <button type="button" className="btn ghost sm" onClick={() => setConfirmRemove(p.id)}>내보내기</button>
                    </span>
                  )
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <h2>조 나가기</h2>
          <div className="panel-body">
            {confirm === 'leave' ? (
              <div className="danger"><span>{team.name}에서 나갈까요? 내가 올린 코드와 리뷰는 조에 남아요.</span><button type="button" className="btn sm" onClick={() => setConfirm(null)}>취소</button>
                <button type="button" className="btn sm danger-btn" onClick={async () => { if (await run(() => removeMember(team.id, me.id), `${team.name}에서 나왔어요`)) navigate({ name: 'feed' }); }}>나가기</button></div>
            ) : confirm === 'delete' ? (
              <div className="danger"><span>조와 모든 코드·리뷰를 지울까요? 되돌릴 수 없어요.</span><button type="button" className="btn sm" onClick={() => setConfirm(null)}>취소</button>
                <button type="button" className="btn sm danger-btn" onClick={async () => { if (await run(() => deleteTeam(team.id), `${team.name}을 지웠어요`)) navigate({ name: 'feed' }); }}>조 삭제</button></div>
            ) : (
              <div className="danger">
                {isOwner && owners.length === 1 && profiles.length > 1
                  ? <span className="muted small">조장은 다른 조원을 조장으로 지정한 뒤에 나갈 수 있어요.</span>
                  : <button type="button" className="btn ghost sm" onClick={() => setConfirm('leave')}>이 조에서 나가기</button>}
                {isOwner && <button type="button" className="btn ghost sm" onClick={() => setConfirm('delete')}>조 삭제</button>}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
