import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layout, type Filter } from './components/Layout';
import { friendlyError, getMyProfile, joinTeam, listCommentsLite, listMembers, listMyTeams, listPosts } from './lib/api';
import { isConfigured } from './lib/config';
import { navigate, useRoute } from './lib/router';
import { StoreContext, lastTeam, makePerson, pendingCode, type MyTeam, type Store } from './lib/store';
import { supabase } from './lib/supabase';
import type { CommentLite, Member, Post, Profile } from './lib/types';
import { AuthCard, Login, Onboarding } from './pages/Auth';
import { Feed } from './pages/Feed';
import { Me } from './pages/Me';
import { NewPost } from './pages/NewPost';
import { PostDetail } from './pages/PostDetail';
import { TeamForms, TeamSettings, TeamsPage } from './pages/Teams';

type Phase = 'loading' | 'signedOut' | 'onboarding' | 'noTeam' | 'ready' | 'error';

export default function App() {
  const route = useRoute();
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [me, setMe] = useState<Profile | null>(null);
  const [teams, setTeams] = useState<MyTeam[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Member[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<CommentLite[]>([]);
  const [tick, setTick] = useState(0);
  const [toastMsg, setToastMsg] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [task, setTask] = useState('');
  const toastTimer = useRef<number>(0);
  const teamRef = useRef<string | null>(null);
  teamRef.current = teamId;

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(''), 2400);
  }, []);

  // 초대 링크로 들어왔으면 코드를 기억해 뒀다가 로그인·이름 정하기가 끝나면 참여시켜요.
  useEffect(() => { if (route.name === 'join') pendingCode.set(route.code.toUpperCase()); }, [route]);

  const loadTeamData = useCallback(async (tid: string) => {
    const [mem, po] = await Promise.all([listMembers(tid), listPosts(tid)]);
    const cm = await listCommentsLite(po.map((p) => p.id));
    if (teamRef.current !== tid) return; // 그 사이 다른 조로 바꿨어요
    setProfiles(mem); setPosts(po); setComments(cm);
  }, []);

  /** 조 목록을 다시 읽고 보여 줄 조를 골라요. */
  const pickTeam = useCallback(async (userId: string, prefer?: string | null) => {
    const list = await listMyTeams(userId);
    setTeams(list);
    if (!list.length) { setTeamId(null); lastTeam.set(null); setPhase('noTeam'); return; }
    const chosen = list.find((t) => t.id === prefer) ?? list.find((t) => t.id === lastTeam.get()) ?? list[0];
    lastTeam.set(chosen.id);
    teamRef.current = chosen.id;
    setTeamId(chosen.id);
    await loadTeamData(chosen.id);
    setPhase('ready');
  }, [loadTeamData]);

  const consumePending = useCallback(async (): Promise<string | null> => {
    const code = pendingCode.get();
    if (!code) return null;
    pendingCode.set(null);
    try {
      const t = await joinTeam(code);
      toast(`'${t.name}'에 참여했어요`);
      if (location.hash.startsWith('#/join')) navigate({ name: 'feed' });
      return t.id;
    } catch (e) {
      setJoinError(friendlyError(e));
      if (location.hash.startsWith('#/join')) navigate({ name: 'feed' });
      return null;
    }
  }, [toast]);

  const boot = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) { setPhase('signedOut'); return; }
    try {
      const profile = await getMyProfile(s.user.id);
      if (!profile) { setPhase('onboarding'); return; }
      setMe(profile);
      const joined = await consumePending();
      await pickTeam(s.user.id, joined);
    } catch (e) {
      setError(friendlyError(e)); setPhase('error');
    }
  }, [pickTeam, consumePending]);

  useEffect(() => {
    if (!isConfigured) return;
    supabase.auth.getSession().then(({ data }) => boot(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') boot(s);
      else setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, [boot]);

  // 로그인한 상태에서 초대 링크를 열면 바로 참여해요.
  useEffect(() => {
    if (phase !== 'ready' || route.name !== 'join' || !session) return;
    (async () => { const id = await consumePending(); await pickTeam(session.user.id, id ?? teamRef.current); })();
  }, [phase, route, session, consumePending, pickTeam]);

  const refresh = useCallback(async () => { if (teamRef.current) await loadTeamData(teamRef.current); }, [loadTeamData]);
  const reloadTeams = useCallback(async (prefer?: string) => {
    if (!session) return;
    const p = await getMyProfile(session.user.id);
    if (p) setMe(p);
    await pickTeam(session.user.id, prefer ?? teamRef.current);
  }, [session, pickTeam]);
  const switchTeam = useCallback((id: string) => {
    if (!session || id === teamRef.current) return;
    setFilter('all'); setTask('');
    pickTeam(session.user.id, id).then(() => navigate({ name: 'feed' })).catch((e) => toast(friendlyError(e)));
  }, [session, pickTeam, toast]);

  // 조원이 글이나 리뷰를 남기면 목록과 열린 화면을 다시 불러와요.
  useEffect(() => {
    if (phase !== 'ready' || !teamId) return;
    let timer = 0;
    const bump = () => { window.clearTimeout(timer); timer = window.setTimeout(() => { refresh().catch(() => {}); setTick((t) => t + 1); }, 300); };
    const ch = supabase.channel(`codeview-${teamId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `team_id=eq.${teamId}` }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'threads' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_memberships', filter: `team_id=eq.${teamId}` }, bump)
      .subscribe();
    return () => { window.clearTimeout(timer); supabase.removeChannel(ch); };
  }, [phase, teamId, refresh]);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); lastTeam.set(null); location.hash = ''; }, []);

  const store = useMemo<Store | null>(() => {
    const team = teams.find((t) => t.id === teamId);
    if (phase !== 'ready' || !session || !me || !team) return null;
    const person = makePerson(profiles);
    return { me: { ...me, ...(profiles.find((p) => p.id === me.id) ?? {}) }, team, teams, isOwner: team.role === 'owner', profiles, person, posts, comments, refresh, reloadTeams, switchTeam, tick, toast, signOut };
  }, [phase, session, me, teams, teamId, profiles, posts, comments, refresh, reloadTeams, switchTeam, tick, toast, signOut]);

  const toastEl = <div className={`toast ${toastMsg ? 'on' : ''}`} role="status">{toastMsg}</div>;

  if (!isConfigured) return <SetupNotice />;
  if (phase === 'loading') return <div className="auth"><p className="muted">불러오는 중…</p></div>;
  if (phase === 'signedOut') return <Login invited={route.name === 'join' || Boolean(pendingCode.get())} />;
  if (phase === 'error') return <AuthCard><h1>문제가 생겼어요</h1><p>{error}</p><button type="button" className="btn" onClick={() => location.reload()}>다시 시도</button></AuthCard>;
  if (phase === 'onboarding' && session) return <Onboarding userId={session.user.id} email={session.user.email ?? ''} onDone={() => boot(session)} />;
  if (phase === 'noTeam' && session) {
    return (
      <>
        <AuthCard wide>
          <h1>함께 리뷰할 조를 정해요</h1>
          <p>초대 코드로 조에 들어가거나, 새 조를 만들어 조원들을 초대해요.</p>
          <TeamForms initialError={joinError} onDone={async (t) => { setJoinError(''); await pickTeam(session.user.id, t.id); if (t.created_by === session.user.id) navigate({ name: 'team' }); }} />
          <button type="button" className="btn ghost sm" onClick={signOut}>로그아웃</button>
        </AuthCard>
        {toastEl}
      </>
    );
  }
  if (!store) return null;

  return (
    <StoreContext.Provider value={store}>
      <Layout view={route.name} filter={filter} task={task} onFilter={setFilter} onTask={setTask}>
        {joinError && <div className="notice" role="alert">{joinError}<button type="button" className="btn ghost sm" onClick={() => setJoinError('')}>닫기</button></div>}
        {(route.name === 'feed' || route.name === 'join') && <Feed filter={filter} task={task} />}
        {route.name === 'new' && <NewPost />}
        {route.name === 'post' && <PostDetail id={route.id} />}
        {route.name === 'me' && <Me />}
        {route.name === 'team' && <TeamSettings key={store.team.id} />}
        {route.name === 'teams' && <TeamsPage />}
      </Layout>
      {toastEl}
    </StoreContext.Provider>
  );
}

function SetupNotice() {
  return (
    <AuthCard>
      <h1>Supabase 설정이 필요해요</h1>
      <p><code>.env</code> 파일에 <code>VITE_SUPABASE_URL</code>과 <code>VITE_SUPABASE_ANON_KEY</code>를 넣고 다시 실행해 주세요.</p>
      <p className="muted small">자세한 순서는 README의 "처음 설정하기"에 있어요.</p>
    </AuthCard>
  );
}
