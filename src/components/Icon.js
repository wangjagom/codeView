import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** 화면에 쓰는 작은 선 아이콘. 서비스 로고는 아직 없어서 넣지 않았어요. */
const PATHS = {
    home: _jsx("path", { fill: "currentColor", d: "M12 3.2 3 10.4V20a1 1 0 0 0 1 1h5.5v-6h5v6H20a1 1 0 0 0 1-1v-9.6l-9-7.2z" }),
    plus: _jsxs("g", { fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", children: [_jsx("rect", { x: "3.5", y: "3.5", width: "17", height: "17", rx: "5" }), _jsx("path", { d: "M12 8v8M8 12h8" })] }),
    team: _jsxs("g", { fill: "currentColor", children: [_jsx("circle", { cx: "9", cy: "8", r: "3.6" }), _jsx("path", { d: "M2.5 19.5c.6-3.7 3.2-5.8 6.5-5.8s5.9 2.1 6.5 5.8z" }), _jsx("circle", { cx: "17", cy: "9", r: "2.8", opacity: ".55" }), _jsx("path", { d: "M15.8 13.7c3 .1 5.2 2 5.7 5.3h-4.3c-.2-2-.7-3.8-1.4-5.3z", opacity: ".55" })] }),
    me: _jsxs("g", { fill: "currentColor", children: [_jsx("circle", { cx: "12", cy: "8", r: "4" }), _jsx("path", { d: "M4 20.5c.7-4.2 3.9-6.6 8-6.6s7.3 2.4 8 6.6z" })] }),
    down: _jsx("path", { fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", d: "M6 9l6 6 6-6" }),
    back: _jsx("path", { fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", d: "M15 6l-6 6 6 6" }),
    copy: _jsxs("g", { fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round", children: [_jsx("rect", { x: "8.5", y: "8.5", width: "11", height: "11", rx: "2.5" }), _jsx("path", { d: "M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" })] }),
    check: _jsx("path", { fill: "none", stroke: "currentColor", strokeWidth: "2.4", strokeLinecap: "round", strokeLinejoin: "round", d: "M5 12.5l4.5 4.5L19 7.5" }),
    chat: _jsxs("g", { fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round", children: [_jsx("path", { d: "M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z" }), _jsx("path", { d: "M8.5 9.5l-1.5 1.5 1.5 1.5M15.5 9.5l1.5 1.5-1.5 1.5", strokeLinecap: "round" })] }),
    link: _jsxs("g", { fill: "none", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", children: [_jsx("path", { d: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" }), _jsx("path", { d: "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" })] }),
    download: _jsxs("g", { fill: "none", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M12 4v11" }), _jsx("path", { d: "m7 10 5 5 5-5" }), _jsx("path", { d: "M5 19h14" })] }),
    zip: _jsxs("g", { fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round", children: [_jsx("path", { d: "M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" }), _jsx("path", { d: "M11 3v2h2v2h-2v2h2v2h-2", strokeLinecap: "round" }), _jsx("rect", { x: "10", y: "13", width: "4", height: "4", rx: "1" })] }),
    thumb: _jsxs("g", { fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round", strokeLinecap: "round", children: [_jsx("path", { d: "M7 10.5V20H4.5a1 1 0 0 1-1-1v-7.5a1 1 0 0 1 1-1H7Z" }), _jsx("path", { d: "M7 10.5 10.6 3.6a1.6 1.6 0 0 1 3 .9l-.7 4.5h5.4a2 2 0 0 1 2 2.4l-1.3 6.6a2.4 2.4 0 0 1-2.4 2H7" })] }),
    thumbOn: _jsxs("g", { fill: "currentColor", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round", strokeLinecap: "round", children: [_jsx("path", { d: "M7 10.5V20H4.5a1 1 0 0 1-1-1v-7.5a1 1 0 0 1 1-1H7Z" }), _jsx("path", { d: "M7 10.5 10.6 3.6a1.6 1.6 0 0 1 3 .9l-.7 4.5h5.4a2 2 0 0 1 2 2.4l-1.3 6.6a2.4 2.4 0 0 1-2.4 2H7Z" })] }),
    bookmark: _jsx("path", { d: "M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4.2L5.5 21V4.5a1 1 0 0 1 1-1Z", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round" }),
    bookmarkOn: _jsx("path", { d: "M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4.2L5.5 21V4.5a1 1 0 0 1 1-1Z", fill: "currentColor", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round" }),
    search: _jsxs("g", { fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", children: [_jsx("circle", { cx: "10.5", cy: "10.5", r: "6.5" }), _jsx("path", { d: "m15.5 15.5 5 5" })] }),
    edit: _jsxs("g", { fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round", strokeLinecap: "round", children: [_jsx("path", { d: "M4 20h4L19.3 8.7a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z" }), _jsx("path", { d: "m13.5 6.5 4 4" })] }),
    close: _jsx("path", { d: "M6 6l12 12M18 6 6 18", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }),
    more: _jsxs("g", { fill: "currentColor", children: [_jsx("circle", { cx: "5.5", cy: "12", r: "1.8" }), _jsx("circle", { cx: "12", cy: "12", r: "1.8" }), _jsx("circle", { cx: "18.5", cy: "12", r: "1.8" })] }),
    paste: _jsxs("g", { fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round", children: [_jsx("rect", { x: "5", y: "5", width: "14", height: "16", rx: "2.5" }), _jsx("path", { d: "M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" }), _jsx("path", { d: "M9 11h6M9 15h4", strokeLinecap: "round" })] }),
    trash: _jsx("g", { fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M4.5 7h15M10 4h4M6.5 7l1 13h9l1-13" }) }),
    comment: _jsxs("g", { fill: "none", stroke: "currentColor", strokeWidth: "1.9", strokeLinejoin: "round", children: [_jsx("path", { d: "M5 5h14v10H10l-4 4v-4H5z" }), _jsx("path", { d: "M12 8v4M10 10h4", strokeLinecap: "round" })] }),
    send: _jsx("path", { fill: "currentColor", d: "M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" }),
    chev: _jsx("path", { fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", d: "M9 6l6 6-6 6" }),
};
export function Icon({ name, className = '' }) {
    return _jsx("svg", { className: `ic ${className}`, viewBox: "0 0 24 24", "aria-hidden": "true", children: PATHS[name] });
}
