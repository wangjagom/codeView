import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { BackBar } from '../components/Layout';
import { Loading } from '../components/Motion';
import { friendlyError, getPost } from '../lib/api';
import { href } from '../lib/router';
import { useStore } from '../lib/store';
import { NewPost } from './NewPost';
/** '#/edit/글id' — 내가 올린 글 고치기 */
export function EditPost({ id }) {
    const { me } = useStore();
    const [target, setTarget] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => {
        let alive = true;
        getPost(id).then((d) => { if (alive)
            setTarget({ post: d.post, threads: d.threads }); }).catch((e) => { if (alive)
            setError(friendlyError(e)); });
        return () => { alive = false; };
    }, [id]);
    if (error)
        return _jsxs("section", { children: [_jsx(BackBar, {}), _jsx("div", { className: "empty", children: error })] });
    if (!target)
        return _jsx("section", { children: _jsx("div", { className: "empty", children: _jsx(Loading, {}) }) });
    if (target.post.author_id !== me.id)
        return _jsxs("section", { children: [_jsx(BackBar, { to: href({ name: 'post', id }) }), _jsx("div", { className: "empty", children: "\uAE00\uC4F4\uC774\uB9CC \uACE0\uCE60 \uC218 \uC788\uC5B4\uC694" })] });
    return _jsx(NewPost, { edit: target }, target.post.id + target.post.version);
}
