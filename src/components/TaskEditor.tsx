import { useState } from 'react';
import { COURSE_TASKS, TASK_NAME_MAX, normTask, similarTasks, taskProblem } from '../lib/tasks';
import { useFlip } from './Motion';

/**
 * 과제 목록 편집: 입력하고 Enter로 하나씩 추가, ×로 빼기,
 * 칩을 누르면 이름 바꾸기와 ◀ ▶ 순서 옮기기, PC에서는 끌어서 옮기기도 돼요.
 */
export function TaskEditor({ value, onChange, id = 'taskInput' }: { value: string[]; onChange: (v: string[]) => void; id?: string }) {
  const [input, setInput] = useState('');
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [drag, setDrag] = useState<number | null>(null);
  const ref = useFlip<HTMLDivElement>();

  const add = (name = input) => {
    const p = taskProblem(name, value);
    if (p) { setErr(p); return; }
    onChange([...value, name.trim()]); setInput(''); setErr('');
  };
  const remove = (i: number) => { onChange(value.filter((_, j) => j !== i)); setErr(''); if (edit !== null) setEdit(null); };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value]; const [x] = next.splice(from, 1); next.splice(to, 0, x); onChange(next);
    if (edit === from) setEdit(to);
  };
  const startEdit = (i: number) => { setEdit(i); setEditText(value[i]); setErr(''); };
  const saveEdit = () => {
    if (edit === null) return;
    const t = editText.trim();
    if (t && t !== value[edit]) {
      const p = taskProblem(t, value.filter((_, j) => j !== edit));
      if (p) { setErr(p); return; }
      onChange(value.map((x, j) => (j === edit ? t : x)));
    }
    setEdit(null); setErr('');
  };
  const quick = COURSE_TASKS.filter((t) => !value.some((v) => normTask(v) === normTask(t)));
  const similar = input.trim() ? similarTasks(input, value) : [];

  return (
    <div className="tasks-ed">
      <div className="task-chips" ref={ref} aria-label="과제 목록">
        {value.length === 0 && <span className="muted small">과제가 없으면 '자유 질문' 하나로 시작해요</span>}
        {value.map((t, i) => (edit === i ? (
          <span key={t} data-flip={t} className="task-chip editing">
            <button type="button" className="tc-move" aria-label="앞으로" disabled={i === 0} onMouseDown={(e) => e.preventDefault()} onClick={() => move(i, i - 1)}>◀</button>
            <input autoFocus value={editText} maxLength={TASK_NAME_MAX} aria-label="과제 이름 바꾸기" size={Math.max(6, editText.length + 1)}
              onChange={(e) => setEditText(e.target.value)} onBlur={saveEdit}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(); } if (e.key === 'Escape') { e.preventDefault(); setEdit(null); setErr(''); } }} />
            <button type="button" className="tc-move" aria-label="뒤로" disabled={i === value.length - 1} onMouseDown={(e) => e.preventDefault()} onClick={() => move(i, i + 1)}>▶</button>
          </span>
        ) : (
          <span key={t} data-flip={t} className={`task-chip ${drag === i ? 'dragging' : ''}`} draggable
            onDragStart={(e) => { setDrag(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); }}
            onDragOver={(e) => { if (drag !== null) e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); if (drag !== null) move(drag, i); setDrag(null); }}
            onDragEnd={() => setDrag(null)}>
            <button type="button" className="tc-name" title="눌러서 이름 바꾸기·순서 옮기기" onClick={() => startEdit(i)}>{t}</button>
            <button type="button" className="tc-x" aria-label={`${t} 빼기`} onClick={() => remove(i)}>×</button>
          </span>
        )))}
      </div>
      <div className="task-add">
        <input id={id} value={input} maxLength={TASK_NAME_MAX} placeholder="새 과제 이름 입력 후 Enter" autoComplete="off"
          onChange={(e) => { setInput(e.target.value); setErr(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); add(); } }} />
        <button type="button" className="btn sm" onClick={() => add()}>추가</button>
      </div>
      {similar.length > 0 && <p className="muted small task-similar">비슷한 과제가 있어요: {similar.map((s) => <b key={s}>{s}</b>)}</p>}
      {err && <p className="err small" role="alert">{err}</p>}
      {quick.length > 0 && (
        <div className="task-quick"><span className="muted small">빠른 추가</span>
          {quick.map((t) => <button key={t} type="button" className="chip sm" onClick={() => add(t)}>+ {t}</button>)}
        </div>
      )}
    </div>
  );
}
