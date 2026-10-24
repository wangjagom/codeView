import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Header } from '../components/Layout';
import { friendlyError, getNotificationPrefs, saveNotificationPrefs, updateProfile } from '../lib/api';
import { MIN_PASSWORD } from '../lib/auth';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { ColorPicker } from './Auth';
import { PostItem } from './Feed';
import { href } from '../lib/router';
import { ProfileFields } from '../components/ProfileFields';
import { Dots, Expand, Loading } from '../components/Motion';
function Switch({ on, label, onChange }) {
    return _jsx("button", { type: "button", className: "switch", role: "switch", "aria-checked": on, "aria-label": label, onClick: () => onChange(!on) });
}
export function Me({ onTeam, onShowAll }) {
    const { me, refresh, toast, signOut } = useStore();
    const [color, setColor] = useState(me.color);
    const [avatar, setAvatar] = useState(me.avatar ?? null);
    const [bio, setBio] = useState(me.bio ?? '');
    const [openEdit, setOpenEdit] = useState(false);
    const [saving, setSaving] = useState(false);
    const profileDirty = color !== me.color || avatar !== (me.avatar ?? null) || bio.trim() !== (me.bio ?? '');
    const saveProfile = async () => {
        setSaving(true);
        try {
            const patch = {};
            if (color !== me.color)
                patch.color = color;
            if (avatar !== (me.avatar ?? null))
                patch.avatar = avatar;
            if (bio.trim() !== (me.bio ?? ''))
                patch.bio = bio.trim() || null;
            await updateProfile(me.id, patch);
            await refresh();
            setOpenEdit(false);
            toast('프로필을 저장했어요');
        }
        catch (x) {
            toast(friendlyError(x));
        }
        setSaving(false);
    };
    const [pw, setPw] = useState('');
    const [pw2, setPw2] = useState('');
    const [openPw, setOpenPw] = useState(false);
    const [prefs, setPrefs] = useState(null);
    const [notifyOn, setNotifyOn] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [confirmOut, setConfirmOut] = useState(false);
    useEffect(() => {
        getNotificationPrefs()
            .then((p) => { setPrefs(p ?? { email: '', on_review: true, on_request: true }); setNotifyOn(Boolean(p?.email)); })
            .catch(() => setPrefs({ email: '', on_review: true, on_request: true }));
    }, []);
    const change = (patch) => { if (prefs) {
        setPrefs({ ...prefs, ...patch });
        setDirty(true);
    } };
    const savePrefs = async (on = notifyOn) => {
        if (!prefs)
            return;
        const email = on ? prefs.email.trim() : '';
        if (on && !/^\S+@\S+\.\S+$/.test(email)) {
            toast('알림 받을 이메일을 적어 주세요');
            document.getElementById('notifyEmail')?.focus();
            return;
        }
        try {
            await saveNotificationPrefs(me.id, { ...prefs, email });
            setDirty(false);
            toast(email ? '알림 설정을 저장했어요' : '이메일 알림을 껐어요');
        }
        catch (e) {
            toast(friendlyError(e));
        }
    };
    const changePassword = async () => {
        if (pw.length < MIN_PASSWORD) {
            toast(`비밀번호는 ${MIN_PASSWORD}자 이상이에요`);
            return;
        }
        if (pw !== pw2) {
            toast('비밀번호 확인이 달라요');
            return;
        }
        const { error } = await supabase.auth.updateUser({ password: pw });
        if (error)
            toast(friendlyError(error));
        else {
            setPw('');
            setPw2('');
            setOpenPw(false);
            toast('비밀번호를 바꿨어요');
        }
    };
    return (_jsxs("section", { children: [_jsx(Header, { onTeam: onTeam }), _jsxs("div", { className: "card profile", children: [_jsx(Avatar, { person: { ...me, color, avatar }, size: "lg" }), _jsxs("div", { className: "body", children: [_jsx("b", { children: me.name }), me.bio ? _jsx("span", { className: "bio", children: me.bio }) : _jsx("span", { className: "muted small", children: "\uC18C\uAC1C \uC5C6\uC74C" })] }), _jsx("button", { type: "button", className: "btn sm", "aria-expanded": openEdit, onClick: () => {
                            if (openEdit) {
                                setColor(me.color);
                                setAvatar(me.avatar ?? null);
                                setBio(me.bio ?? '');
                            }
                            setOpenEdit(!openEdit);
                        }, children: openEdit ? '닫기' : '프로필 편집' })] }), _jsx(Expand, { open: openEdit, children: _jsxs("div", { className: "card card-pad stack", children: [_jsx(ProfileFields, { name: me.name, color: color, avatar: avatar, bio: bio, onError: toast, onChange: (p) => { if ('avatar' in p)
                                setAvatar(p.avatar ?? null); if (p.bio !== undefined)
                                setBio(p.bio); } }), _jsxs("span", { className: "lbl", children: ["\uC0C9 ", _jsx("span", { className: "muted", children: "(\uC0AC\uC9C4\uC774 \uC5C6\uC744 \uB54C)" })] }), _jsx(ColorPicker, { value: color, onChange: setColor, name: me.name }), _jsx("span", { className: "muted small", children: "\uB85C\uADF8\uC778 \uC774\uB984\uC740 \uBC14\uAFC0 \uC218 \uC5C6\uC5B4\uC694 \u00B7 \uC0AC\uC9C4\u00B7\uC18C\uAC1C\uB294 \uC120\uD0DD\uC774\uC5D0\uC694" }), _jsx("button", { type: "button", className: "btn primary wide pf-save", disabled: !profileDirty || saving, onClick: saveProfile, children: saving ? _jsxs(_Fragment, { children: ["\uC800\uC7A5 \uC911", _jsx(Dots, {})] }) : '저장' })] }) }), _jsx(MyCode, { onShowAll: onShowAll }), _jsxs("div", { className: "sec-h", children: [_jsx("h2", { children: "\uC54C\uB9BC" }), _jsx("span", { className: "muted small", children: "\uC120\uD0DD" })] }), _jsx("div", { className: "card list", children: !prefs ? _jsx("div", { className: "item", children: _jsx(Loading, { className: "muted small" }) }) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "item", children: [_jsxs("span", { className: "body", children: [_jsx("span", { className: "t", children: "\uC774\uBA54\uC77C\uB85C \uC54C\uB9BC \uBC1B\uAE30" }), _jsx("span", { className: "m", children: notifyOn && prefs.email ? prefs.email : '이메일은 알림에만 쓰고 로그인에는 쓰지 않아요' })] }), _jsx(Switch, { on: notifyOn, label: "\uC774\uBA54\uC77C\uB85C \uC54C\uB9BC \uBC1B\uAE30", onChange: (v) => { setNotifyOn(v); if (!v)
                                        savePrefs(false);
                                    else
                                        setDirty(true); } })] }), _jsxs(Expand, { open: notifyOn, children: [_jsx("div", { className: "item", children: _jsx("input", { className: "inp", id: "notifyEmail", type: "email", autoComplete: "email", value: prefs.email, placeholder: "\uC54C\uB9BC \uBC1B\uC744 \uC774\uBA54\uC77C", onChange: (e) => change({ email: e.target.value }) }) }), _jsxs("div", { className: "item", children: [_jsx("span", { className: "body", children: _jsx("span", { className: "t", children: "\uB0B4 \uCF54\uB4DC\uC5D0 \uB9AC\uBDF0\uAC00 \uB2EC\uB9AC\uBA74" }) }), _jsx(Switch, { on: prefs.on_review, label: "\uB0B4 \uCF54\uB4DC\uC5D0 \uB9AC\uBDF0\uAC00 \uB2EC\uB9AC\uBA74", onChange: (v) => change({ on_review: v }) })] }), _jsxs("div", { className: "item", children: [_jsx("span", { className: "body", children: _jsx("span", { className: "t", children: "\uB204\uAC00 \uB9AC\uBDF0\uB97C \uBD80\uD0C1\uD558\uBA74" }) }), _jsx(Switch, { on: prefs.on_request, label: "\uB204\uAC00 \uB9AC\uBDF0\uB97C \uBD80\uD0C1\uD558\uBA74", onChange: (v) => change({ on_request: v }) })] }), dirty && _jsx("div", { className: "item", children: _jsx("button", { type: "button", className: "btn primary wide", onClick: () => savePrefs(), children: "\uC54C\uB9BC \uC124\uC815 \uC800\uC7A5" }) })] })] })) }), _jsx("p", { className: "muted small lead", children: "\uBA54\uC77C \uBC1C\uC1A1 \uC900\uBE44 \uC911 \u00B7 \uC774\uBA54\uC77C\uC740 \uBCF8\uC778\uB9CC \uBCFC \uC218 \uC788\uC5B4\uC694" }), _jsx("div", { className: "sec-h", children: _jsx("h2", { children: "\uACC4\uC815" }) }), _jsxs("div", { className: "card list", children: [_jsxs("button", { type: "button", className: "item", "aria-expanded": openPw, onClick: () => setOpenPw(!openPw), children: [_jsx("span", { className: "body", children: _jsx("span", { className: "t", children: "\uBE44\uBC00\uBC88\uD638 \uBC14\uAFB8\uAE30" }) }), _jsx(Icon, { name: openPw ? 'down' : 'chev', className: "chev" })] }), _jsx(Expand, { open: openPw, children: _jsxs("form", { className: "item stack", onSubmit: (e) => { e.preventDefault(); changePassword(); }, children: [_jsx("input", { type: "text", autoComplete: "username", value: me.name, readOnly: true, hidden: true }), _jsx("input", { className: "inp", id: "newPw", type: "password", autoComplete: "new-password", value: pw, placeholder: `새 비밀번호 (${MIN_PASSWORD}자 이상)`, onChange: (e) => setPw(e.target.value) }), _jsx("input", { className: "inp", id: "newPw2", type: "password", autoComplete: "new-password", value: pw2, placeholder: "\uC0C8 \uBE44\uBC00\uBC88\uD638 \uD655\uC778", onChange: (e) => setPw2(e.target.value) }), _jsx("span", { className: "hint", children: "\uC78A\uC73C\uBA74 \uB418\uCC3E\uC744 \uC218 \uC5C6\uC5B4\uC694" }), _jsx("button", { className: "btn primary wide", disabled: !pw, children: "\uBE44\uBC00\uBC88\uD638 \uBC14\uAFB8\uAE30" })] }) }), _jsxs("button", { type: "button", className: "item", "aria-expanded": confirmOut, onClick: () => setConfirmOut(!confirmOut), children: [_jsx("span", { className: "body", children: _jsx("span", { className: "t", children: "\uB85C\uADF8\uC544\uC6C3" }) }), _jsx(Icon, { name: confirmOut ? 'down' : 'chev', className: "chev" })] }), _jsx(Expand, { open: confirmOut, children: _jsxs("div", { className: "item stack", children: [_jsx("span", { className: "small", children: "\uB85C\uADF8\uC544\uC6C3\uD560\uAE4C\uC694? \uC774\uB984\uACFC \uBE44\uBC00\uBC88\uD638\uB85C \uB2E4\uC2DC \uB4E4\uC5B4\uC62C \uC218 \uC788\uC5B4\uC694." }), _jsxs("div", { className: "two-btn", children: [_jsx("button", { type: "button", className: "btn", onClick: () => setConfirmOut(false), children: "\uCDE8\uC18C" }), _jsx("button", { type: "button", className: "btn danger-btn", onClick: signOut, children: "\uB85C\uADF8\uC544\uC6C3" })] })] }) })] })] }));
}
/** 내가 올린 코드 · 🔖 저장한 코드 (최근 5개, 더 있으면 홈에서 모아 봐요) */
function MyCode({ onShowAll }) {
    const { me, posts, likes, bookmarks } = useStore();
    const [tab, setTab] = useState('mine');
    const mine = posts.filter((p) => p.author_id === me.id);
    const saved = posts.filter((p) => bookmarks.has(p.id));
    const list = tab === 'mine' ? mine : saved;
    const shown = list.slice(0, 5);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "sec-h", children: [_jsx("h2", { children: "\uB0B4 \uCF54\uB4DC" }), list.length > shown.length && _jsxs("button", { type: "button", onClick: () => onShowAll(tab), children: ["\uBAA8\uB450 \uBCF4\uAE30", _jsx(Icon, { name: "chev" })] })] }), _jsxs("div", { className: "seg my-tabs", role: "tablist", "aria-label": "\uB0B4 \uCF54\uB4DC", children: [_jsxs("button", { type: "button", role: "tab", "aria-selected": tab === 'mine', "aria-pressed": tab === 'mine', onClick: () => setTab('mine'), children: ["\uB0B4\uAC00 \uC62C\uB9B0 \uCF54\uB4DC ", _jsx("span", { className: "chip-n", children: mine.length })] }), _jsxs("button", { type: "button", role: "tab", "aria-selected": tab === 'saved', "aria-pressed": tab === 'saved', onClick: () => setTab('saved'), children: ["\uC800\uC7A5\uD55C \uCF54\uB4DC ", _jsx("span", { className: "chip-n", children: saved.length })] })] }), _jsx("div", { className: "card list", children: shown.length ? shown.map((p) => _jsx(PostItem, { post: p, likes: likes.filter((l) => l.post_id === p.id).length, saved: tab === 'saved' }, p.id)) : tab === 'mine' ? (_jsxs("div", { className: "empty small-empty", children: ["\uC544\uC9C1 \uC62C\uB9B0 \uCF54\uB4DC\uAC00 \uC5C6\uC5B4\uC694", _jsx("br", {}), _jsx("a", { href: href({ name: 'new' }), children: "\uCF54\uB4DC \uC62C\uB9AC\uAE30" })] })) : (_jsxs("div", { className: "empty small-empty", children: [_jsx(Icon, { name: "bookmark", className: "empty-ic" }), "\uC800\uC7A5\uD55C \uCF54\uB4DC\uAC00 \uC5C6\uC5B4\uC694", _jsx("br", {}), _jsx("span", { className: "muted small", children: "\uAE00 \uC0C1\uC138\uC5D0\uC11C '\uC800\uC7A5'\uC744 \uB204\uB974\uBA74 \uC5EC\uAE30 \uBAA8\uC5EC\uC694" })] })) })] }));
}
