import { jsx as _jsx } from "react/jsx-runtime";
export function Avatar({ person, size = 'md' }) {
    const title = person.bio ? `${person.name} · ${person.bio}` : person.name;
    if (person.avatar)
        return _jsx("img", { className: `ava ${size} photo`, src: person.avatar, alt: "", title: title, "aria-hidden": "true" });
    return (_jsx("span", { className: `ava ${size}`, style: { background: person.color }, title: title, "aria-hidden": "true", children: person.name.slice(0, 1) }));
}
export function StatusPill({ status }) {
    const label = { wait: '리뷰 대기', doing: '피드백 중', done: '해결됨' }[status];
    return _jsx("span", { className: `st ${status}`, children: label });
}
