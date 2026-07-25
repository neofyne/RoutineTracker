import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

type View = 'routines' | 'tasks'
type Theme = 'light' | 'dark'

const today = new Date()
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const dayLabel = (date: Date) => date.toLocaleDateString(undefined, { weekday: 'short' })
const shortDate = (date: Date) => date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

function AppIcon({ name }: { name: 'grid' | 'check' | 'plus' | 'sun' | 'moon' | 'arrow' }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    check: <path d="m5 12 4.2 4L19.5 6" />,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    moon: <path d="M20.2 15.5A8.4 8.4 0 0 1 8.5 3.8 8.5 8.5 0 1 0 20.2 15.5Z" />,
    arrow: <path d="m14 6-6 6 6 6" />,
  }
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>
}

export function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [view, setView] = useState<View>('routines')
  const [theme, setTheme] = useState<Theme>('light')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authMessage, setAuthMessage] = useState('')

  useEffect(() => {
    const saved = window.localStorage.getItem('routine-theme') as Theme | null
    if (saved) setTheme(saved)
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => subscription.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('routine-theme', theme)
  }, [theme])

  async function authenticate(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return setAuthMessage('Supabase is not configured yet.')
    if (authPassword.length < 8) return setAuthMessage('Use a password with at least 8 characters.')
    const result = authMode === 'signin'
      ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
      : await supabase.auth.signUp({ email: authEmail, password: authPassword })
    if (result.error) return setAuthMessage(result.error.message)
    setAuthMessage(authMode === 'signup' ? 'Account created. You are signed in.' : '')
  }

  async function signOut() {
    await supabase?.auth.signOut()
    setSession(null)
    setAuthPassword('')
    setAuthMessage('')
  }

  if (!session) return <AuthScreen email={authEmail} setEmail={setAuthEmail} password={authPassword} setPassword={setAuthPassword} mode={authMode} setMode={setAuthMode} message={authMessage} onSubmit={authenticate} theme={theme} setTheme={setTheme} />

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><AppIcon name="check" /></span><span>DayPlan</span></div>
      <div className="topbar-actions"><button className="sign-out-button" onClick={signOut}>Sign out</button><button className="icon-button" aria-label="Toggle colour theme" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}><AppIcon name={theme === 'light' ? 'moon' : 'sun'} /></button></div>
    </header>
    <section className="page-content">
      {view === 'routines' ? <RoutineStarter userId={session.user.id} /> : <TasksStarter userId={session.user.id} />}
    </section>
    <nav className="bottom-nav" aria-label="Primary navigation">
      <button className={view === 'routines' ? 'active' : ''} onClick={() => setView('routines')}><AppIcon name="grid" /><span>Routines</span></button>
      <button className={view === 'tasks' ? 'active' : ''} onClick={() => setView('tasks')}><AppIcon name="check" /><span>Daily Tasks</span></button>
    </nav>
  </main>
}

function AuthScreen({ email, setEmail, password, setPassword, mode, setMode, message, onSubmit, theme, setTheme }: { email: string; setEmail: (value: string) => void; password: string; setPassword: (value: string) => void; mode: 'signin' | 'signup'; setMode: (value: 'signin' | 'signup') => void; message: string; onSubmit: (event: FormEvent) => void; theme: Theme; setTheme: (theme: Theme) => void }) {
  return <main className="auth-screen">
    <button className="icon-button theme-control" aria-label="Toggle colour theme" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}><AppIcon name={theme === 'light' ? 'moon' : 'sun'} /></button>
    <div className="auth-card">
      <div className="brand-mark large"><AppIcon name="check" /></div>
      <p className="eyebrow">DAYPLAN · YOUR DAILY SYSTEM</p>
      <h1>Small actions.<br />Clear progress.</h1>
      <p className="muted">A focused home for your routines and one-time tasks.</p>
      <form onSubmit={onSubmit} className="auth-form">
        <label htmlFor="email">Email address</label>
        <input id="email" type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={8} required placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} />
        <button className="primary-button" type="submit">{mode === 'signin' ? 'Sign in' : 'Create account'} <span>→</span></button>
      </form>
      {message && <p className="form-message" role="status">{message}</p>}
      <button className="auth-switch" type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        {mode === 'signin' ? 'New to DayPlan? Create a private account' : 'Already have an account? Sign in'}
      </button>
      <p className="fine-print">Private account access for your family. No email link required.</p>
    </div>
  </main>
}

function RoutineStarter({ userId }: { userId: string }) {
  const [name, setName] = useState('')
  const [search, setSearch] = useState('')
  const [routines, setRoutines] = useState<Array<{ id: string; name: string; color: string; sort_order: number; started_on: string; archived_at: string | null }>>([])
  const [completions, setCompletions] = useState<Array<{ id: string; routine_id: string; completed_on: string }>>([])
  const [message, setMessage] = useState('')
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState(dateKey(today))
  const week = useMemo(() => {
    const start = new Date(today); start.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7)
    return Array.from({ length: 7 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date })
  }, [weekOffset])
  const startKey = dateKey(week[0]); const endKey = dateKey(week[6])
  useEffect(() => { supabase?.from('routines').select('id,name,color,sort_order,started_on,archived_at').eq('user_id', userId).order('sort_order').then(({ data, error }) => { if (error) setMessage(error.message); else setRoutines((data ?? []) as typeof routines) }) }, [userId])
  useEffect(() => { supabase?.from('routine_completions').select('id,routine_id,completed_on').eq('user_id', userId).gte('completed_on', startKey).lte('completed_on', endKey).then(({ data, error }) => { if (error) setMessage(error.message); else setCompletions(data ?? []) }) }, [userId, startKey, endKey])
  async function addRoutine(event: FormEvent) {
    event.preventDefault(); const clean = name.trim(); if (!clean || !supabase) return
    const palette = ['#0d6e5d', '#4969d8', '#8b4cc8', '#db7d22', '#c5474e']
    const { data, error } = await supabase.from('routines').insert({ user_id: userId, name: clean, color: palette[routines.length % palette.length], sort_order: routines.length, started_on: dateKey(today) }).select('id,name,color,sort_order,started_on,archived_at').single()
    if (error) setMessage(error.message); else if (data) { setRoutines([...routines, data]); setName(''); setMessage('Routine added.') }
  }
  useEffect(() => { if (selectedDate < startKey || selectedDate > endKey) setSelectedDate(startKey) }, [startKey, endKey, selectedDate])
  async function toggle(routineId: string, date: string) {
    if (!supabase) return
    const existing = completions.find((item) => item.routine_id === routineId && item.completed_on === date)
    if (existing) { const { error } = await supabase.from('routine_completions').delete().eq('id', existing.id); if (error) return setMessage(error.message); setCompletions(completions.filter((item) => item.id !== existing.id)); setMessage('Completion removed. Counts updated.') }
    else { const { data, error } = await supabase.from('routine_completions').insert({ user_id: userId, routine_id: routineId, completed_on: date }).select('id,routine_id,completed_on').single(); if (error) return setMessage(error.message); if (data) { setCompletions([...completions, data]); setMessage('Completed.') } }
  }
  async function rename(routine: { id: string; name: string }) { const value = window.prompt('Rename routine', routine.name)?.trim(); if (!value || !supabase) return; const { error } = await supabase.from('routines').update({ name: value }).eq('id', routine.id); if (error) setMessage(error.message); else { setRoutines(routines.map((item) => item.id === routine.id ? { ...item, name: value } : item)); setMessage('Routine renamed.') } }
  const visible = routines.filter((routine) => routine.started_on <= endKey && (!routine.archived_at || routine.archived_at.slice(0, 10) >= startKey) && routine.name.toLowerCase().includes(search.toLowerCase()))
  const selected = new Date(`${selectedDate}T12:00:00`)
  return <>
    <div className="routine-page-heading"><div><p className="eyebrow">ROUTINES</p><h1>Plan your week.</h1><p>{visible.filter((routine) => completions.some((item) => item.routine_id === routine.id && item.completed_on === selectedDate)).length} of {visible.length} complete today</p></div><button className="today-button" onClick={() => { setWeekOffset(0); setSelectedDate(dateKey(today)) }}>Today</button></div>
    <section className="week-selector" aria-label="Choose a day">
      <div className="week-selector-top"><button aria-label="Previous week" onClick={() => setWeekOffset(weekOffset - 1)}><AppIcon name="arrow" /></button><span>{shortDate(week[0])} – {shortDate(week[6])}</span><button aria-label="Next week" className="next" onClick={() => setWeekOffset(weekOffset + 1)}><AppIcon name="arrow" /></button></div>
      <div className="day-strip">{week.map((day) => { const key = dateKey(day); return <button key={key} className={key === selectedDate ? 'selected' : ''} onClick={() => setSelectedDate(key)} aria-label={`Select ${shortDate(day)}`}><span>{dayLabel(day).slice(0, 1)}</span><strong>{day.getDate()}</strong></button> })}</div>
    </section>
    <section className="routine-list-card">
      <div className="routine-list-heading"><div><h2>{selectedDate === dateKey(today) ? 'Today’s routines' : selected.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h2><p>Tap a circle to mark it done.</p></div><span>{visible.length} total</span></div>
      <div className="search-bar routine-search"><input aria-label="Search routines" placeholder="Search routines" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      {visible.length === 0 ? <div className="empty-state"><div className="empty-icon"><AppIcon name="grid" /></div><h3>{search ? 'No matching routines' : 'Start your rhythm'}</h3><p>{search ? 'Try another routine name.' : 'Add as many routines as you need. They will all appear in this list.'}</p></div> : <div className="routine-list">{visible.map((routine) => { const row = completions.filter((item) => item.routine_id === routine.id).sort((a, b) => a.completed_on.localeCompare(b.completed_on)); const completedToday = row.some((item) => item.completed_on === selectedDate); const unavailable = selectedDate < routine.started_on; return <article className={`routine-list-row ${completedToday ? 'complete' : ''}`} key={routine.id}><button className={`routine-toggle ${completedToday ? 'checked' : ''}`} disabled={unavailable} onClick={() => toggle(routine.id, selectedDate)} aria-label={`${completedToday ? 'Reopen' : 'Complete'} ${routine.name}`}><AppIcon name="check" /></button><button className="routine-copy" onClick={() => rename(routine)}><strong>{routine.name}</strong><span>{completedToday ? 'Completed' : unavailable ? 'Starts later' : 'Not completed yet'}</span><div className="week-progress" aria-label={`${row.length} of 7 days complete this week`}>{week.map((day) => <i key={dateKey(day)} className={row.some((item) => item.completed_on === dateKey(day)) ? 'done' : ''} />)}</div></button><div className="routine-total"><strong>{row.length}</strong><span>/7</span></div></article> })}</div>}
      <form className="routine-add" onSubmit={addRoutine}><input aria-label="New routine name" placeholder="Add a new routine" value={name} onChange={(event) => setName(event.target.value)} /><button className="primary-button" type="submit"><AppIcon name="plus" /> Add</button></form>
      {message && <p className="form-message" role="status">{message}</p>}
    </section>
  </>
}

function TasksStarter({ userId }: { userId: string }) {
  const [title, setTitle] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [priority, setPriority] = useState<'none' | 'low' | 'medium' | 'high'>('none')
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; notes: string | null; completed_at: string | null; due_time: string | null; priority: 'none' | 'low' | 'medium' | 'high' }>>([])
  const [message, setMessage] = useState('')
  const [undo, setUndo] = useState<null | { label: string; run: () => void }>(null)
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(dateKey(today))
  const date = selectedDate
  useEffect(() => { supabase?.from('daily_tasks').select('id,title,notes,completed_at,due_time,priority').eq('user_id', userId).eq('task_date', date).is('archived_at', null).order('sort_order').then(({ data, error }) => { if (error) setMessage(error.message); else setTasks((data ?? []) as typeof tasks) }) }, [date, userId])
  async function addTask(event: FormEvent) {
    event.preventDefault(); const clean = title.trim(); if (!clean || !supabase) return
    const duplicate = tasks.find((task) => !task.completed_at && task.title.toLocaleLowerCase() === clean.toLocaleLowerCase())
    if (duplicate && !window.confirm('A matching pending task already exists. Add another anyway?')) return
    const { data, error } = await supabase.from('daily_tasks').insert({ user_id: userId, task_date: date, title: clean, due_time: dueTime || null, priority, sort_order: tasks.length }).select('id,title,notes,completed_at,due_time,priority').single()
    if (error) setMessage(error.message); else if (data) { setTasks([...tasks, data]); setTitle(''); setDueTime(''); setPriority('none'); setMessage('Task added.') }
  }
  async function toggleTask(task: typeof tasks[number]) { if (!supabase) return; const next = task.completed_at ? null : new Date().toISOString(); const { error } = await supabase.from('daily_tasks').update({ completed_at: next }).eq('id', task.id); if (error) setMessage(error.message); else { setTasks(tasks.map((item) => item.id === task.id ? { ...item, completed_at: next } : item)); setMessage(next ? 'Task completed.' : 'Task moved back to pending.'); setUndo({ label: next ? 'Completed' : 'Reopened', run: () => void toggleTask({ ...task, completed_at: next }) }) } }
  async function carryForward(task: typeof tasks[number]) { if (!supabase) return; const tomorrow = new Date(`${date}T12:00:00`); tomorrow.setDate(tomorrow.getDate() + 1); const nextDate = dateKey(tomorrow); const { data, error } = await supabase.from('daily_tasks').insert({ user_id: userId, task_date: nextDate, title: task.title, due_time: task.due_time, priority: task.priority, sort_order: 0, carried_from_id: task.id }).select('id').single(); if (error) setMessage(error.message); else if (data) setMessage(`Copied to ${shortDate(tomorrow)}.`) }
  async function editTask(task: typeof tasks[number]) { const value = window.prompt('Edit task', task.title)?.trim(); if (!value || !supabase) return; const note = window.prompt('Optional note', task.notes ?? '') ?? task.notes; const { error } = await supabase.from('daily_tasks').update({ title: value, notes: note || null }).eq('id', task.id); if (error) setMessage(error.message); else { setTasks(tasks.map((item) => item.id === task.id ? { ...item, title: value, notes: note || null } : item)); setMessage('Task updated.') } }
  async function archiveTask(task: typeof tasks[number]) { if (!window.confirm('Archive this task? It will remain searchable later.')) return; const client = supabase; if (!client) return; const archivedAt = new Date().toISOString(); const { error } = await client.from('daily_tasks').update({ archived_at: archivedAt }).eq('id', task.id); if (error) setMessage(error.message); else { setTasks(tasks.filter((item) => item.id !== task.id)); setMessage('Task archived.'); setUndo({ label: 'Archived', run: async () => { await client.from('daily_tasks').update({ archived_at: null }).eq('id', task.id); setTasks((current) => [...current, task]); setUndo(null) } }) } }
  const done = tasks.filter((task) => task.completed_at).length
  const filtered = tasks.filter((task) => task.title.toLowerCase().includes(search.toLowerCase()))
  const pending = filtered.filter((task) => !task.completed_at).sort((a, b) => (a.due_time ?? '99:99').localeCompare(b.due_time ?? '99:99'))
  const completed = filtered.filter((task) => task.completed_at)
  const selected = new Date(`${date}T12:00:00`)
  return <>
    <div className="page-heading"><div><p className="eyebrow">DAILY TASKS</p><h1>{date === dateKey(today) ? 'Today' : shortDate(selected)}</h1><p className="muted">{shortDate(selected)} · {done} of {tasks.length} completed</p></div><button className="today-button" onClick={() => setSelectedDate(dateKey(today))}>Today</button></div>
    <div className="week-nav"><button aria-label="Previous date" onClick={() => { const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() - 1); setSelectedDate(dateKey(next)) }}><AppIcon name="arrow" /></button><span>{selected.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span><button aria-label="Next date" className="next" onClick={() => { const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() + 1); setSelectedDate(dateKey(next)) }}><AppIcon name="arrow" /></button></div>
    <section className="module-card tasks-card">
      <form className="task-add" onSubmit={addTask}><input aria-label="New daily task" placeholder="What needs to get done?" value={title} onChange={(event) => setTitle(event.target.value)} /><button className="primary-button" type="submit"><AppIcon name="plus" /> Add</button></form>
      <div className="task-options"><select aria-label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}><option value="none">No priority</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select><input aria-label="Due time" type="time" value={dueTime} onChange={(event) => setDueTime(event.target.value)} /></div><div className="search-bar"><input aria-label="Search tasks on this date" placeholder="Search this day" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      {tasks.length === 0 ? <div className="empty-state"><div className="empty-icon"><AppIcon name="check" /></div><h3>A clear day ahead</h3><p>Add one-time tasks here. Completed tasks stay in your history.</p></div> : <div className="task-list"><div className="task-section-label">Pending · {pending.length}</div>{pending.map((task) => <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task)} onCarry={() => carryForward(task)} onEdit={() => editTask(task)} onArchive={() => archiveTask(task)} />)}{completed.length > 0 && <><div className="task-section-label">Completed · {completed.length}</div>{completed.map((task) => <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task)} onCarry={() => carryForward(task)} onEdit={() => editTask(task)} onArchive={() => archiveTask(task)} />)}</>}</div>}
      {message && <p className="form-message" role="status">{message}</p>}{undo && <button className="undo-bar" onClick={() => { undo.run(); setUndo(null) }}>{undo.label} · Undo</button>}
    </section>
  </>
}

function TaskRow({ task, onToggle, onCarry, onEdit, onArchive }: { task: { title: string; notes: string | null; completed_at: string | null; due_time: string | null; priority: string }; onToggle: () => void; onCarry: () => void; onEdit: () => void; onArchive: () => void }) {
  return <div className={`task-row ${task.completed_at ? 'is-completed' : ''}`}><button className={`check-control ${task.completed_at ? 'checked' : ''}`} onClick={onToggle} aria-label={`${task.completed_at ? 'Reopen' : 'Complete'} ${task.title}`}><AppIcon name="check" /></button><div className="task-copy"><button className="task-title" onClick={onEdit}>{task.title}</button>{(task.due_time || task.priority !== 'none' || task.notes) && <span>{task.due_time && new Date(`2000-01-01T${task.due_time}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}{task.due_time && task.priority !== 'none' ? ' · ' : ''}{task.priority !== 'none' ? `${task.priority} priority` : ''}{task.notes ? `${task.due_time || task.priority !== 'none' ? ' · ' : ''}note` : ''}</span>}</div>{!task.completed_at && <button className="carry-button" onClick={onCarry} aria-label={`Carry ${task.title} forward`}>Tomorrow</button>}<button className="archive-button" onClick={onArchive} aria-label={`Archive ${task.title}`}>×</button></div>
}
