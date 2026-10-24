import { useEffect, useState } from 'react';
import { TaskEditor } from '../components/TaskEditor';
import { COURSE_TASKS } from '../lib/tasks';
import { Avatar } from '../components/Avatar';
import { CopyButton } from '../components/CopyButton';
import { BackBar, Header, WeekStats, reviewsGivenThisWeek } from '../components/Layout';
import { createTeam, friendlyError, joinTeam, peekTeam, regenerateInvite, removeMember, setMyRole, setRole, updateTeam, deleteTeam, type TeamPeek } from '../lib/api';
import { DEFAULT_TASKS } from '../lib/config';
import { inviteUrl, navigate } from '../lib/router';
import { pendingCode, useStore } from '../lib/store';
import { ROLE_LABEL, type Role, type Team } from '../lib/types';
import { Dots, useFlip } from '../components/Motion';

const ROLES: Role[] = ['owner', 'vice', 'member'];

/** 조장·부조장·조원 고르기. 이미 누가 맡은 자리는 고를 수 없어요. */
export function RolePicker({ value, onChange, taken = {}, label = '내 직책' }: {
  value: Role; onChange: (r: Role) => void; taken?: Partial<Record<Role, boolean>>; label?: string;
}) {
  return (
    <div className="seg seg3 role-pick" role="radiogroup" aria-label={label}>
      {ROLES.map((r) => (
        <button key={r} type="button" role="radio" aria-checked={value === r} aria-pressed={value === r} disabled={Boolean(taken[r]) && value !== r} onClick={() => onChange(r)}>
          {ROLE_LABEL[r]}{taken[r] && value !== r ? <small> · 있음</small> : null}
        </button>
      ))}
    </div>
  );
}

/** 조 만들기 + 초대 코드로 참여하기. 첫 화면과 '#/teams' 화면에서 같이 써요. */
export function TeamForms({ onDone, initialError = '' }: { onDone: (team: Team, joined: boolean) => void; initialError?: string }) {
  const [name, setName] = useState('');
  const [tasks, setTasks] = useState<string[]>(COURSE_TASKS);
  const [code, setCode] = useState(() => pendingCode.get() ?? '');
  const [err, setErr] = useState(initialError);
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [createRole, setCreateRole] = useState<Role>('owner');
  const [joinRole, setJoinRole] = useState<Role>('member');
  const [peek, setPeek] = useState<TeamPeek | null>(null);
  const clean = code.replace(/\s|-/g, '').toUpperCase();

  // 코드 8자리를 다 치면 어느 조인지, 조장·부조장 자리가 비었는지 미리 봐요.
  useEffect(() => {
    setPeek(null);
    if (clean.length !== 8) return;
    let alive = true;
    const t = window.setTimeout(() => {
      peekTeam(clean).then((p) => {
        if (!alive || !p) return;
        setPeek(p);
        setJoinRole((r) => ((r === 'owner' && p.owner_taken) || (r === 'vice' && p.vice_taken) ? 'member' : r));
      }).catch((e) => { if (alive) setErr(friendlyError(e)); });
    }, 250);
    return () => { alive = false; window.clearTimeout(t); };
  }, [clean]);

  const create = async () => {
    if (!name.trim()) { setErr('조 이름을 적어 주세요.'); document.getElementById('teamName')?.focus(); return; }
    setBusy('create'); setErr('');
    try { const t = await createTeam(name.trim(), tasks.length ? tasks : DEFAULT_TASKS, createRole); pendingCode.set(null); onDone(t, false); }
    catch (e) { setErr(friendlyError(e)); setBusy(null); }
  };
  const join = async () => {
    if (clean.length < 6) { setErr('초대 코드 8자리를 확인해 주세요.'); document.getElementById('inviteCode')?.focus(); return; }
    setBusy('join'); setErr('');
    try { const t = await joinTeam(clean, joinRole); pendingCode.set(null); onDone(t, true); }
    catch (e) { setErr(friendlyError(e)); setBusy(null); }
  };

  return (
    <div className="team-forms">
      <form className="tf-card" onSubmit={(e) => { e.preventDefault(); join(); }}>
        <h2>초대 코드로 참여하기</h2>
                <label htmlFor="inviteCode" className="lbl">초대 코드</label>
        <input id="inviteCode" className="code-input" value={code} maxLength={12} autoComplete="off" placeholder="ABCD2345" onChange={(e) => { setCode(e.target.value.toUpperCase()); setErr(''); }} />
        {peek && <p className="peek"><b>{peek.name}</b> · 조원 {peek.members}명{peek.joined && <span className="muted"> · 이미 들어가 있는 조예요</span>}</p>}
        <span className="lbl">직책</span>
        <RolePicker value={joinRole} onChange={setJoinRole} taken={{ owner: peek?.owner_taken, vice: peek?.vice_taken }} />
        <button className="btn primary wide" disabled={busy !== null || Boolean(peek?.joined)}>{busy === 'join' ? <>참여하는 중<Dots /></> : peek ? `${ROLE_LABEL[joinRole]}으로 참여` : '참여하기'}</button>
      </form>
      <form className="tf-card" onSubmit={(e) => { e.preventDefault(); create(); }}>
        <h2>새 조 만들기</h2>
        <label htmlFor="teamName" className="lbl">조 이름</label>
        <input id="teamName" value={name} maxLength={40} placeholder="예: 프론트엔드 7기 3조" onChange={(e) => setName(e.target.value)} />
        <label htmlFor="teamTasks" className="lbl">과제 <span className="muted">(나중에 바꿀 수 있어요)</span></label>
        <TaskEditor id="teamTasks" value={tasks} onChange={setTasks} />
        <span className="lbl">내 직책 <span className="muted">(조장·부조장은 조를 관리할 수 있어요)</span></span>
        <RolePicker value={createRole} onChange={setCreateRole} />
        <button className="btn wide" disabled={busy !== null}>{busy === 'create' ? <>만드는 중<Dots /></> : '조 만들기'}</button>
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
  const [tasks, setTasks] = useState<string[]>(team.tasks);
  const [confirm, setConfirm] = useState<'leave' | 'delete' | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const holder = (r: Role) => profiles.find((p) => p.role === r);
  const myRole = (profiles.find((p) => p.id === me.id)?.role ?? team.role) as Role;
  const link = inviteUrl(team.invite_code);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); await reloadTeams(team.id); toast(ok); return true; } catch (e) { toast(friendlyError(e)); return false; }
  };

  const [editing, setEditing] = useState(false);
  const memberRef = useFlip<HTMLDivElement>();
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

      <div className="sec-h"><h2>내 직책</h2><span className="muted small">조장·부조장은 조를 관리할 수 있어요</span></div>
      <div className="card card-pad">
        <RolePicker value={myRole} taken={{ owner: Boolean(holder('owner')), vice: Boolean(holder('vice')) }}
          onChange={(r) => { if (r !== myRole) run(() => setMyRole(team.id, r), `${ROLE_LABEL[r]}으로 바꿨어요`); }} />
        {(['owner', 'vice'] as Role[]).some((r) => holder(r) && holder(r)!.id !== me.id) && (
          <p className="muted small role-note">{(['owner', 'vice'] as Role[]).filter((r) => holder(r) && holder(r)!.id !== me.id).map((r) => `${ROLE_LABEL[r]} ${holder(r)!.name}`).join(' · ')}</p>
        )}
      </div>

      <WeekStats />

      <div className="sec-h"><h2>조원 {profiles.length}명</h2>{isOwner && <button type="button" onClick={() => run(() => regenerateInvite(team.id), '새 초대 코드를 만들었어요. 이전 링크는 이제 쓸 수 없어요')}>새 초대 코드</button>}</div>
      <div className="card list" ref={memberRef}>
        {profiles.map((p) => {
          const given = reviewsGivenThisWeek(p.id, posts, comments);
          return (
            <div key={p.id} className="item" data-flip={p.id}>
              <Avatar person={p} />
              <span className="body">
                <span className="t">{p.name}{p.id === me.id ? ' (나)' : ''}{p.role !== 'member' && <span className={`role ${p.role}`}>{ROLE_LABEL[p.role]}</span>}</span>
                {p.bio && <span className="m bio">{p.bio}</span>}
                <span className="m">올린 코드 {posts.filter((x) => x.author_id === p.id).length}개 · 이번 주 리뷰 {given}개</span>
              </span>
              {isOwner && p.id !== me.id && (
                confirmRemove === p.id ? (
                  <span className="m-act"><button type="button" className="btn sm" onClick={() => setConfirmRemove(null)}>취소</button><button type="button" className="btn sm danger-btn" onClick={() => { setConfirmRemove(null); run(() => removeMember(team.id, p.id), `${p.name}님을 내보냈어요`); }}>내보내기</button></span>
                ) : (
                  <span className="m-act">
                    <select className="role-sel" value={p.role} aria-label={`${p.name} 직책`}
                      onChange={(e) => { const r = e.target.value as Role; run(() => setRole(team.id, p.id, r), `${p.name}님을 ${ROLE_LABEL[r]}으로 바꿨어요`); }}>
                      {ROLES.map((r) => { const h = holder(r); const busy = r !== 'member' && h && h.id !== p.id; return <option key={r} value={r} disabled={Boolean(busy)}>{ROLE_LABEL[r]}{busy ? ` (${h!.name})` : ''}</option>; })}
                    </select>
                    <button type="button" className="txt-btn" onClick={() => setConfirmRemove(p.id)}>내보내기</button>
                  </span>
                )
              )}
            </div>
          );
        })}
      </div>

      <div className="sec-h"><h2>과제</h2>{isOwner && <button type="button" onClick={() => { if (!editing) { setTasks(team.tasks); setName(team.name); } setEditing(!editing); }}>{editing ? '닫기' : '편집'}</button>}</div>
      {editing && isOwner ? (
        <form className="card card-pad form" onSubmit={async (e) => { e.preventDefault(); if (await run(() => updateTeam(team.id, { name: name.trim() || team.name, tasks: tasks.length ? tasks : DEFAULT_TASKS }), '조 정보를 저장했어요')) setEditing(false); }}>
          <div className="field"><label htmlFor="setName">조 이름</label><input className="inp" id="setName" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label htmlFor="setTasks">과제</label><TaskEditor id="setTasks" value={tasks} onChange={setTasks} />
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
          <div className="danger"><span>{team.name}에서 나갈까요? 내가 올린 코드와 리뷰는 조에 남아요.{profiles.length === 1 ? ' 마지막 조원이라 조가 지워져요.' : ''}</span><button type="button" className="btn sm" onClick={() => setConfirm(null)}>취소</button>
            <button type="button" className="btn sm danger-btn" onClick={async () => { if (await run(() => removeMember(team.id, me.id), `${team.name}에서 나왔어요`)) navigate({ name: 'feed' }); }}>나가기</button></div>
        ) : confirm === 'delete' ? (
          <div className="danger"><span>조와 모든 코드·리뷰를 지울까요? 되돌릴 수 없어요.</span><button type="button" className="btn sm" onClick={() => setConfirm(null)}>취소</button>
            <button type="button" className="btn sm danger-btn" onClick={async () => { if (await run(() => deleteTeam(team.id), `${team.name}을 지웠어요`)) navigate({ name: 'feed' }); }}>조 삭제</button></div>
        ) : (
          <>
            <button type="button" className="txt-btn" onClick={onTeam}>다른 조로 가기</button>
            <button type="button" className="txt-btn red" onClick={() => setConfirm('leave')}>조 나가기</button>
            {isOwner && <button type="button" className="txt-btn red" onClick={() => setConfirm('delete')}>조 삭제</button>}
          </>
        )}
      </div>
    </section>
  );
}
