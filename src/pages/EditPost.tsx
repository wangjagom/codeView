import { useEffect, useState } from 'react';
import { BackBar } from '../components/Layout';
import { Loading } from '../components/Motion';
import { friendlyError, getPost } from '../lib/api';
import { href } from '../lib/router';
import { useStore } from '../lib/store';
import { NewPost, type EditTarget } from './NewPost';

/** '#/edit/글id' — 내가 올린 글 고치기 */
export function EditPost({ id }: { id: string }) {
  const { me } = useStore();
  const [target, setTarget] = useState<EditTarget | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    getPost(id).then((d) => { if (alive) setTarget({ post: d.post, threads: d.threads }); }).catch((e) => { if (alive) setError(friendlyError(e)); });
    return () => { alive = false; };
  }, [id]);
  if (error) return <section><BackBar /><div className="empty">{error}</div></section>;
  if (!target) return <section><div className="empty"><Loading /></div></section>;
  if (target.post.author_id !== me.id) return <section><BackBar to={href({ name: 'post', id })} /><div className="empty">글쓴이만 고칠 수 있어요</div></section>;
  return <NewPost key={target.post.id + target.post.version} edit={target} />;
}
