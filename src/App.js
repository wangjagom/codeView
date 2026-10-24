import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HoverLayer } from './components/Hover';
import { ALL, Layout } from './components/Layout';
import { createProfile, friendlyError, getMyProfile, listLikes, listMyBookmarks, setBookmark, setLike, updateProfile, listCommentsLite, listMembers, listMyTeams, listPosts } from './lib/api';
import { PALETTE, isConfigured } from './lib/config';
import { navigate, useRoute } from './lib/router';
import { StoreContext, lastTeam, makePerson, pendingCode, pendingProfile } from './lib/store';
import { supabase } from './lib/supabase';
import { canManage } from './lib/types';
import { AuthCard, Login, Onboarding } from './pages/Auth';
import { Feed } from './pages/Feed';
import { Me } from './pages/Me';
import { NewPost } from './pages/NewPost';
import { PostDetail } from './pages/PostDetail';
import { EditPost } from './pages/EditPost';
import { TeamForms, TeamSettings, TeamsPage } from './pages/Teams';
import { Loading } from './components/Motion';
export default function App() {
    const route = useRoute();
    const [session, setSession] = useState(null);
    const [phase, setPhase] = useState('loading');
    const [error, setError] = useState('');
    const [joinError, setJoinError] = useState('');
    const [me, setMe] = useState(null);
    const [teams, setTeams] = useState([]);
    const [teamId, setTeamId] = useState(null);
    const [profiles, setProfiles] = useState([]);
    const [posts, setPosts] = useState([]);
    const [comments, setComments] = useState([]);
    const [likes, setLikes] = useState([]);
    const [bookmarks, setBookmarks] = useState(new Set());
    const [tick, setTick] = useState(0);
    const [toastMsg, setToastMsg] = useState('');
    const [filter, setFilter] = useState(ALL);
    const [task, setTask] = useState('');
    const [sheet, setSheet] = useState(false);
    const toastTimer = useRef(0);
    const teamRef = useRef(null);
    teamRef.current = teamId;
    const toast = useCallback((msg) => {
        setToastMsg(msg);
        window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToastMsg(''), 2400);
    }, []);
    // 초대 링크로 들어왔으면 코드를 기억해 뒀다가, 로그인 뒤 참여 화면에서 직책을 골라 들어와요.
    useEffect(() => { if (route.name === 'join')
        pendingCode.set(route.code.toUpperCase()); }, [route]);
    const loadTeamData = useCallback(async (tid) => {
        const [mem, po] = await Promise.all([listMembers(tid), listPosts(tid)]);
        const ids = po.map((p) => p.id);
        const { data: auth } = await supabase.auth.getSession();
        const [cm, lk, bm] = await Promise.all([listCommentsLite(ids), listLikes(ids), auth.session ? listMyBookmarks(auth.session.user.id) : Promise.resolve([])]);
        if (teamRef.current !== tid)
            return; // 그 사이 다른 팀으로 바꿨어요
        setProfiles(mem);
        setPosts(po);
        setComments(cm);
        setLikes(lk);
        setBookmarks(new Set(bm));
    }, []);
    /** 팀 목록을 다시 읽고 보여 줄 팀을 골라요. */
    const pickTeam = useCallback(async (userId, prefer) => {
        const list = await listMyTeams(userId);
        setTeams(list);
        if (!list.length) {
            setTeamId(null);
            lastTeam.set(null);
            setPhase('noTeam');
            return;
        }
        const chosen = list.find((t) => t.id === prefer) ?? list.find((t) => t.id === lastTeam.get()) ?? list[0];
        lastTeam.set(chosen.id);
        teamRef.current = chosen.id;
        setTeamId(chosen.id);
        await loadTeamData(chosen.id);
        setPhase('ready');
    }, [loadTeamData]);
    const boot = useCallback(async (s) => {
        setSession(s);
        if (!s) {
            setPhase('signedOut');
            return;
        }
        try {
            let profile = await getMyProfile(s.user.id);
            // 이름으로 가입하면 이름·색이 계정 정보에 들어 있어서 프로필을 바로 만들어요.
            const meta = s.user.user_metadata;
            if (!profile && meta?.username) {
                try {
                    await createProfile(s.user.id, meta.username, meta.color ?? PALETTE[0]);
                }
                catch { /* 이미 만들어졌으면 아래에서 다시 읽어요 */ }
                profile = await getMyProfile(s.user.id);
            }
            if (!profile) {
                setPhase('onboarding');
                return;
            }
            const extra = pendingProfile.get();
            if (extra) {
                pendingProfile.set(null);
                try {
                    await updateProfile(s.user.id, extra);
                    profile = (await getMyProfile(s.user.id)) ?? profile;
                }
                catch { /* 사진·소개는 내 정보에서 다시 넣을 수 있어요 */ }
            }
            setMe(profile);
            await pickTeam(s.user.id);
            if (pendingCode.get() && !location.hash.startsWith('#/teams'))
                navigate({ name: 'teams' });
        }
        catch (e) {
            setError(friendlyError(e));
            setPhase('error');
        }
    }, [pickTeam]);
    useEffect(() => {
        if (!isConfigured)
            return;
        supabase.auth.getSession().then(({ data }) => boot(data.session));
        const { data } = supabase.auth.onAuthStateChange((event, s) => {
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT')
                boot(s);
            else
                setSession(s);
        });
        return () => data.subscription.unsubscribe();
    }, [boot]);
    // 로그인한 상태에서 초대 링크를 열면 참여 화면(직책 고르기)으로 가요.
    useEffect(() => {
        if (phase === 'ready' && route.name === 'join')
            navigate({ name: 'teams' });
    }, [phase, route]);
    const refresh = useCallback(async () => { if (teamRef.current)
        await loadTeamData(teamRef.current); }, [loadTeamData]);
    const reloadTeams = useCallback(async (prefer) => {
        if (!session)
            return;
        const p = await getMyProfile(session.user.id);
        if (p)
            setMe(p);
        await pickTeam(session.user.id, prefer ?? teamRef.current);
    }, [session, pickTeam]);
    const switchTeam = useCallback((id) => {
        if (!session || id === teamRef.current)
            return;
        setFilter(ALL);
        setTask('');
        pickTeam(session.user.id, id).then(() => navigate({ name: 'feed' })).catch((e) => toast(friendlyError(e)));
    }, [session, pickTeam, toast]);
    // 팀원이 글이나 리뷰를 남기면 목록과 열린 화면을 다시 불러와요.
    useEffect(() => {
        if (phase !== 'ready' || !teamId)
            return;
        let timer = 0;
        const bump = () => { window.clearTimeout(timer); timer = window.setTimeout(() => { refresh().catch(() => { }); setTick((t) => t + 1); }, 300); };
        const ch = supabase.channel(`codeview-${teamId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `team_id=eq.${teamId}` }, bump)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'threads' }, bump)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, bump)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, bump)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'team_memberships', filter: `team_id=eq.${teamId}` }, bump)
            .subscribe();
        return () => { window.clearTimeout(timer); supabase.removeChannel(ch); };
    }, [phase, teamId, refresh]);
    // 👍·🔖는 누르자마자 화면에 반영하고, 실패하면 되돌려요.
    const toggleLike = useCallback((postId) => {
        if (!session)
            return;
        const uid = session.user.id;
        const on = !likes.some((l) => l.post_id === postId && l.user_id === uid);
        setLikes((ls) => (on ? [...ls, { post_id: postId, user_id: uid }] : ls.filter((l) => !(l.post_id === postId && l.user_id === uid))));
        setLike(postId, on, uid).catch((e) => {
            setLikes((ls) => (on ? ls.filter((l) => !(l.post_id === postId && l.user_id === uid)) : [...ls, { post_id: postId, user_id: uid }]));
            toast(friendlyError(e));
        });
    }, [session, likes, toast]);
    const toggleBookmark = useCallback((postId) => {
        if (!session)
            return;
        const on = !bookmarks.has(postId);
        const flip = (add) => setBookmarks((b) => { const n = new Set(b); if (add)
            n.add(postId);
        else
            n.delete(postId); return n; });
        flip(on);
        toast(on ? '저장했어요 · 내 정보에서 모아 볼 수 있어요' : '저장을 뺐어요');
        setBookmark(postId, on, session.user.id).catch((e) => { flip(!on); toast(friendlyError(e)); });
    }, [session, bookmarks, toast]);
    const signOut = useCallback(async () => { await supabase.auth.signOut(); lastTeam.set(null); location.hash = ''; }, []);
    const store = useMemo(() => {
        const team = teams.find((t) => t.id === teamId);
        if (phase !== 'ready' || !session || !me || !team)
            return null;
        const person = makePerson(profiles);
        return { me: { ...me, ...(profiles.find((p) => p.id === me.id) ?? {}) }, team, teams, isOwner: canManage(team.role), profiles, person, posts, comments, likes, bookmarks, toggleLike, toggleBookmark, refresh, reloadTeams, switchTeam, tick, toast, signOut };
    }, [phase, session, me, teams, teamId, profiles, posts, comments, likes, bookmarks, toggleLike, toggleBookmark, refresh, reloadTeams, switchTeam, tick, toast, signOut]);
    const toastEl = _jsxs(_Fragment, { children: [_jsx("div", { className: `toast ${toastMsg ? 'on' : ''}`, role: "status", children: toastMsg }), _jsx(HoverLayer, {})] });
    if (!isConfigured)
        return _jsx(SetupNotice, {});
    if (phase === 'loading')
        return _jsx("div", { className: "auth", children: _jsx("p", { className: "muted", children: _jsx(Loading, {}) }) });
    if (phase === 'signedOut')
        return _jsx(Login, { invited: route.name === 'join' || Boolean(pendingCode.get()) });
    if (phase === 'error')
        return _jsxs(AuthCard, { children: [_jsx("h1", { className: "h-big", children: "\uBB38\uC81C\uAC00 \uC0DD\uACBC\uC5B4\uC694" }), _jsx("p", { children: error }), _jsx("button", { type: "button", className: "btn", onClick: () => location.reload(), children: "\uB2E4\uC2DC \uC2DC\uB3C4" })] });
    if (phase === 'onboarding' && session)
        return _jsx(Onboarding, { userId: session.user.id, onDone: () => boot(session), onSignOut: signOut });
    if (phase === 'noTeam' && session) {
        return (_jsxs(_Fragment, { children: [_jsxs(AuthCard, { wide: true, children: [_jsx("h1", { className: "h-big", children: "\uD300 \uCC38\uC5EC" }), _jsx(TeamForms, { initialError: joinError, onDone: async (t) => { setJoinError(''); await pickTeam(session.user.id, t.id); if (t.created_by === session.user.id)
                                navigate({ name: 'team' }); } }), _jsx("button", { type: "button", className: "btn ghost sm", onClick: signOut, children: "\uB85C\uADF8\uC544\uC6C3" })] }), toastEl] }));
    }
    if (!store)
        return null;
    return (_jsxs(StoreContext.Provider, { value: store, children: [_jsx(Layout, { view: route.name, sheet: sheet, onSheet: setSheet, children: _jsxs("div", { className: "page", children: [joinError && _jsxs("div", { className: "notice", role: "alert", children: [joinError, _jsx("button", { type: "button", className: "btn ghost sm", onClick: () => setJoinError(''), children: "\uB2EB\uAE30" })] }), (route.name === 'feed' || route.name === 'join') && _jsx(Feed, { filter: filter, task: task, onFilter: setFilter, onTask: setTask, onTeam: () => setSheet(true) }), route.name === 'new' && _jsx(NewPost, {}), route.name === 'post' && _jsx(PostDetail, { id: route.id }), route.name === 'edit' && _jsx(EditPost, { id: route.id }), route.name === 'me' && _jsx(Me, { onTeam: () => setSheet(true), onShowAll: (view) => { setFilter({ ...ALL, view }); setTask(''); navigate({ name: 'feed' }); } }), route.name === 'team' && _jsx(TeamSettings, { onTeam: () => setSheet(true) }, store.team.id), route.name === 'teams' && _jsx(TeamsPage, {})] }, route.name === 'post' || route.name === 'edit' ? `${route.name}-${route.id}` : route.name === 'join' ? 'feed' : route.name) }), toastEl] }));
}
function SetupNotice() {
    return (_jsxs(AuthCard, { children: [_jsx("h1", { className: "h-big", children: "Supabase \uC124\uC815\uC774 \uD544\uC694\uD574\uC694" }), _jsxs("p", { children: [_jsx("code", { children: ".env" }), " \uD30C\uC77C\uC5D0 ", _jsx("code", { children: "VITE_SUPABASE_URL" }), "\uACFC ", _jsx("code", { children: "VITE_SUPABASE_ANON_KEY" }), "\uB97C \uB123\uACE0 \uB2E4\uC2DC \uC2E4\uD589\uD574 \uC8FC\uC138\uC694."] }), _jsx("p", { className: "muted small", children: "\uC790\uC138\uD55C \uC21C\uC11C\uB294 README\uC758 \"\uCC98\uC74C \uC124\uC815\uD558\uAE30\"\uC5D0 \uC788\uC5B4\uC694." })] }));
}
