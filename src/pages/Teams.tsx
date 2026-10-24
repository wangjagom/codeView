import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { CopyButton } from '../components/CopyButton';
import { BackBar, Header, WeekStats, reviewsGivenThisWeek } from '../components/Layout';
import { createTeam, friendlyError, joinTeam, regenerateInvite, removeMember, setRole, updateTeam, deleteTeam } from '../lib/api';
import { DEFAULT_TASKS } from '../lib/config';
import { inviteUrl, navigate } from '../lib/router';
import { useStore } from '../lib/store';
import type { Team } from '../lib/types';

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
                <label htmlFor="inviteCode" className="lbl">초대 코드</label>
        <input id="inviteCode" className="code-input" value={code} maxLength={12} autoComplete="off" placeholder="ABCD2345" onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <button className="btn primary wide" disabled={busy !== null}>{busy === 'join' ? '참여하는 중…' : '참여하기'}</button>
      </form>
      <form className="tf-card" onSubmit={(e) => { e.preventDefault(); create(); }}>
        <h2>새 조 만들기</h2>
        <p className="muted small">만든 사람이 조장이 돼요</p>
        <label htmlFor="teamName" className="lbl">조 이름</label>
        <input id="teamName" value={name} maxLength={40} placeholder="예: 프론트엔드 7기 3조" onChange={(e) => setName(e.target.value)} />
        <label htmlFor="teamTasks" className="lbl">과제 목록 <span className="muted">(쉼표로 구분)</span></label>
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
      <BackBar label="닫기" />
      <h1 className="h-big tight">조 추가</h1>
      <p className="muted small lead">속한 조 {teams.length}개</p>
      <TeamForms onDone={async (t, joined) => { await reloadTeams(t.id); toast(joined ? `'${t.name}'에 참여했어요` : `'${t.name}'을 만들었어요`); navigate(joined ? { name: 'feed' } : { name: 'team' }); }} />
    </section>
  );
}

/** '#/team' — 지금 조 설정 (초대, 조원 관리, 이름·과제 바꾸기, 나가기) */
export function TeamSettings({ onTeam }: { onTeam: () => void }) {
  const { me, team, isOwner, profiles, posts, comments, reloadTeams, toast } = useStore();
  const [name, setName] = useState(team.name);
  const [tasks, setTasks] = useState(team.tasks.join(', '));
  const [confirm, setConfirm] = useState<'leave' | 'delete' | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const owners = profiles.filter((p) => p.role === 'owner');
  const link = inviteUrl(team.invite_code);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); await reloadTeams(team.id); toast(ok); return true; } catch (e) { toast(friendlyError(e)); return false; }
  };

  const [editing, setEditing] = useState(false);
  const pretty = team.invite_code.replace(/^(.{4})(.+)$/, '$1 $2');

  return (
    <section>
      <Header onTeam={onTeam} />
      <h1 className="h-big">{team.name}</h1>

      <section className="invite" aria-label="조원 초대하기">
        <span className="lab">조원 초대하기</span>
        <span className="invite-code" aria-label={`초대 코드 ${team.invite_code}`}>{pretty}</span>
        <div className="acts">
          <CopyButton className="big white" text={() => team.invite_code} label="코드 복사" onFail={toast} />
          <CopyButton className="big primary" text={() => link} label="초대 링크 복사" icon="link" onFail={toast} />
        </div>
      </section>

      <WeekStats />

      <div className="sec-h"><h2>조원 {profiles.length}명</h2>{isOwner && <button type="button" onClick={() => run(() => regenerateInvite(team.id), '새 초대 코드를 만들었어요. 이전 링크는 이제 쓸 수 없어요')}>새 초대 코드</button>}</div>
      <div className="card list">
        {profiles.map((p) => {
          const given = reviewsGivenThisWeek(p.id, posts, comments);
          return (
            <div key={p.id} className="item">
              <Avatar person={p} />
              <span className="body">
                <span className="t">{p.name}{p.id === me.id ? ' (나)' : ''}{p.role === 'owner' && <span className="role">조장</span>}</span>
                <span className="m">올린 코드 {posts.filter((x) => x.author_id === p.id).length}개 · 이번 주 리뷰 {given}개</span>
              </span>
              {isOwner && p.id !== me.id && (
                confirmRemove === p.id ? (
                  <span className="m-act"><button type="button" className="btn sm" onClick={() => setConfirmRemove(null)}>취소</button><button type="button" className="btn sm danger-btn" onClick={() => { setConfirmRemove(null); run(() => removeMember(team.id, p.id), `${p.name}님을 내보냈어요`); }}>내보내기</button></span>
                ) : (
                  <span className="m-act">
                    <button type="button" className="txt-btn" onClick={() => run(() => setRole(team.id, p.id, p.role === 'owner' ? 'member' : 'owner'), p.role === 'owner' ? `${p.name}님을 조원으로 바꿨어요` : `${p.name}님을 조장으로 지정했어요`)}>{p.role === 'owner' ? '조원으로' : '조장으로'}</button>
                    <button type="button" className="txt-btn" onClick={() => setConfirmRemove(p.id)}>내보내기</button>
                  </span>
                )
              )}
            </div>
          );
        })}
      </div>

      <div className="sec-h"><h2>과제</h2>{isOwner && <button type="button" onClick={() => setEditing(!editing)}>{editing ? '닫기' : '편집'}</button>}</div>
      {editing && isOwner ? (
        <form className="card card-pad form" onSubmit={async (e) => { e.preventDefault(); const t = parseTasks(tasks); if (await run(() => updateTeam(team.id, { name: name.trim() || team.name, tasks: t.length ? t : DEFAULT_TASKS }), '조 정보를 저장했어요')) setEditing(false); }}>
          <div className="field"><label htmlFor="setName">조 이름</label><input className="inp" id="setName" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label htmlFor="setTasks">과제 목록 (쉼표로 구분)</label><textarea className="inp" id="setTasks" rows={3} value={tasks} onChange={(e) => setTasks(e.target.value)} />
            <span className="hint">과제를 지워도 이미 올라온 코드의 과제 표시는 그대로 남아요.</span></div>
          <button className="btn primary wide">저장</button>
        </form>
      ) : (
        <div className="card list">
          {team.tasks.map((t) => <div key={t} className="item"><span className="body"><span className="t">{t}</span></span><span className="muted small">{posts.filter((p) => p.task === t).length}개</span></div>)}
        </div>
      )}

      <div className="foot-acts">
        {confirm === 'leave' ? (
          <div className="danger"><span>{team.name}에서 나갈까요? 내가 올린 코드와 리뷰는 조에 남아요.</span><button type="button" className="btn sm" onClick={() => setConfirm(null)}>취소</button>
            <button type="button" className="btn sm danger-btn" onClick={async () => { if (await run(() => removeMember(team.id, me.id), `${team.name}에서 나왔어요`)) navigate({ name: 'feed' }); }}>나가기</button></div>
        ) : confirm === 'delete' ? (
          <div className="danger"><span>조와 모든 코드·리뷰를 지울까요? 되돌릴 수 없어요.</span><button type="button" className="btn sm" onClick={() => setConfirm(null)}>취소</button>
            <button type="button" className="btn sm danger-btn" onClick={async () => { if (await run(() => deleteTeam(team.id), `${team.name}을 지웠어요`)) navigate({ name: 'feed' }); }}>조 삭제</button></div>
        ) : (
          <>
            <button type="button" className="txt-btn" onClick={onTeam}>다른 조로 가기</button>
            {isOwner && owners.length === 1 && profiles.length > 1
              ? <span className="muted small">조장은 다른 조원을 조장으로 지정한 뒤에 나갈 수 있어요</span>
              : <button type="button" className="txt-btn red" onClick={() => setConfirm('leave')}>조 나가기</button>}
            {isOwner && <button type="button" className="txt-btn red" onClick={() => setConfirm('delete')}>조 삭제</button>}
          </>
        )}
      </div>
    </section>
  );
}
