import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

type View = 'routines' | 'tasks' | 'account'
type Theme = 'light' | 'dark'
type RoutineMode = 'today' | 'week'
type Routine = { id: string; name: string; color: string; sort_order: number; started_on: string; archived_at: string | null }
type Completion = { id: string; routine_id: string; completed_on: string }
type Task = { id: string; title: string; notes: string | null; completed_at: string | null; due_time: string | null; priority: 'none' | 'low' | 'medium' | 'high'; sort_order: number }
type UndoAction = { label: string; run: () => Promise<void> | void }

const today = new Date()
const routinePalette = ['#117865', '#3d68d8', '#8b4bc1', '#dc7923', '#c54850', '#237d9b', '#a6602b', '#6c6f78']
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const dateFromKey = (key: string) => new Date(`${key}T12:00:00`)
const shortDate = (date: Date) => date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
const fullDate = (date: Date) => date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

function AppIcon({ name }: { name: 'grid' | 'check' | 'plus' | 'sun' | 'moon' | 'arrow' | 'user' | 'more' | 'close' | 'calendar' | 'list' | 'archive' | 'trash' }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    check: <path d="m5 12 4.2 4L19.5 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    moon: <path d="M20.2 15.5A8.4 8.4 0 0 1 8.5 3.8 8.5 8.5 0 1 0 20.2 15.5Z" />,
    arrow: <path d="m14 6-6 6 6 6" />,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" /></>,
    archive: <><path d="M4 7h16v13H4zM3 3h18v4H3zM9 11h6" /></>,
    trash: <><path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14" /></>,
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
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('routine-theme', theme)
  }, [theme])

  async function authenticate(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return setAuthMessage('DayPlan is not connected yet.')
    if (authPassword.length < 8) return setAuthMessage('Use a password with at least 8 characters.')
    const result = authMode === 'signin'
      ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
      : await supabase.auth.signUp({ email: authEmail, password: authPassword })
    if (result.error) return setAuthMessage(result.error.message)
    setAuthMessage('')
  }

  async function signOut() {
    await supabase?.auth.signOut()
    setSession(null)
    setAuthPassword('')
  }

  if (!session) return <AuthScreen email={authEmail} setEmail={setAuthEmail} password={authPassword} setPassword={setAuthPassword} mode={authMode} setMode={setAuthMode} message={authMessage} onSubmit={authenticate} theme={theme} setTheme={setTheme} />

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><AppIcon name="check" /></span><span>DayPlan</span></div>
      <button className="icon-button" aria-label="Toggle colour theme" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}><AppIcon name={theme === 'light' ? 'moon' : 'sun'} /></button>
    </header>
    <section className="page-content">
      {view === 'routines' ? <RoutineTracker userId={session.user.id} /> : view === 'tasks' ? <DailyTasks userId={session.user.id} /> : <AccountScreen email={session.user.email ?? ''} onSignOut={signOut} />}
    </section>
    <nav className="bottom-nav" aria-label="Primary navigation">
      <button className={view === 'routines' ? 'active' : ''} onClick={() => setView('routines')}><AppIcon name="grid" /><span>Routines</span></button>
      <button className={view === 'tasks' ? 'active' : ''} onClick={() => setView('tasks')}><AppIcon name="check" /><span>Daily Tasks</span></button>
      <button className={view === 'account' ? 'active' : ''} onClick={() => setView('account')}><AppIcon name="user" /><span>Account</span></button>
    </nav>
  </main>
}

function AuthScreen({ email, setEmail, password, setPassword, mode, setMode, message, onSubmit, theme, setTheme }: { email: string; setEmail: (value: string) => void; password: string; setPassword: (value: string) => void; mode: 'signin' | 'signup'; setMode: (value: 'signin' | 'signup') => void; message: string; onSubmit: (event: FormEvent) => void; theme: Theme; setTheme: (theme: Theme) => void }) {
  return <main className="auth-screen">
    <button className="icon-button theme-control" aria-label="Toggle colour theme" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}><AppIcon name={theme === 'light' ? 'moon' : 'sun'} /></button>
    <div className="auth-card">
      <div className="brand-mark large"><AppIcon name="check" /></div>
      <p className="eyebrow">DAYPLAN · PRIVATE FAMILY PLANNER</p>
      <h1>Small actions.<br />Clear progress.</h1>
      <p className="muted">Routines and one-time tasks, organised without the clutter.</p>
      <form onSubmit={onSubmit} className="auth-form">
        <label htmlFor="email">Email address</label>
        <input id="email" type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={8} required placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} />
        <button className="primary-button" type="submit">{mode === 'signin' ? 'Sign in' : 'Create account'} <span>→</span></button>
      </form>
      {message && <p className="form-message" role="status">{message}</p>}
      <button className="auth-switch" type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'Create a private account' : 'Already have an account? Sign in'}</button>
    </div>
  </main>
}

function RoutineTracker({ userId }: { userId: string }) {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [mode, setMode] = useState<RoutineMode>('today')
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState(dateKey(today))
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [editor, setEditor] = useState<Routine | 'new' | null>(null)
  const [message, setMessage] = useState('')
  const [undo, setUndo] = useState<UndoAction | null>(null)

  const week = useMemo(() => {
    const start = new Date(today)
    start.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7)
    return Array.from({ length: 7 }, (_, index) => {
      const value = new Date(start)
      value.setDate(start.getDate() + index)
      return value
    })
  }, [weekOffset])
  const startKey = dateKey(week[0])
  const endKey = dateKey(week[6])
  const selected = dateFromKey(selectedDate)

  useEffect(() => {
    supabase?.from('routines').select('id,name,color,sort_order,started_on,archived_at').eq('user_id', userId).order('sort_order').then(({ data, error }) => {
      if (error) setMessage(error.message)
      else setRoutines((data ?? []) as Routine[])
    })
  }, [userId])

  useEffect(() => {
    supabase?.from('routine_completions').select('id,routine_id,completed_on').eq('user_id', userId).gte('completed_on', startKey).lte('completed_on', endKey).then(({ data, error }) => {
      if (error) setMessage(error.message)
      else setCompletions((data ?? []) as Completion[])
    })
  }, [userId, startKey, endKey])

  useEffect(() => {
    if (selectedDate < startKey || selectedDate > endKey) setSelectedDate(startKey)
  }, [selectedDate, startKey, endKey])

  const matching = routines
    .filter((routine) => routine.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((routine) => showArchived ? Boolean(routine.archived_at) : routine.started_on <= endKey && (!routine.archived_at || routine.archived_at.slice(0, 10) >= startKey))
  const active = matching.filter((routine) => !routine.archived_at)
  const completedSelected = active.filter((routine) => completions.some((item) => item.routine_id === routine.id && item.completed_on === selectedDate)).length

  const rowFor = (routineId: string) => completions.filter((item) => item.routine_id === routineId).sort((a, b) => a.completed_on.localeCompare(b.completed_on))
  const runningNumber = (routineId: string, date: string) => {
    const row = rowFor(routineId)
    const index = row.findIndex((item) => item.completed_on === date)
    return index < 0 ? null : index + 1
  }

  async function toggle(routine: Routine, date: string) {
    if (!supabase || routine.archived_at) return
    const client = supabase
    const existing = completions.find((item) => item.routine_id === routine.id && item.completed_on === date)
    if (existing) {
      const { error } = await client.from('routine_completions').delete().eq('id', existing.id)
      if (error) return setMessage(error.message)
      setCompletions((current) => current.filter((item) => item.id !== existing.id))
      setMessage('')
      setUndo({
        label: `${routine.name} reopened`,
        run: async () => {
          const { data } = await client.from('routine_completions').insert({ user_id: userId, routine_id: routine.id, completed_on: date }).select('id,routine_id,completed_on').single()
          if (data) setCompletions((current) => [...current, data as Completion])
        },
      })
      return
    }
    const { data, error } = await client.from('routine_completions').insert({ user_id: userId, routine_id: routine.id, completed_on: date }).select('id,routine_id,completed_on').single()
    if (error) return setMessage(error.message)
    if (data) {
      const added = data as Completion
      setCompletions((current) => [...current, added])
      setMessage('')
      setUndo({
        label: `${routine.name} completed`,
        run: async () => {
          await client.from('routine_completions').delete().eq('id', added.id)
          setCompletions((current) => current.filter((item) => item.id !== added.id))
        },
      })
    }
  }

  async function saveRoutine(name: string, color: string) {
    if (!supabase) return
    if (editor === 'new') {
      const nextOrder = Math.max(-1, ...routines.map((routine) => routine.sort_order)) + 1
      const { data, error } = await supabase.from('routines').insert({ user_id: userId, name, color, sort_order: nextOrder, started_on: dateKey(today) }).select('id,name,color,sort_order,started_on,archived_at').single()
      if (error) return setMessage(error.message)
      if (data) setRoutines((current) => [...current, data as Routine])
    } else if (editor) {
      const { error } = await supabase.from('routines').update({ name, color }).eq('id', editor.id)
      if (error) return setMessage(error.message)
      setRoutines((current) => current.map((routine) => routine.id === editor.id ? { ...routine, name, color } : routine))
    }
    setEditor(null)
  }

  async function moveRoutine(routine: Routine, direction: -1 | 1) {
    if (!supabase) return
    const ordered = routines.filter((item) => !item.archived_at).sort((a, b) => a.sort_order - b.sort_order)
    const index = ordered.findIndex((item) => item.id === routine.id)
    const target = ordered[index + direction]
    if (!target) return
    await Promise.all([
      supabase.from('routines').update({ sort_order: target.sort_order }).eq('id', routine.id),
      supabase.from('routines').update({ sort_order: routine.sort_order }).eq('id', target.id),
    ])
    setRoutines((current) => current.map((item) => item.id === routine.id ? { ...item, sort_order: target.sort_order } : item.id === target.id ? { ...item, sort_order: routine.sort_order } : item).sort((a, b) => a.sort_order - b.sort_order))
  }

  async function toggleArchive(routine: Routine) {
    if (!supabase) return
    const archived_at = routine.archived_at ? null : new Date().toISOString()
    const { error } = await supabase.from('routines').update({ archived_at }).eq('id', routine.id)
    if (error) return setMessage(error.message)
    setRoutines((current) => current.map((item) => item.id === routine.id ? { ...item, archived_at } : item))
    setEditor(null)
  }

  async function deleteRoutine(routine: Routine) {
    if (!supabase || !window.confirm(`Delete “${routine.name}” and all of its completion history permanently?`)) return
    const { error } = await supabase.from('routines').delete().eq('id', routine.id)
    if (error) return setMessage(error.message)
    setRoutines((current) => current.filter((item) => item.id !== routine.id))
    setCompletions((current) => current.filter((item) => item.routine_id !== routine.id))
    setEditor(null)
  }

  return <>
    <section className="screen-heading">
      <div><p className="eyebrow">ROUTINES</p><h1>{mode === 'today' ? (selectedDate === dateKey(today) ? 'Today' : selected.toLocaleDateString(undefined, { weekday: 'long' })) : 'Your week'}</h1><p>{mode === 'today' ? `${completedSelected} of ${active.length} complete · ${shortDate(selected)}` : `${shortDate(week[0])} – ${shortDate(week[6])}`}</p></div>
      <button className="add-circle" onClick={() => setEditor('new')} aria-label="Add routine"><AppIcon name="plus" /></button>
    </section>

    <div className="mode-switch" aria-label="Routine view">
      <button className={mode === 'today' ? 'active' : ''} onClick={() => setMode('today')}><AppIcon name="list" />Today</button>
      <button className={mode === 'week' ? 'active' : ''} onClick={() => setMode('week')}><AppIcon name="calendar" />Week</button>
    </div>

    <WeekNavigator week={week} selectedDate={selectedDate} onSelect={(date) => { setSelectedDate(date); setMode('today') }} onPrevious={() => setWeekOffset((value) => value - 1)} onNext={() => setWeekOffset((value) => value + 1)} onToday={() => { setWeekOffset(0); setSelectedDate(dateKey(today)) }} />

    <div className="tracker-tools">
      <label className="search-field"><span aria-hidden>⌕</span><input aria-label="Search routines" placeholder="Search routines" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <button className={showArchived ? 'active' : ''} onClick={() => setShowArchived((value) => !value)}><AppIcon name="archive" /><span>{showArchived ? 'Archived' : 'Archive'}</span></button>
    </div>

    {matching.length === 0 ? <EmptyState title={showArchived ? 'No archived routines' : search ? 'No matching routines' : 'Add your first routine'} copy={showArchived ? 'Archived routines stay here until you restore or delete them.' : 'Create as many routines as you need. Nothing is capped.'} action={!showArchived && !search ? <button className="primary-button" onClick={() => setEditor('new')}><AppIcon name="plus" />Add routine</button> : null} /> :
      mode === 'today'
        ? <div className="today-routine-list">{matching.map((routine) => {
          const count = runningNumber(routine.id, selectedDate)
          const total = rowFor(routine.id).length
          const unavailable = Boolean(routine.archived_at)
          return <article className={`today-routine-card ${count ? 'complete' : ''} ${routine.archived_at ? 'archived' : ''}`} key={routine.id} style={{ '--routine-color': routine.color } as React.CSSProperties}>
            <button className="today-check" disabled={unavailable} onClick={() => toggle(routine, selectedDate)} aria-label={`${count ? 'Remove completion for' : 'Complete'} ${routine.name}`}>{count ?? <AppIcon name="check" />}</button>
            <div className="today-routine-copy"><strong>{routine.name}</strong><span>{routine.archived_at ? 'Archived' : count ? `Completion ${count} this week` : 'Tap the circle when done'}</span><div className="mini-week">{week.map((day) => <i key={dateKey(day)} className={runningNumber(routine.id, dateKey(day)) ? 'done' : ''} />)}</div></div>
            <div className="routine-score"><strong>{total}</strong><span>/ 7</span></div>
            <button className="more-button" onClick={() => setEditor(routine)} aria-label={`Manage ${routine.name}`}><AppIcon name="more" /></button>
          </article>
        })}</div>
        : <div className="week-board">{matching.map((routine) => {
          const total = rowFor(routine.id).length
          return <article className={`week-routine-card ${routine.archived_at ? 'archived' : ''}`} key={routine.id} style={{ '--routine-color': routine.color } as React.CSSProperties}>
            <header><div><i /><strong>{routine.name}</strong></div><span><b>{total}</b> / 7</span><button className="more-button" onClick={() => setEditor(routine)} aria-label={`Manage ${routine.name}`}><AppIcon name="more" /></button></header>
            <div className="week-cells">{week.map((day) => {
              const key = dateKey(day)
              const count = runningNumber(routine.id, key)
              const unavailable = Boolean(routine.archived_at)
              return <button key={key} className={`${count ? 'done' : ''} ${key === selectedDate ? 'selected' : ''}`} disabled={unavailable} onClick={() => toggle(routine, key)} aria-label={`${count ? 'Remove' : 'Complete'} ${routine.name} on ${fullDate(day)}`}>
                <span>{day.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1)}</span><b>{day.getDate()}</b><em>{count ?? ''}</em>
              </button>
            })}</div>
          </article>
        })}</div>
    }

    {message && <p className="inline-error" role="status">{message}</p>}
    {undo && <UndoToast action={undo} onClose={() => setUndo(null)} />}
    {editor && <RoutineEditor key={editor === 'new' ? 'new' : editor.id} routine={editor === 'new' ? null : editor} onClose={() => setEditor(null)} onSave={saveRoutine} onMove={moveRoutine} onArchive={toggleArchive} onDelete={deleteRoutine} />}
  </>
}

function WeekNavigator({ week, selectedDate, onSelect, onPrevious, onNext, onToday }: { week: Date[]; selectedDate: string; onSelect: (date: string) => void; onPrevious: () => void; onNext: () => void; onToday: () => void }) {
  const containsToday = week.some((day) => dateKey(day) === dateKey(today))
  return <section className="week-navigator">
    <header><button aria-label="Previous week" onClick={onPrevious}><AppIcon name="arrow" /></button><div><strong>{week[0].toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong><span>Week of {shortDate(week[0])}</span></div><button className="next" aria-label="Next week" onClick={onNext}><AppIcon name="arrow" /></button></header>
    <div className="date-rail">{week.map((day) => {
      const key = dateKey(day)
      return <button key={key} className={`${key === selectedDate ? 'selected' : ''} ${key === dateKey(today) ? 'today' : ''}`} onClick={() => onSelect(key)}><span>{day.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1)}</span><strong>{day.getDate()}</strong></button>
    })}</div>
    {!containsToday && <button className="return-today" onClick={onToday}>Return to today</button>}
  </section>
}

function RoutineEditor({ routine, onClose, onSave, onMove, onArchive, onDelete }: { routine: Routine | null; onClose: () => void; onSave: (name: string, color: string) => Promise<void>; onMove: (routine: Routine, direction: -1 | 1) => Promise<void>; onArchive: (routine: Routine) => Promise<void>; onDelete: (routine: Routine) => Promise<void> }) {
  const [name, setName] = useState(routine?.name ?? '')
  const [color, setColor] = useState(routine?.color ?? routinePalette[0])
  return <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="routine-editor-title">
      <div className="sheet-handle" />
      <header><div><p className="eyebrow">{routine ? 'MANAGE ROUTINE' : 'NEW ROUTINE'}</p><h2 id="routine-editor-title">{routine ? 'Routine settings' : 'Add to your plan'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><AppIcon name="close" /></button></header>
      <form onSubmit={(event) => { event.preventDefault(); const clean = name.trim(); if (clean) void onSave(clean, color) }}>
        <label>Routine name<input autoFocus maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Morning walk" /></label>
        <fieldset><legend>Routine colour</legend><div className="color-palette">{routinePalette.map((value) => <button type="button" key={value} className={value === color ? 'selected' : ''} style={{ backgroundColor: value }} onClick={() => setColor(value)} aria-label={`Choose ${value}`} />)}</div></fieldset>
        <button className="primary-button sheet-save" type="submit">{routine ? 'Save changes' : 'Add routine'}</button>
      </form>
      {routine && <div className="sheet-actions">
        <div className="order-actions"><button onClick={() => onMove(routine, -1)}>Move earlier</button><button onClick={() => onMove(routine, 1)}>Move later</button></div>
        <button onClick={() => onArchive(routine)}><AppIcon name="archive" />{routine.archived_at ? 'Restore routine' : 'Archive routine'}</button>
        <button className="danger" onClick={() => onDelete(routine)}><AppIcon name="trash" />Delete permanently</button>
      </div>}
    </section>
  </div>
}

function DailyTasks({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [title, setTitle] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('none')
  const [selectedDate, setSelectedDate] = useState(dateKey(today))
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [undo, setUndo] = useState<UndoAction | null>(null)
  const [editor, setEditor] = useState<Task | null>(null)
  const date = dateFromKey(selectedDate)

  useEffect(() => {
    supabase?.from('daily_tasks').select('id,title,notes,completed_at,due_time,priority,sort_order').eq('user_id', userId).eq('task_date', selectedDate).is('archived_at', null).order('sort_order').then(({ data, error }) => {
      if (error) setMessage(error.message)
      else setTasks((data ?? []) as Task[])
    })
  }, [selectedDate, userId])

  async function addTask(event: FormEvent) {
    event.preventDefault()
    const clean = title.trim()
    if (!clean || !supabase) return
    if (tasks.some((task) => !task.completed_at && task.title.toLowerCase() === clean.toLowerCase()) && !window.confirm('A matching pending task already exists. Add another?')) return
    const { data, error } = await supabase.from('daily_tasks').insert({ user_id: userId, task_date: selectedDate, title: clean, due_time: dueTime || null, priority, sort_order: tasks.length }).select('id,title,notes,completed_at,due_time,priority,sort_order').single()
    if (error) return setMessage(error.message)
    if (data) setTasks((current) => [...current, data as Task])
    setTitle(''); setDueTime(''); setPriority('none')
  }

  async function toggleTask(task: Task) {
    if (!supabase) return
    const client = supabase
    const completed_at = task.completed_at ? null : new Date().toISOString()
    const { error } = await client.from('daily_tasks').update({ completed_at }).eq('id', task.id)
    if (error) return setMessage(error.message)
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed_at } : item))
    setUndo({ label: completed_at ? `${task.title} completed` : `${task.title} reopened`, run: async () => {
      await client.from('daily_tasks').update({ completed_at: task.completed_at }).eq('id', task.id)
      setTasks((current) => current.map((item) => item.id === task.id ? task : item))
    } })
  }

  async function carryForward(task: Task) {
    if (!supabase) return
    const tomorrow = new Date(date); tomorrow.setDate(tomorrow.getDate() + 1)
    const { error } = await supabase.from('daily_tasks').insert({ user_id: userId, task_date: dateKey(tomorrow), title: task.title, notes: task.notes, due_time: task.due_time, priority: task.priority, sort_order: 0, carried_from_id: task.id })
    setMessage(error ? error.message : `Copied to ${fullDate(tomorrow)}.`)
  }

  async function saveTask(task: Task, values: Pick<Task, 'title' | 'notes' | 'due_time' | 'priority'>) {
    if (!supabase) return
    const { error } = await supabase.from('daily_tasks').update(values).eq('id', task.id)
    if (error) return setMessage(error.message)
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, ...values } : item))
    setEditor(null)
  }

  async function archiveTask(task: Task) {
    if (!supabase || !window.confirm(`Archive “${task.title}”?`)) return
    const { error } = await supabase.from('daily_tasks').update({ archived_at: new Date().toISOString() }).eq('id', task.id)
    if (error) return setMessage(error.message)
    setTasks((current) => current.filter((item) => item.id !== task.id))
    setEditor(null)
  }

  const filtered = tasks.filter((task) => task.title.toLowerCase().includes(search.toLowerCase()))
  const pending = filtered.filter((task) => !task.completed_at).sort((a, b) => (a.due_time ?? '99:99').localeCompare(b.due_time ?? '99:99'))
  const completed = filtered.filter((task) => task.completed_at)
  const done = tasks.filter((task) => task.completed_at).length

  return <>
    <section className="screen-heading"><div><p className="eyebrow">DAILY TASKS</p><h1>{selectedDate === dateKey(today) ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'long' })}</h1><p>{done} of {tasks.length} complete · {shortDate(date)}</p></div></section>
    <TaskDateNavigator date={date} onPrevious={() => { const next = new Date(date); next.setDate(next.getDate() - 1); setSelectedDate(dateKey(next)) }} onNext={() => { const next = new Date(date); next.setDate(next.getDate() + 1); setSelectedDate(dateKey(next)) }} onToday={() => setSelectedDate(dateKey(today))} />
    <section className="task-composer">
      <form onSubmit={addTask}><input aria-label="New daily task" placeholder="What needs to get done?" value={title} onChange={(event) => setTitle(event.target.value)} /><button className="primary-button" type="submit"><AppIcon name="plus" />Add</button></form>
      <div><select aria-label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as Task['priority'])}><option value="none">No priority</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select><input aria-label="Due time" type="time" value={dueTime} onChange={(event) => setDueTime(event.target.value)} /></div>
    </section>
    <label className="search-field task-search"><span aria-hidden>⌕</span><input aria-label="Search tasks" placeholder="Search this day" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    {tasks.length === 0 ? <EmptyState title="A clear day ahead" copy="Add a one-time task above. Routines stay in their own tab." action={null} /> : <section className="task-board">
      <TaskSection title="Pending" tasks={pending} onToggle={toggleTask} onCarry={carryForward} onEdit={setEditor} />
      {completed.length > 0 && <TaskSection title="Completed" tasks={completed} onToggle={toggleTask} onCarry={carryForward} onEdit={setEditor} />}
    </section>}
    {message && <p className="inline-error" role="status">{message}</p>}
    {undo && <UndoToast action={undo} onClose={() => setUndo(null)} />}
    {editor && <TaskEditor key={editor.id} task={editor} onClose={() => setEditor(null)} onSave={saveTask} onArchive={archiveTask} />}
  </>
}

function TaskDateNavigator({ date, onPrevious, onNext, onToday }: { date: Date; onPrevious: () => void; onNext: () => void; onToday: () => void }) {
  return <div className="task-date-nav"><button aria-label="Previous day" onClick={onPrevious}><AppIcon name="arrow" /></button><button className="date-copy" onClick={onToday}><strong>{fullDate(date)}</strong><span>{dateKey(date) === dateKey(today) ? 'Today' : 'Tap to return to today'}</span></button><button className="next" aria-label="Next day" onClick={onNext}><AppIcon name="arrow" /></button></div>
}

function TaskSection({ title, tasks, onToggle, onCarry, onEdit }: { title: string; tasks: Task[]; onToggle: (task: Task) => void; onCarry: (task: Task) => void; onEdit: (task: Task) => void }) {
  return <div className="task-section"><header><strong>{title}</strong><span>{tasks.length}</span></header>{tasks.map((task) => <article className={`task-card ${task.completed_at ? 'complete' : ''}`} key={task.id}>
    <button className="task-check" onClick={() => onToggle(task)} aria-label={`${task.completed_at ? 'Reopen' : 'Complete'} ${task.title}`}><AppIcon name="check" /></button>
    <div><strong>{task.title}</strong>{(task.due_time || task.priority !== 'none' || task.notes) && <span>{task.due_time ? new Date(`2000-01-01T${task.due_time}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : ''}{task.due_time && task.priority !== 'none' ? ' · ' : ''}{task.priority !== 'none' ? `${task.priority} priority` : ''}{task.notes ? `${task.due_time || task.priority !== 'none' ? ' · ' : ''}note` : ''}</span>}</div>
    {!task.completed_at && <button className="tomorrow-button" onClick={() => onCarry(task)}>Tomorrow</button>}
    <button className="more-button" onClick={() => onEdit(task)} aria-label={`Manage ${task.title}`}><AppIcon name="more" /></button>
  </article>)}</div>
}

function TaskEditor({ task, onClose, onSave, onArchive }: { task: Task; onClose: () => void; onSave: (task: Task, values: Pick<Task, 'title' | 'notes' | 'due_time' | 'priority'>) => Promise<void>; onArchive: (task: Task) => Promise<void> }) {
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes ?? '')
  const [dueTime, setDueTime] = useState(task.due_time?.slice(0, 5) ?? '')
  const [priority, setPriority] = useState(task.priority)
  return <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="task-editor-title">
      <div className="sheet-handle" /><header><div><p className="eyebrow">TASK DETAILS</p><h2 id="task-editor-title">Edit task</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><AppIcon name="close" /></button></header>
      <form onSubmit={(event) => { event.preventDefault(); const clean = title.trim(); if (clean) void onSave(task, { title: clean, notes: notes.trim() || null, due_time: dueTime || null, priority }) }}>
        <label>Task name<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note" /></label>
        <div className="field-pair"><label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value as Task['priority'])}><option value="none">None</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label><label>Due time<input type="time" value={dueTime} onChange={(event) => setDueTime(event.target.value)} /></label></div>
        <button className="primary-button sheet-save" type="submit">Save changes</button>
      </form>
      <div className="sheet-actions"><button onClick={() => onArchive(task)}><AppIcon name="archive" />Archive task</button></div>
    </section>
  </div>
}

function AccountScreen({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return <section className="account-screen"><p className="eyebrow">ACCOUNT</p><h1>Your DayPlan</h1><div className="account-card"><div className="account-avatar"><AppIcon name="user" /></div><div><strong>Signed in as</strong><p>{email}</p></div></div><button className="sign-out-primary" onClick={onSignOut}>Sign out of DayPlan</button><p className="account-help">Your routines and tasks stay saved in your private account.</p></section>
}

function EmptyState({ title, copy, action }: { title: string; copy: string; action: React.ReactNode }) {
  return <section className="empty-state"><div className="empty-icon"><AppIcon name="check" /></div><h2>{title}</h2><p>{copy}</p>{action}</section>
}

function UndoToast({ action, onClose }: { action: UndoAction; onClose: () => void }) {
  return <div className="undo-toast" role="status"><span>{action.label}</span><button onClick={() => { void action.run(); onClose() }}>Undo</button><button className="close" onClick={onClose} aria-label="Dismiss"><AppIcon name="close" /></button></div>
}
