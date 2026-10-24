import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { toAvatar } from '../lib/image';
import { Avatar } from './Avatar';
import { Dots } from './Motion';
export const BIO_MAX = 80;
/** 프로필 사진과 한 줄 소개 (둘 다 선택). 가입 화면과 내 정보에서 같이 써요. */
export function ProfileFields({ name, color, avatar, bio, onChange, onError }) {
    const fileRef = useRef(null);
    const [busy, setBusy] = useState(false);
    return (_jsxs("div", { className: "pf", children: [_jsxs("div", { className: "pf-photo", children: [_jsx(Avatar, { person: { id: '', name: name.trim() || '?', color, avatar }, size: "xl" }), _jsxs("div", { className: "pf-acts", children: [_jsx("button", { type: "button", className: "btn sm", disabled: busy, onClick: () => fileRef.current?.click(), children: busy ? _jsxs(_Fragment, { children: ["\uC904\uC774\uB294 \uC911", _jsx(Dots, {})] }) : avatar ? '사진 바꾸기' : '사진 고르기' }), avatar && _jsx("button", { type: "button", className: "btn ghost sm", onClick: () => onChange({ avatar: null }), children: "\uC0AC\uC9C4 \uBE7C\uAE30" }), _jsx("span", { className: "muted small", children: "\uC815\uC0AC\uAC01\uD615\uC73C\uB85C \uC798\uB77C\uC11C \uC791\uAC8C \uC800\uC7A5\uD574\uC694" })] }), _jsx("input", { ref: fileRef, type: "file", accept: "image/*", hidden: true, onChange: async (e) => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            if (!f)
                                return;
                            setBusy(true);
                            try {
                                onChange({ avatar: await toAvatar(f) });
                            }
                            catch (x) {
                                onError(x instanceof Error ? x.message : '사진을 읽지 못했어요');
                            }
                            setBusy(false);
                        } })] }), _jsxs("label", { className: "lbl", htmlFor: "pfBio", children: ["\uD55C \uC904 \uC18C\uAC1C ", _jsxs("span", { className: "muted", children: ["(", bio.length, "/", BIO_MAX, ")"] })] }), _jsx("input", { id: "pfBio", className: "inp", value: bio, maxLength: BIO_MAX, placeholder: "\uC608: ABAP 2\uAC1C\uC6D4\uCC28, UI5 \uACF5\uBD80 \uC911", onChange: (e) => onChange({ bio: e.target.value }) })] }));
}
