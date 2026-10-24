import type { Profile } from '../lib/types';

export function Avatar({ person, size = 'md' }: { person: Profile; size?: 'xs' | 'md' | 'lg' | 'xl' }) {
  const title = person.bio ? `${person.name} · ${person.bio}` : person.name;
  if (person.avatar) return <img className={`ava ${size} photo`} src={person.avatar} alt="" title={title} aria-hidden="true" />;
  return (
    <span className={`ava ${size}`} style={{ background: person.color }} title={title} aria-hidden="true">
      {person.name.slice(0, 1)}
    </span>
  );
}

export function StatusPill({ status }: { status: 'wait' | 'doing' | 'done' }) {
  const label = { wait: '리뷰 대기', doing: '피드백 중', done: '해결됨' }[status];
  return <span className={`st ${status}`}>{label}</span>;
}
