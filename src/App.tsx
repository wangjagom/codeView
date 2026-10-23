import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layout, type Filter } from './components/Layout';
import { friendlyError, isMember, listCommentsLite, listPosts, listProfiles } from './lib/api';
import { isConfigured } from './lib/config';
import { useRoute } from './lib/router';
import { StoreContext, makePerson, type Store } from './lib/store';
import { supabase } from './lib/supabase';
import type { CommentLite, Post, Profile } from './lib/types';
import { Login, NotMember, Onboarding } from './pages/Auth';
import { Feed } from './pages/Feed';
import { Me } from './pages/Me';
import { NewPost } from './pages/NewPost';
import { PostDetail } from './pages/PostDetail';

type Phase = 'loading' | 'signedOut' | 'notMember' | 'onboarding' | 'ready' | 'error';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<CommentLite[]>([]);
  const [tick, setTick] = useState(0);
  const [toastMsg, setToastMsg] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [task, setTask] = useState('');
  const toastTimer = useRef<number>(0);
  const route = useRoute();

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(''), 2200);
  }, []);

  const refresh = useCallback(async () => {
    const [pr, po, cm] = await Promise.all([listProfiles(), listPosts(), listCommentsLite()]);
    setProfiles(pr); setPosts(po); setComments(cm);
  }, []);

  const boot = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) { setPhase('signedOut'); return; }
    try {
      if (!(await isMember())) { setPhase('notMember'); return; }
      const pr = await listProfiles();
      if (!pr.some((p) => p.id === s.user.id)) { setProfiles(pr); setPhase('onboarding'); return; }
      await refresh();
      setPhase('ready');
    } catch (e) {
      setError(friendlyError(e)); setPhase('error');
    }
  }, [refresh]);

  useEffect(() => {
    if (!isConfigured) return;
    supabase.auth.getSession().then(({ data }) => boot(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') boot(s);
      else setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, [boot]);

  // 조원이 글이나 리뷰를 남기면 목록과 열린 화면을 다시 불러와요.
  useEffect(() => {
    if (phase !== 'ready') return;
    let timer = 0;
    const bump = () => { window.clearTimeout(timer); timer = window.setTimeout(() => { refresh().catch(() => {}); setTick((t) => t + 1); }, 300); };
    const ch = supabase.channel('codeview-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'threads' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, bump)
      .subscribe();
    return () => { window.clearTimeout(timer); supabase.removeChannel(ch); };
  }, [phase, refresh]);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); location.hash = ''; }, []);

  const store = useMemo<Store | null>(() => {
    if (phase !== 'ready' || !session) return null;
    const person = makePerson(profiles);
    return { me: person(session.user.id), profiles, person, posts, comments, refresh, tick, toast, signOut };
  }, [phase, session, profiles, posts, comments, refresh, tick, toast, signOut]);

  const toastEl = <div className={`toast ${toastMsg ? 'on' : ''}`} role="status">{toastMsg}</div>;

  if (!isConfigured) return <SetupNotice />;
  if (phase === 'loading') return <div className="auth"><p className="muted">불러오는 중…</p></div>;
  if (phase === 'signedOut') return <Login />;
  if (phase === 'error') return <div className="auth"><div className="auth-card"><h1>문제가 생겼어요</h1><p>{error}</p><button type="button" className="btn" onClick={() => location.reload()}>다시 시도</button></div></div>;
  if (phase === 'notMember') return <NotMember email={session?.user.email ?? ''} onSignOut={signOut} />;
  if (phase === 'onboarding' && session) return <Onboarding userId={session.user.id} email={session.user.email ?? ''} onDone={() => boot(session)} />;
  if (!store) return null;

  return (
    <StoreContext.Provider value={store}>
      <Layout view={route.name} filter={filter} task={task} onFilter={setFilter} onTask={setTask}>
        {route.name === 'feed' && <Feed filter={filter} task={task} />}
        {route.name === 'new' && <NewPost />}
        {route.name === 'post' && <PostDetail id={route.id} />}
        {route.name === 'me' && <Me />}
      </Layout>
      {toastEl}
    </StoreContext.Provider>
  );
}

function SetupNotice() {
  return (
    <div className="auth">
      <div className="auth-card">
        <h1>Supabase 설정이 필요해요</h1>
        <p><code>.env</code> 파일에 <code>VITE_SUPABASE_URL</code>과 <code>VITE_SUPABASE_ANON_KEY</code>를 넣고 다시 실행해 주세요.</p>
        <p className="muted small">자세한 순서는 README의 "처음 설정하기"에 있어요.</p>
      </div>
    </div>
  );
}
