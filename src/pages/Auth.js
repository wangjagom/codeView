import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { createProfile, friendlyError } from '../lib/api';
import { PALETTE } from '../lib/config';
import { pendingProfile } from '../lib/store';
import { ProfileFields } from '../components/ProfileFields';
import { MIN_PASSWORD, nameProblem, normalizeName, signInWithName, signUpWithName } from '../lib/auth';
import { Dots, Expand } from '../components/Motion';
export function AuthCard({ children, wide }) {
    return (_jsx("div", { className: "auth", children: _jsxs("div", { className: `auth-card ${wide ? 'wide' : ''}`, children: [_jsxs("div", { className: "brand", children: [_jsx("span", { className: "logo-slot", "aria-hidden": "true" }), _jsx("span", { className: "wordmark", children: "codeView" })] }), children] }) }));
}
export function Login({ invited }) {
    const [mode, setMode] = useState(invited ? 'up' : 'in');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [password2, setPassword2] = useState('');
    const [color, setColor] = useState(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
    const [openProfile, setOpenProfile] = useState(false);
    const [avatar, setAvatar] = useState(null);
    const [bio, setBio] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    // 로그인되면 App의 onAuthStateChange가 다음 화면으로 넘겨요.
    const submit = async () => {
        const problem = nameProblem(name);
        if (problem) {
            setErr(problem);
            document.getElementById('loginName')?.focus();
            return;
        }
        if (password.length < MIN_PASSWORD) {
            setErr(`비밀번호는 ${MIN_PASSWORD}자 이상이에요.`);
            document.getElementById('loginPw')?.focus();
            return;
        }
        if (mode === 'up' && password !== password2) {
            setErr('비밀번호 확인이 달라요.');
            document.getElementById('loginPw2')?.focus();
            return;
        }
        setBusy(true);
        setErr('');
        if (mode === 'in') {
            const { error } = await signInWithName(name, password);
            if (error) {
                setErr(friendlyError(error));
                setBusy(false);
            }
            return;
        }
        // 사진·소개는 프로필이 만들어진 뒤에 App이 저장해요.
        pendingProfile.set(avatar || bio.trim() ? { avatar, bio: bio.trim() || null } : null);
        const { data, error } = await signUpWithName(name, password, color);
        if (error) {
            pendingProfile.set(null);
            setErr(friendlyError(error));
            setBusy(false);
            return;
        }
        if (!data.session) {
            setErr('가입은 됐지만 바로 로그인되지 않았어요. Supabase에서 Confirm email을 꺼 주세요. (README 참고)');
            setBusy(false);
        }
    };
    const switchMode = (m) => { setMode(m); setErr(''); };
    return (_jsxs(AuthCard, { children: [_jsx("h1", { className: "h-big", children: invited ? '초대받은 팀에 참여' : mode === 'up' ? '가입' : '로그인' }), _jsxs("div", { className: "seg", role: "tablist", "aria-label": "\uB85C\uADF8\uC778 \uBC29\uC2DD", children: [_jsx("button", { type: "button", role: "tab", "aria-pressed": mode === 'in', "aria-selected": mode === 'in', onClick: () => switchMode('in'), children: "\uB85C\uADF8\uC778" }), _jsx("button", { type: "button", role: "tab", "aria-pressed": mode === 'up', "aria-selected": mode === 'up', onClick: () => switchMode('up'), children: "\uCC98\uC74C\uC774\uC5D0\uC694" })] }), _jsxs("form", { className: "auth-form", onSubmit: (e) => { e.preventDefault(); submit(); }, children: [mode === 'up' && _jsxs("p", { className: "small muted", children: [invited ? '가입하면 바로 팀에 들어가요. ' : '', "\uC774\uB984\uC740 \uC911\uBCF5 \uBD88\uAC00, \uB098\uC911\uC5D0 \uBABB \uBC14\uAFD4\uC694. \uC774\uBA54\uC77C \uD544\uC694 \uC5C6\uC74C."] }), _jsx("label", { htmlFor: "loginName", className: "lbl", children: "\uC774\uB984" }), _jsx("input", { id: "loginName", value: name, maxLength: 20, autoComplete: "username", autoCapitalize: "off", spellCheck: false, placeholder: "\uC608: \uC900\uD638, dev_kim", onChange: (e) => setName(e.target.value) }), _jsx("label", { htmlFor: "loginPw", className: "lbl", children: "\uBE44\uBC00\uBC88\uD638" }), _jsx("input", { id: "loginPw", type: "password", value: password, autoComplete: mode === 'up' ? 'new-password' : 'current-password', placeholder: `${MIN_PASSWORD}자 이상`, onChange: (e) => setPassword(e.target.value) }), _jsxs(Expand, { open: mode === 'up', className: "sub-form", children: [_jsx("label", { htmlFor: "loginPw2", className: "lbl", children: "\uBE44\uBC00\uBC88\uD638 \uD655\uC778" }), _jsx("input", { id: "loginPw2", type: "password", value: password2, autoComplete: "new-password", onChange: (e) => setPassword2(e.target.value) }), _jsx("span", { className: "lbl", children: "\uC544\uBC14\uD0C0 \uC0C9" }), _jsx(ColorPicker, { value: color, onChange: setColor, name: name }), _jsx("button", { type: "button", className: "btn ghost sm opt-toggle", "aria-expanded": openProfile, onClick: () => setOpenProfile(!openProfile), children: openProfile ? '사진·소개 접기' : '+ 사진·소개 (선택)' }), _jsx(Expand, { open: openProfile, children: _jsx(ProfileFields, { name: name, color: color, avatar: avatar, bio: bio, onError: setErr, onChange: (p) => { if ('avatar' in p)
                                        setAvatar(p.avatar ?? null); if (p.bio !== undefined)
                                        setBio(p.bio); } }) })] }), err && _jsx("p", { className: "err", role: "alert", children: err }), _jsx("button", { className: "btn primary wide", disabled: busy, children: busy ? _jsxs(_Fragment, { children: ["\uC7A0\uC2DC\uB9CC\uC694", _jsx(Dots, {})] }) : mode === 'in' ? '로그인' : '가입하고 시작하기' }), mode === 'in'
                        ? _jsxs("p", { className: "small muted center", children: ["\uCC98\uC74C\uC774\uB77C\uBA74 ", _jsx("button", { type: "button", className: "linkish", onClick: () => switchMode('up'), children: "\uAC00\uC785\uD558\uAE30" })] })
                        : _jsxs("p", { className: "small muted center", children: ["\uC774\uBBF8 \uC774\uB984\uC774 \uC788\uB2E4\uBA74 ", _jsx("button", { type: "button", className: "linkish", onClick: () => switchMode('in'), children: "\uB85C\uADF8\uC778" })] })] })] }));
}
/** 계정은 있는데 프로필(이름)이 없는 경우에만 나와요. */
export function Onboarding({ userId, onDone, onSignOut }) {
    const [name, setName] = useState('');
    const [color, setColor] = useState(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    return (_jsxs(AuthCard, { children: [_jsx("h1", { className: "h-big", children: "\uD45C\uC2DC \uC774\uB984" }), _jsxs("form", { className: "auth-form", onSubmit: async (e) => {
                    e.preventDefault();
                    const problem = nameProblem(name);
                    if (problem) {
                        setErr(problem);
                        return;
                    }
                    setBusy(true);
                    setErr('');
                    try {
                        await createProfile(userId, normalizeName(name), color);
                        onDone();
                    }
                    catch (x) {
                        setErr(friendlyError(x));
                        setBusy(false);
                    }
                }, children: [_jsx("label", { htmlFor: "name", className: "lbl", children: "\uC774\uB984 (\uACB9\uCE58\uC9C0 \uC54A\uAC8C, \uBC14\uAFC0 \uC218 \uC5C6\uC5B4\uC694)" }), _jsx("input", { id: "name", value: name, maxLength: 20, onChange: (e) => setName(e.target.value) }), _jsx("span", { className: "lbl", children: "\uC0C9" }), _jsx(ColorPicker, { value: color, onChange: setColor, name: name }), err && _jsx("p", { className: "err", children: err }), _jsx("button", { className: "btn primary wide", disabled: busy, children: "\uC2DC\uC791\uD558\uAE30" }), _jsx("button", { type: "button", className: "btn ghost sm", onClick: onSignOut, children: "\uB85C\uADF8\uC544\uC6C3" })] })] }));
}
export function ColorPicker({ value, onChange, name }) {
    return (_jsx("div", { className: "colors", role: "radiogroup", "aria-label": "\uC544\uBC14\uD0C0 \uC0C9", children: PALETTE.map((c) => (_jsx("button", { type: "button", role: "radio", "aria-checked": value === c, className: "ava md", style: { background: c }, onClick: () => onChange(c), children: value === c ? (name.trim()[0] ?? '✓') : '' }, c))) }));
}
