import type { Profile } from '../lib/types';

export function Avatar({ person, size = 'md' }: { person: Profile; size?: 'xs' | 'md' | 'lg' }) {
  return (
    <span className={`ava ${size}`} style={{ background: person.color }} title={person.name} aria-hidden="true">
      {person.name.slice(0, 1)}
    </span>
  );
}

export function StatusPill({ status }: { status: 'wait' | 'doing' | 'done' }) {
  const label = { wait: '리뷰 대기', doing: '피드백 중', done: '해결됨' }[status];
  return <span className={`st ${status}`}>{label}</span>;
}
