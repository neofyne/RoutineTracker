import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

type View = 'routines' | 'tasks' | 'stats' | 'account'
type Theme = 'light' | 'dark'
type RoutineMode = 'today' | 'week'
type Routine = { id: string; name: string; color: string; sort_order: number; started_on: string; archived_at: string | null }
type Completion = { id: string; routine_id: string; completed_on: string }
type Task = { id: string; task_date: string; title: string; notes: string | null; completed_at: string | null; due_time: string | null; priority: 'none' | 'low' | 'medium' | 'high'; sort_order: number }
type UndoAction = { label: string; run: () => Promise<void> | void }

const today = new Date()
const routinePalette = ['#117865', '#3d68d8', '#8b4bc1', '#dc7923', '#c54850', '#237d9b', '#a6602b', '#6c6f78']
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const dateFromKey = (key: string) => new Date(`${key}T12:00:00`)
const offsetDateKey = (key: string, days: number) => { const date = dateFromKey(key); date.setDate(date.getDate() + days); return dateKey(date) }
const shortDate = (date: Date) => date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
const fullDate = (date: Date) => date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
const taskFields = 'id,task_date,title,notes,completed_at,due_time,priority,sort_order'
const dailyTaskCache = new Map<string, Task[]>()
const validViews: View[] = ['routines', 'tasks', 'stats', 'account']
let feedbackAudioContext: AudioContext | null = null

function prepareFeedbackSound(): Promise<AudioContext | null> {
  try {
    const AudioContextClass = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return Promise.resolve(null)
    feedbackAudioContext ??= new AudioContextClass()
    if (feedbackAudioContext.state === 'running') return Promise.resolve(feedbackAudioContext)
    return feedbackAudioContext.resume().then(() => feedbackAudioContext).catch(() => null)
  } catch {
    // Audio feedback is optional; the tracker remains fully usable when unavailable.
    return Promise.resolve(null)
  }
}

function playSuccessSound(context: AudioContext | null) {
  try {
    if (!context || context.state !== 'running') return
    const start = context.currentTime
    ;[523.25, 659.25].forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const noteStart = start + index * 0.11
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, noteStart)
      gain.gain.setValueAtTime(0.0001, noteStart)
      gain.gain.exponentialRampToValueAtTime(0.09, noteStart + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.2)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(noteStart)
      oscillator.stop(noteStart + 0.22)
    })
  } catch {
    // Never let optional feedback interfere with a completed action.
  }
}

const isView = (value: string | null): value is View => Boolean(value && validViews.includes(value as View))
const isDateKey = (value: string | null): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(dateFromKey(value).getTime()))
const initialView = (): View => {
  if (typeof window === 'undefined') return 'routines'
  const queryView = new URL(window.location.href).searchParams.get('view')
  const savedView = window.localStorage.getItem('dayplan-view')
  return isView(queryView) ? queryView : isView(savedView) ? savedView : 'routines'
}
const initialTaskDate = () => {
  if (typeof window === 'undefined') return dateKey(today)
  const queryDate = new URL(window.location.href).searchParams.get('date')
  const savedDate = window.localStorage.getItem('dayplan-task-date')
  return isDateKey(queryDate) ? queryDate : isDateKey(savedDate) ? savedDate : dateKey(today)
}

function AppIcon({ name }: { name: 'grid' | 'check' | 'plus' | 'sun' | 'moon' | 'arrow' | 'user' | 'more' | 'close' | 'calendar' | 'list' | 'archive' | 'trash' | 'grip' | 'chart' }) {
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
    grip: <><circle cx="8" cy="6" r="1.25" fill="currentColor" stroke="none" /><circle cx="16" cy="6" r="1.25" fill="currentColor" stroke="none" /><circle cx="8" cy="12" r="1.25" fill="currentColor" stroke="none" /><circle cx="16" cy="12" r="1.25" fill="currentColor" stroke="none" /><circle cx="8" cy="18" r="1.25" fill="currentColor" stroke="none" /><circle cx="16" cy="18" r="1.25" fill="currentColor" stroke="none" /></>,
    chart: <><path d="M4 19V5M4 19h16" /><path d="m7 15 3-4 3 2 5-7" /></>,
  }
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>
}

export function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [view, setView] = useState<View>(initialView)
  const [taskDate, setTaskDate] = useState(initialTaskDate)
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

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('view', view)
    url.searchParams.set('date', taskDate)
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    window.localStorage.setItem('dayplan-view', view)
    window.localStorage.setItem('dayplan-task-date', taskDate)
  }, [])

  useEffect(() => {
    const restoreNavigation = () => {
      const url = new URL(window.location.href)
      const nextView = url.searchParams.get('view')
      const nextDate = url.searchParams.get('date')
      if (isView(nextView)) setView(nextView)
      if (isDateKey(nextDate)) setTaskDate(nextDate)
    }
    window.addEventListener('popstate', restoreNavigation)
    return () => window.removeEventListener('popstate', restoreNavigation)
  }, [])

  function writeNavigation(nextView: View, nextDate: string, replace = false) {
    const url = new URL(window.location.href)
    url.searchParams.set('view', nextView)
    url.searchParams.set('date', nextDate)
    window.history[replace ? 'replaceState' : 'pushState'](null, '', `${url.pathname}${url.search}${url.hash}`)
    window.localStorage.setItem('dayplan-view', nextView)
    window.localStorage.setItem('dayplan-task-date', nextDate)
  }

  function selectView(nextView: View) {
    if (nextView === view) return
    setView(nextView)
    writeNavigation(nextView, taskDate)
  }

  function selectTaskDate(nextDate: string) {
    if (nextDate === taskDate) return
    setTaskDate(nextDate)
    writeNavigation('tasks', nextDate)
  }

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
      {view === 'routines' ? <RoutineTracker userId={session.user.id} /> : view === 'tasks' ? <DailyTasks key={`${session.user.id}:${taskDate}`} userId={session.user.id} selectedDate={taskDate} onDateChange={selectTaskDate} /> : view === 'stats' ? <Statistics userId={session.user.id} /> : <AccountScreen email={session.user.email ?? ''} onSignOut={signOut} />}
    </section>
    <nav className="bottom-nav" aria-label="Primary navigation">
      <button className={view === 'routines' ? 'active' : ''} onClick={() => selectView('routines')}><AppIcon name="grid" /><span>Routines</span></button>
      <button className={view === 'tasks' ? 'active' : ''} onClick={() => selectView('tasks')}><AppIcon name="check" /><span>Daily Tasks</span></button>
      <button className={view === 'stats' ? 'active' : ''} onClick={() => selectView('stats')}><AppIcon name="chart" /><span>Stats</span></button>
      <button className={view === 'account' ? 'active' : ''} onClick={() => selectView('account')}><AppIcon name="user" /><span>Account</span></button>
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
  const [reorderMode, setReorderMode] = useState(false)
  const [reorderDraft, setReorderDraft] = useState<string[]>([])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [reorderSaving, setReorderSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [undo, setUndo] = useState<UndoAction | null>(null)
  const reorderListRef = useRef<HTMLDivElement | null>(null)
  const reorderDraftRef = useRef<string[]>([])
  const dragStartDraftRef = useRef<string[]>([])
  const draggingIdRef = useRef<string | null>(null)
  const reorderSavingRef = useRef(false)

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
  const reorderable = routines.filter((routine) => !routine.archived_at && routine.started_on <= endKey).sort((a, b) => a.sort_order - b.sort_order)
  const reorderItems = reorderDraft.map((id) => routines.find((routine) => routine.id === id)).filter((routine): routine is Routine => Boolean(routine))
  const completedSelected = active.filter((routine) => completions.some((item) => item.routine_id === routine.id && item.completed_on === selectedDate)).length

  const rowFor = (routineId: string) => completions.filter((item) => item.routine_id === routineId).sort((a, b) => a.completed_on.localeCompare(b.completed_on))
  const runningNumber = (routineId: string, date: string) => {
    const row = rowFor(routineId)
    const index = row.findIndex((item) => item.completed_on === date)
    return index < 0 ? null : index + 1
  }

  function moveDraftItem(ids: string[], id: string, targetIndex: number) {
    const currentIndex = ids.indexOf(id)
    if (currentIndex < 0 || targetIndex < 0 || currentIndex === targetIndex) return ids
    const next = [...ids]
    next.splice(currentIndex, 1)
    next.splice(Math.min(targetIndex, next.length), 0, id)
    return next
  }

  function setDraft(ids: string[]) {
    reorderDraftRef.current = ids
    setReorderDraft(ids)
  }

  function openReorderMode() {
    setSearch('')
    setShowArchived(false)
    setMode('today')
    setDraft(reorderable.map((routine) => routine.id))
    setReorderMode(true)
  }

  async function persistRoutineOrder(ids: string[]) {
    if (!supabase || reorderSavingRef.current) return
    const client = supabase
    const changes = ids.map((id, index) => ({ id, sort_order: index })).filter(({ id, sort_order }) => routines.find((routine) => routine.id === id)?.sort_order !== sort_order)
    if (changes.length === 0) return
    reorderSavingRef.current = true
    setReorderSaving(true)
    const results = await Promise.all(changes.map(({ id, sort_order }) => client.from('routines').update({ sort_order }).eq('id', id)))
    const failed = results.find((result) => result.error)
    if (failed?.error) {
      const restored = routines.filter((routine) => ids.includes(routine.id)).sort((a, b) => a.sort_order - b.sort_order).map((routine) => routine.id)
      setDraft(restored)
      setMessage(`Order was not saved: ${failed.error.message}`)
    } else {
      const positions = new Map(ids.map((id, index) => [id, index]))
      setRoutines((current) => current.map((routine) => positions.has(routine.id) ? { ...routine, sort_order: positions.get(routine.id) ?? routine.sort_order } : routine).sort((a, b) => a.sort_order - b.sort_order))
      setMessage('')
    }
    reorderSavingRef.current = false
    setReorderSaving(false)
  }

  function beginRoutineDrag(event: React.PointerEvent<HTMLButtonElement>, id: string) {
    if (reorderSavingRef.current) return
    event.preventDefault()
    dragStartDraftRef.current = [...reorderDraftRef.current]
    draggingIdRef.current = id
    setDraggingId(id)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveRoutineDrag(event: React.PointerEvent<HTMLButtonElement>, id: string) {
    if (draggingIdRef.current !== id || !reorderListRef.current) return
    event.preventDefault()
    const rows = Array.from(reorderListRef.current.querySelectorAll<HTMLElement>('[data-reorder-id]'))
    let targetIndex = rows.findIndex((row) => event.clientY < row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2)
    if (targetIndex < 0) targetIndex = rows.length - 1
    const next = moveDraftItem(reorderDraftRef.current, id, targetIndex)
    if (next !== reorderDraftRef.current) setDraft(next)
    const edge = 84
    if (event.clientY < edge) window.scrollBy({ top: -14, behavior: 'auto' })
    else if (event.clientY > window.innerHeight - edge) window.scrollBy({ top: 14, behavior: 'auto' })
  }

  function endRoutineDrag(event: React.PointerEvent<HTMLButtonElement>, id: string) {
    if (draggingIdRef.current !== id) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    draggingIdRef.current = null
    setDraggingId(null)
    if (dragStartDraftRef.current.join('|') !== reorderDraftRef.current.join('|')) void persistRoutineOrder(reorderDraftRef.current)
  }

  function cancelRoutineDrag(event: React.PointerEvent<HTMLButtonElement>, id: string) {
    if (draggingIdRef.current !== id) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    draggingIdRef.current = null
    setDraggingId(null)
    setDraft(dragStartDraftRef.current)
  }

  function moveRoutineWithKeyboard(event: React.KeyboardEvent<HTMLButtonElement>, id: string) {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key) || reorderSavingRef.current) return
    event.preventDefault()
    const currentIndex = reorderDraftRef.current.indexOf(id)
    const targetIndex = Math.max(0, Math.min(reorderDraftRef.current.length - 1, currentIndex + (event.key === 'ArrowUp' ? -1 : 1)))
    const next = moveDraftItem(reorderDraftRef.current, id, targetIndex)
    if (next === reorderDraftRef.current) return
    setDraft(next)
    void persistRoutineOrder(next)
  }

  async function toggle(routine: Routine, date: string) {
    if (!supabase || routine.archived_at) return
    const soundReady = prepareFeedbackSound()
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
      void soundReady.then(playSuccessSound)
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
    if (!supabase) return false
    const soundReady = prepareFeedbackSound()
    if (editor === 'new') {
      const nextOrder = Math.max(-1, ...routines.map((routine) => routine.sort_order)) + 1
      const { data, error } = await supabase.from('routines').insert({ user_id: userId, name, color, sort_order: nextOrder, started_on: dateKey(today) }).select('id,name,color,sort_order,started_on,archived_at').single()
      if (error) {
        setMessage(error.message)
        return false
      }
      if (data) setRoutines((current) => current.some((routine) => routine.id === data.id) ? current : [...current, data as Routine])
    } else if (editor) {
      const { error } = await supabase.from('routines').update({ name, color }).eq('id', editor.id)
      if (error) {
        setMessage(error.message)
        return false
      }
      setRoutines((current) => current.map((routine) => routine.id === editor.id ? { ...routine, name, color } : routine))
    }
    setMessage('')
    setEditor(null)
    void soundReady.then(playSuccessSound)
    return true
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
      <div><p className="eyebrow">ROUTINES</p><h1>{reorderMode ? 'Reorder' : mode === 'today' ? (selectedDate === dateKey(today) ? 'Today' : selected.toLocaleDateString(undefined, { weekday: 'long' })) : 'Your week'}</h1><p>{reorderMode ? `${reorderItems.length} routines · drag to arrange` : mode === 'today' ? `${completedSelected} of ${active.length} complete · ${shortDate(selected)}` : `${shortDate(week[0])} – ${shortDate(week[6])}`}</p></div>
      {!reorderMode && <button className="add-circle" onClick={() => setEditor('new')} aria-label="Add routine"><AppIcon name="plus" /></button>}
    </section>

    {!reorderMode && <><div className="mode-switch" aria-label="Routine view">
      <button className={mode === 'today' ? 'active' : ''} onClick={() => setMode('today')}><AppIcon name="list" />Today</button>
      <button className={mode === 'week' ? 'active' : ''} onClick={() => setMode('week')}><AppIcon name="calendar" />Week</button>
    </div>

    <WeekNavigator week={week} selectedDate={selectedDate} onSelect={(date) => { setSelectedDate(date); setMode('today') }} onPrevious={() => setWeekOffset((value) => value - 1)} onNext={() => setWeekOffset((value) => value + 1)} onToday={() => { setWeekOffset(0); setSelectedDate(dateKey(today)) }} />
    </>}

    <div className={`tracker-tools ${reorderMode ? 'reorder-active' : ''}`}>
      {reorderMode ? <div className="reorder-guidance"><strong>Arrange your list</strong><span>Hold a handle and drag</span></div> : <label className="search-field"><span aria-hidden>⌕</span><input aria-label="Search routines" placeholder="Search routines" value={search} onChange={(event) => setSearch(event.target.value)} /></label>}
      <button className={reorderMode ? 'active' : ''} disabled={reorderSaving || reorderable.length < 2} onClick={() => reorderMode ? setReorderMode(false) : openReorderMode()}><AppIcon name={reorderMode ? 'check' : 'grip'} /><span>{reorderMode ? 'Done' : 'Reorder'}</span></button>
      {!reorderMode && <button className={showArchived ? 'active' : ''} onClick={() => setShowArchived((value) => !value)}><AppIcon name="archive" /><span>{showArchived ? 'Archived' : 'Archive'}</span></button>}
    </div>

    {reorderMode ? <div className="reorder-list" ref={reorderListRef} aria-label="Reorder routines">
      {reorderItems.map((routine, index) => <article className={`reorder-row ${draggingId === routine.id ? 'dragging' : ''}`} data-reorder-id={routine.id} key={routine.id} style={{ '--routine-color': routine.color } as React.CSSProperties}>
        <i aria-hidden />
        <div><strong>{routine.name}</strong><span>Position {index + 1} of {reorderItems.length} · {rowFor(routine.id).length}/7 this week</span></div>
        <button className="reorder-handle" disabled={reorderSaving} aria-label={`Drag ${routine.name}. Position ${index + 1} of ${reorderItems.length}. Use arrow keys to move.`} onPointerDown={(event) => beginRoutineDrag(event, routine.id)} onPointerMove={(event) => moveRoutineDrag(event, routine.id)} onPointerUp={(event) => endRoutineDrag(event, routine.id)} onPointerCancel={(event) => cancelRoutineDrag(event, routine.id)} onKeyDown={(event) => moveRoutineWithKeyboard(event, routine.id)}><AppIcon name="grip" /></button>
      </article>)}
      <p className="reorder-status" role="status">{reorderSaving ? 'Saving order…' : 'Order saves after each drop.'}</p>
    </div> : matching.length === 0 ? <EmptyState title={showArchived ? 'No archived routines' : search ? 'No matching routines' : 'Add your first routine'} copy={showArchived ? 'Archived routines stay here until you restore or delete them.' : 'Create as many routines as you need. Nothing is capped.'} action={!showArchived && !search ? <button className="primary-button" onClick={() => setEditor('new')}><AppIcon name="plus" />Add routine</button> : null} /> :
      mode === 'today'
        ? <div className="today-routine-list">{matching.map((routine) => {
          const count = runningNumber(routine.id, selectedDate)
          const total = rowFor(routine.id).length
          const unavailable = Boolean(routine.archived_at)
          return <article className={`today-routine-card ${count ? 'complete' : ''} ${routine.archived_at ? 'archived' : ''}`} key={routine.id} style={{ '--routine-color': routine.color } as React.CSSProperties}>
            <button className="today-check" disabled={unavailable} onClick={() => toggle(routine, selectedDate)} aria-label={`${count ? 'Remove completion for' : 'Complete'} ${routine.name}`}>{count ?? <AppIcon name="check" />}</button>
            <div className="today-routine-copy"><strong>{routine.name}</strong><span>{routine.archived_at ? 'Archived' : count ? `Completion ${count} this week` : 'Tap the circle when done'}</span><div className="mini-week">{week.map((day) => <i key={dateKey(day)} className={runningNumber(routine.id, dateKey(day)) ? 'done' : ''} />)}</div></div>
            <div className="today-routine-actions">
              <div className="routine-score"><strong>{total}</strong><span>/ 7</span></div>
              <button className="more-button" onClick={() => setEditor(routine)} aria-label={`Manage ${routine.name}`}><AppIcon name="more" /></button>
            </div>
          </article>
        })}</div>
        : <div className="week-board">{matching.map((routine) => {
          const total = rowFor(routine.id).length
          return <article className={`week-routine-card ${routine.archived_at ? 'archived' : ''}`} key={routine.id} style={{ '--routine-color': routine.color } as React.CSSProperties}>
            <header><div><i /><strong>{routine.name}</strong></div><div className="week-card-actions"><span><b>{total}</b> / 7</span><button className="more-button" onClick={() => setEditor(routine)} aria-label={`Manage ${routine.name}`}><AppIcon name="more" /></button></div></header>
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
    {editor && <RoutineEditor key={editor === 'new' ? 'new' : editor.id} routine={editor === 'new' ? null : editor} onClose={() => setEditor(null)} onSave={saveRoutine} onArchive={toggleArchive} onDelete={deleteRoutine} />}
  </>
}

function WeekNavigator({ week, selectedDate, onSelect, onPrevious, onNext, onToday }: { week: Date[]; selectedDate: string; onSelect: (date: string) => void; onPrevious: () => void; onNext: () => void; onToday: () => void }) {
  const containsToday = week.some((day) => dateKey(day) === dateKey(today))
  return <section className="week-navigator">
    <header><button aria-label="Previous week" onClick={onPrevious}><AppIcon name="arrow" /></button><div><strong>{week[0].toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong></div><button className="next" aria-label="Next week" onClick={onNext}><AppIcon name="arrow" /></button></header>
    <div className="date-rail">{week.map((day) => {
      const key = dateKey(day)
      return <button key={key} className={`${key === selectedDate ? 'selected' : ''} ${key === dateKey(today) ? 'today' : ''}`} onClick={() => onSelect(key)}><span>{day.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1)}</span><strong>{day.getDate()}</strong></button>
    })}</div>
    {!containsToday && <button className="return-today" onClick={onToday}>Return to today</button>}
  </section>
}

function RoutineEditor({ routine, onClose, onSave, onArchive, onDelete }: { routine: Routine | null; onClose: () => void; onSave: (name: string, color: string) => Promise<boolean>; onArchive: (routine: Routine) => Promise<void>; onDelete: (routine: Routine) => Promise<void> }) {
  const [name, setName] = useState(routine?.name ?? '')
  const [color, setColor] = useState(routine?.color ?? routinePalette[0])
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    const clean = name.trim()
    if (!clean || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    const saved = await onSave(clean, color)
    if (!saved) {
      savingRef.current = false
      setSaving(false)
    }
  }
  return <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="routine-editor-title" aria-busy={saving}>
      <div className="sheet-handle" />
      <header><div><p className="eyebrow">{routine ? 'MANAGE ROUTINE' : 'NEW ROUTINE'}</p><h2 id="routine-editor-title">{routine ? 'Routine settings' : 'Add to your plan'}</h2></div><button className="icon-button" disabled={saving} onClick={onClose} aria-label="Close"><AppIcon name="close" /></button></header>
      <form onSubmit={submit}>
        <label>Routine name<input disabled={saving} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Morning walk" /></label>
        <fieldset disabled={saving}><legend>Routine colour</legend><div className="color-palette">{routinePalette.map((value) => <button type="button" key={value} className={value === color ? 'selected' : ''} style={{ backgroundColor: value }} onClick={() => setColor(value)} aria-label={`Choose ${value}`} />)}</div></fieldset>
        <button className="primary-button sheet-save" disabled={saving} type="submit">{saving ? (routine ? 'Saving…' : 'Adding…') : routine ? 'Save changes' : 'Add routine'}</button>
      </form>
      {routine && <div className="sheet-actions routine-sheet-actions">
        <button onClick={() => onArchive(routine)}><AppIcon name="archive" />{routine.archived_at ? 'Restore routine' : 'Archive routine'}</button>
        <button className="danger" onClick={() => onDelete(routine)}><AppIcon name="trash" />Delete permanently</button>
      </div>}
    </section>
  </div>
}

function DailyTasks({ userId, selectedDate, onDateChange }: { userId: string; selectedDate: string; onDateChange: (date: string) => void }) {
  const cacheKey = `${userId}:${selectedDate}`
  const [tasks, setTasks] = useState<Task[]>(() => dailyTaskCache.get(cacheKey) ?? [])
  const [title, setTitle] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('none')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reloadVersion, setReloadVersion] = useState(0)
  const [adding, setAdding] = useState(false)
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null)
  const [undo, setUndo] = useState<UndoAction | null>(null)
  const [editor, setEditor] = useState<Task | null>(null)
  const [carryOpen, setCarryOpen] = useState(false)
  const [carryDate, setCarryDate] = useState(() => offsetDateKey(dateKey(today), -1))
  const [carryTasks, setCarryTasks] = useState<Task[]>([])
  const [carryLoading, setCarryLoading] = useState(false)
  const [carryMoving, setCarryMoving] = useState(false)
  const [carryError, setCarryError] = useState('')
  const requestRef = useRef(0)
  const addingRef = useRef(false)
  const movingRef = useRef<string | null>(null)
  const date = dateFromKey(selectedDate)

  function commitTasks(update: (current: Task[]) => Task[]) {
    setTasks((current) => {
      const next = update(current)
      dailyTaskCache.set(cacheKey, next)
      return next
    })
  }

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    const requestId = ++requestRef.current
    const cached = dailyTaskCache.get(cacheKey)
    if (cached) setTasks(cached)
    setLoading(true)
    setLoadError('')
    void client.from('daily_tasks').select(taskFields).eq('user_id', userId).eq('task_date', selectedDate).is('archived_at', null).order('sort_order').then(({ data, error }) => {
      if (requestRef.current !== requestId) return
      if (error) {
        setLoadError(error.message)
      } else {
        const confirmed = (data ?? []) as Task[]
        dailyTaskCache.set(cacheKey, confirmed)
        setTasks(confirmed)
      }
      setLoading(false)
    })
    return () => {
      if (requestRef.current === requestId) requestRef.current += 1
    }
  }, [cacheKey, reloadVersion, selectedDate, userId])

  async function addTask(event: FormEvent) {
    event.preventDefault()
    const clean = title.trim()
    if (!clean || !supabase || addingRef.current) return
    if (tasks.some((task) => !task.completed_at && task.title.toLowerCase() === clean.toLowerCase()) && !window.confirm('A matching pending task already exists. Add another?')) return
    const soundReady = prepareFeedbackSound()
    addingRef.current = true
    setAdding(true)
    const nextOrder = Math.max(-1, ...tasks.map((task) => Number(task.sort_order))) + 1
    const { data, error } = await supabase.from('daily_tasks').insert({ user_id: userId, task_date: selectedDate, title: clean, due_time: dueTime || null, priority, sort_order: nextOrder }).select(taskFields).single()
    if (error) {
      setMessage(error.message)
    } else if (data) {
      commitTasks((current) => current.some((task) => task.id === data.id) ? current : [...current, data as Task])
      setTitle('')
      setDueTime('')
      setPriority('none')
      setMessage('')
      void soundReady.then(playSuccessSound)
    }
    addingRef.current = false
    setAdding(false)
  }

  async function toggleTask(task: Task) {
    if (!supabase) return
    const soundReady = prepareFeedbackSound()
    const client = supabase
    const completed_at = task.completed_at ? null : new Date().toISOString()
    const { error } = await client.from('daily_tasks').update({ completed_at }).eq('id', task.id)
    if (error) return setMessage(error.message)
    commitTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed_at } : item))
    if (completed_at) void soundReady.then(playSuccessSound)
    setUndo({ label: completed_at ? `${task.title} completed` : `${task.title} reopened`, run: async () => {
      await client.from('daily_tasks').update({ completed_at: task.completed_at }).eq('id', task.id)
      commitTasks((current) => current.map((item) => item.id === task.id ? task : item))
    } })
  }

  async function moveToTomorrow(task: Task) {
    if (!supabase || task.completed_at || movingRef.current) return
    const client = supabase
    movingRef.current = task.id
    setMovingTaskId(task.id)
    const tomorrow = new Date(date)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowKey = dateKey(tomorrow)
    const { data: finalTask, error } = await client.from('daily_tasks').update({ task_date: tomorrowKey, completed_at: null }).eq('id', task.id).select(taskFields).single()
    if (error || !finalTask) {
      setMessage(error?.message ?? 'Could not move this task. Please try again.')
      movingRef.current = null
      setMovingTaskId(null)
      return
    }
    const moved = finalTask as Task
    commitTasks((current) => current.filter((item) => item.id !== task.id))
    const tomorrowCacheKey = `${userId}:${tomorrowKey}`
    const tomorrowTasks = dailyTaskCache.get(tomorrowCacheKey)
    if (tomorrowTasks) dailyTaskCache.set(tomorrowCacheKey, [...tomorrowTasks.filter((item) => item.id !== moved.id), moved])
    setMessage('')
    setEditor(null)
    setUndo({
      label: `${task.title} moved to tomorrow`,
      run: async () => {
        const { data: restored, error: restoreError } = await client.from('daily_tasks').update({ task_date: selectedDate, completed_at: task.completed_at, sort_order: task.sort_order }).eq('id', task.id).select(taskFields).single()
        if (restoreError || !restored) {
          setMessage(restoreError?.message ?? 'Could not undo the move.')
          return
        }
        dailyTaskCache.set(tomorrowCacheKey, (dailyTaskCache.get(tomorrowCacheKey) ?? []).filter((item) => item.id !== task.id))
        commitTasks((current) => current.some((item) => item.id === task.id) ? current : [...current, restored as Task])
      },
    })
    movingRef.current = null
    setMovingTaskId(null)
  }

  async function saveTask(task: Task, values: Pick<Task, 'title' | 'notes' | 'due_time' | 'priority'>) {
    if (!supabase) return
    const { error } = await supabase.from('daily_tasks').update(values).eq('id', task.id)
    if (error) return setMessage(error.message)
    commitTasks((current) => current.map((item) => item.id === task.id ? { ...item, ...values } : item))
    setEditor(null)
  }

  async function archiveTask(task: Task) {
    if (!supabase || !window.confirm(`Archive “${task.title}”?`)) return
    const { error } = await supabase.from('daily_tasks').update({ archived_at: new Date().toISOString() }).eq('id', task.id)
    if (error) return setMessage(error.message)
    commitTasks((current) => current.filter((item) => item.id !== task.id))
    setEditor(null)
  }

  async function loadCarryTasks(sourceDate: string) {
    if (!supabase || sourceDate >= dateKey(today)) {
      setCarryTasks([])
      setCarryError(sourceDate === dateKey(today) ? 'Choose an earlier date.' : '')
      return
    }
    setCarryLoading(true)
    setCarryError('')
    const { data, error } = await supabase.from('daily_tasks').select(taskFields).eq('user_id', userId).eq('task_date', sourceDate).is('archived_at', null).is('completed_at', null).order('sort_order')
    if (error) {
      setCarryTasks([])
      setCarryError(error.message)
    } else {
      setCarryTasks((data ?? []) as Task[])
    }
    setCarryLoading(false)
  }

  function openCarry() {
    const defaultDate = selectedDate < dateKey(today) ? selectedDate : offsetDateKey(dateKey(today), -1)
    setCarryDate(defaultDate)
    setCarryOpen(true)
    void loadCarryTasks(defaultDate)
  }

  async function movePendingToToday() {
    if (!supabase || carryMoving || !carryTasks.length || carryDate >= dateKey(today)) return
    setCarryMoving(true)
    setCarryError('')
    const client = supabase
    const baseOrder = Math.max(-1, ...tasks.map((task) => Number(task.sort_order))) + 1
    const moved: Task[] = []
    const originalOrders = new Map(carryTasks.map((task) => [task.id, task.sort_order]))
    for (const [index, task] of carryTasks.entries()) {
      const { data, error } = await client.from('daily_tasks').update({ task_date: dateKey(today), sort_order: baseOrder + index }).eq('id', task.id).eq('user_id', userId).select(taskFields).single()
      if (error || !data) {
        setCarryError(error?.message ?? 'Some tasks could not be moved. Please try again.')
        break
      }
      moved.push(data as Task)
    }
    if (moved.length) {
      const sourceCacheKey = `${userId}:${carryDate}`
      dailyTaskCache.set(sourceCacheKey, (dailyTaskCache.get(sourceCacheKey) ?? []).filter((task) => !moved.some((item) => item.id === task.id)))
      dailyTaskCache.set(`${userId}:${dateKey(today)}`, [...(dailyTaskCache.get(`${userId}:${dateKey(today)}`) ?? tasks), ...moved])
      if (selectedDate === dateKey(today)) commitTasks((current) => [...current, ...moved])
      setCarryTasks((current) => current.filter((task) => !moved.some((item) => item.id === task.id)))
      setUndo({ label: `${moved.length} pending ${moved.length === 1 ? 'task' : 'tasks'} moved to today`, run: async () => {
        for (const task of moved) await client.from('daily_tasks').update({ task_date: carryDate, sort_order: originalOrders.get(task.id) ?? task.sort_order }).eq('id', task.id)
        dailyTaskCache.delete(`${userId}:${dateKey(today)}`)
        dailyTaskCache.delete(`${userId}:${carryDate}`)
        if (selectedDate === dateKey(today)) setReloadVersion((value) => value + 1)
      }})
      if (!carryTasks.slice(moved.length).length) setCarryOpen(false)
    }
    setCarryMoving(false)
  }

  const filtered = tasks.filter((task) => task.title.toLowerCase().includes(search.toLowerCase()))
  const pending = filtered.filter((task) => !task.completed_at).sort((a, b) => (a.due_time ?? '99:99').localeCompare(b.due_time ?? '99:99'))
  const completed = filtered.filter((task) => task.completed_at)
  const done = tasks.filter((task) => task.completed_at).length

  return <>
    <section className="screen-heading"><div><p className="eyebrow">DAILY TASKS</p><h1>{selectedDate === dateKey(today) ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'long' })}</h1><p>{loading && tasks.length === 0 ? `Loading tasks · ${shortDate(date)}` : `${done} of ${tasks.length} complete · ${shortDate(date)}`}</p></div><button className="secondary-action" onClick={openCarry}><AppIcon name="arrow" />Bring pending</button></section>
    <TaskDateNavigator date={date} onPrevious={() => { const next = new Date(date); next.setDate(next.getDate() - 1); onDateChange(dateKey(next)) }} onNext={() => { const next = new Date(date); next.setDate(next.getDate() + 1); onDateChange(dateKey(next)) }} onToday={() => onDateChange(dateKey(today))} />
    <section className="task-composer">
      <form onSubmit={addTask}><input disabled={adding} aria-label="New daily task" placeholder="What needs to get done?" value={title} onChange={(event) => setTitle(event.target.value)} /><button className="primary-button" disabled={adding} type="submit"><AppIcon name="plus" />{adding ? 'Adding…' : 'Add'}</button></form>
      <div><select disabled={adding} aria-label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as Task['priority'])}><option value="none">No priority</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select><input disabled={adding} aria-label="Due time" type="time" value={dueTime} onChange={(event) => setDueTime(event.target.value)} /></div>
    </section>
    <label className="search-field task-search"><span aria-hidden>⌕</span><input aria-label="Search tasks" placeholder="Search this day" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    {loading && tasks.length === 0 ? <TaskLoadingState /> : loadError && tasks.length === 0 ? <LoadFailure message={loadError} onRetry={() => setReloadVersion((value) => value + 1)} /> : pending.length === 0 ? <EmptyState title="A clear day ahead" copy={completed.length ? 'Completed tasks are tucked away. Your progress is preserved in Statistics.' : 'Add a one-time task above. Routines stay in their own tab.'} action={null} /> : <section className="task-board">
      <TaskSection title="Pending" tasks={pending} onToggle={toggleTask} onEdit={setEditor} />
    </section>}
    {loading && tasks.length > 0 && <p className="sync-note" role="status">Refreshing tasks…</p>}
    {loadError && tasks.length > 0 && <p className="inline-error" role="alert">{loadError} <button onClick={() => setReloadVersion((value) => value + 1)}>Retry</button></p>}
    {message && <p className="inline-error" role="status">{message}</p>}
    {undo && <UndoToast action={undo} onClose={() => setUndo(null)} />}
    {editor && <TaskEditor key={editor.id} task={editor} moving={movingTaskId === editor.id} onClose={() => setEditor(null)} onSave={saveTask} onMoveToTomorrow={moveToTomorrow} onArchive={archiveTask} />}
    {carryOpen && <PendingCarrySheet sourceDate={carryDate} tasks={carryTasks} loading={carryLoading} moving={carryMoving} error={carryError} onDateChange={(nextDate) => { setCarryDate(nextDate); void loadCarryTasks(nextDate) }} onMove={movePendingToToday} onClose={() => setCarryOpen(false)} />}
  </>
}

function PendingCarrySheet({ sourceDate, tasks, loading, moving, error, onDateChange, onMove, onClose }: { sourceDate: string; tasks: Task[]; loading: boolean; moving: boolean; error: string; onDateChange: (date: string) => void; onMove: () => void; onClose: () => void }) {
  const source = dateFromKey(sourceDate)
  return <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !moving) onClose() }}>
    <section className="bottom-sheet carry-sheet" role="dialog" aria-modal="true" aria-labelledby="carry-title" aria-busy={moving}>
      <header><div><p className="eyebrow">CARRY FORWARD</p><h2 id="carry-title">Bring pending to today</h2></div><button className="icon-button" disabled={moving} onClick={onClose} aria-label="Close"><AppIcon name="close" /></button></header>
      <p className="carry-copy">Choose an earlier day. Unfinished Daily Tasks will move as the same records; nothing is copied or deleted.</p>
      <label className="carry-date">Source date<input type="date" max={offsetDateKey(dateKey(today), -1)} value={sourceDate} onChange={(event) => onDateChange(event.target.value)} /></label>
      {loading ? <p className="carry-status" role="status">Checking pending tasks…</p> : error ? <p className="inline-error" role="alert">{error}</p> : tasks.length ? <div className="carry-preview"><strong>{tasks.length} pending {tasks.length === 1 ? 'task' : 'tasks'}</strong><span>{source.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</span><ul>{tasks.slice(0, 4).map((task) => <li key={task.id}>{task.title}</li>)}{tasks.length > 4 && <li>+ {tasks.length - 4} more</li>}</ul></div> : <div className="carry-empty"><strong>No pending tasks on this date</strong><span>Routines are recurring and already available in today’s Routines view.</span></div>}
      <button className="primary-button sheet-save" disabled={moving || loading || !tasks.length || Boolean(error)} onClick={onMove}>{moving ? 'Moving…' : `Move ${tasks.length || ''} to today`}</button>
    </section>
  </div>
}

function TaskDateNavigator({ date, onPrevious, onNext, onToday }: { date: Date; onPrevious: () => void; onNext: () => void; onToday: () => void }) {
  const current = dateKey(date) === dateKey(today)
  return <div className="task-date-nav"><button aria-label="Previous day" onClick={onPrevious}><AppIcon name="arrow" /></button><button className={`date-copy ${current ? 'current' : ''}`} onClick={onToday}><strong>{fullDate(date)}</strong>{!current && <span>Return to today</span>}</button><button className="next" aria-label="Next day" onClick={onNext}><AppIcon name="arrow" /></button></div>
}

function TaskSection({ title, tasks, onToggle, onEdit }: { title: string; tasks: Task[]; onToggle: (task: Task) => void; onEdit: (task: Task) => void }) {
  return <div className="task-section"><header><strong>{title}</strong><span>{tasks.length}</span></header>{tasks.map((task) => <TaskCard key={task.id} task={task} onToggle={onToggle} onEdit={onEdit} />)}</div>
}

function TaskCard({ task, onToggle, onEdit }: { task: Task; onToggle: (task: Task) => void; onEdit: (task: Task) => void }) {
  const timerRef = useRef<number | null>(null)
  const startRef = useRef({ x: 0, y: 0 })
  function cancelLongPress() {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
  }
  function startLongPress(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === 'mouse' || event.button !== 0 || (event.target as HTMLElement).closest('button')) return
    startRef.current = { x: event.clientX, y: event.clientY }
    cancelLongPress()
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      onEdit(task)
    }, 500)
  }
  function trackLongPress(event: React.PointerEvent<HTMLElement>) {
    if (Math.hypot(event.clientX - startRef.current.x, event.clientY - startRef.current.y) > 10) cancelLongPress()
  }
  return <article className={`task-card ${task.completed_at ? 'complete' : ''}`} onPointerDown={startLongPress} onPointerMove={trackLongPress} onPointerUp={cancelLongPress} onPointerCancel={cancelLongPress} onPointerLeave={cancelLongPress} onContextMenu={(event) => event.preventDefault()} aria-label={`${task.title}. Long press or use the menu for actions.`}>
    <button className="task-check" onClick={() => onToggle(task)} aria-label={`${task.completed_at ? 'Reopen' : 'Complete'} ${task.title}`}><AppIcon name="check" /></button>
    <div><strong>{task.title}</strong>{(task.due_time || task.priority !== 'none' || task.notes) && <span>{task.due_time ? new Date(`2000-01-01T${task.due_time}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : ''}{task.due_time && task.priority !== 'none' ? ' · ' : ''}{task.priority !== 'none' ? `${task.priority} priority` : ''}{task.notes ? `${task.due_time || task.priority !== 'none' ? ' · ' : ''}note` : ''}</span>}</div>
    <button className="more-button" onClick={() => onEdit(task)} aria-label={`Manage ${task.title}`}><AppIcon name="more" /></button>
  </article>
}

function TaskEditor({ task, moving, onClose, onSave, onMoveToTomorrow, onArchive }: { task: Task; moving: boolean; onClose: () => void; onSave: (task: Task, values: Pick<Task, 'title' | 'notes' | 'due_time' | 'priority'>) => Promise<void>; onMoveToTomorrow: (task: Task) => Promise<void>; onArchive: (task: Task) => Promise<void> }) {
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes ?? '')
  const [dueTime, setDueTime] = useState(task.due_time?.slice(0, 5) ?? '')
  const [priority, setPriority] = useState(task.priority)
  return <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="task-editor-title" aria-busy={moving}>
      <div className="sheet-handle" /><header><div><p className="eyebrow">TASK ACTIONS</p><h2 id="task-editor-title">Task settings</h2></div><button className="icon-button" disabled={moving} onClick={onClose} aria-label="Close"><AppIcon name="close" /></button></header>
      <form onSubmit={(event) => { event.preventDefault(); const clean = title.trim(); if (clean) void onSave(task, { title: clean, notes: notes.trim() || null, due_time: dueTime || null, priority }) }}>
        <label>Task name<input disabled={moving} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Notes<textarea disabled={moving} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note" /></label>
        <div className="field-pair"><label>Priority<select disabled={moving} value={priority} onChange={(event) => setPriority(event.target.value as Task['priority'])}><option value="none">None</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label><label>Due time<input disabled={moving} type="time" value={dueTime} onChange={(event) => setDueTime(event.target.value)} /></label></div>
        <button className="primary-button sheet-save" disabled={moving} type="submit">Save changes</button>
      </form>
      <div className="sheet-actions">
        {!task.completed_at && <button className="move-tomorrow" disabled={moving} onClick={() => onMoveToTomorrow(task)}><AppIcon name="arrow" />{moving ? 'Moving…' : 'Move to tomorrow'}</button>}
        <button disabled={moving} onClick={() => onArchive(task)}><AppIcon name="archive" />Archive task</button>
      </div>
    </section>
  </div>
}

type StatsPreset = 'today' | 'yesterday' | '7' | '15' | '30' | 'year' | 'custom'
type StatsTask = { id: string; task_date: string; completed_at: string | null }
type StatsCompletion = { id: string; completed_on: string }

function Statistics({ userId }: { userId: string }) {
  const [preset, setPreset] = useState<StatsPreset>('7')
  const [customStart, setCustomStart] = useState(offsetDateKey(dateKey(today), -6))
  const [customEnd, setCustomEnd] = useState(dateKey(today))
  const [tasks, setTasks] = useState<StatsTask[]>([])
  const [completions, setCompletions] = useState<StatsCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const range = useMemo(() => {
    const end = dateKey(today)
    if (preset === 'today') return { start: end, end }
    if (preset === 'yesterday') { const yesterday = offsetDateKey(end, -1); return { start: yesterday, end: yesterday } }
    if (preset === 'year') return { start: `${today.getFullYear()}-01-01`, end }
    if (preset === 'custom') return { start: customStart <= customEnd ? customStart : customEnd, end: customStart <= customEnd ? customEnd : customStart }
    const days = Number(preset)
    return { start: offsetDateKey(end, -(days - 1)), end }
  }, [customEnd, customStart, preset])

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    setLoading(true)
    setError('')
    Promise.all([
      supabase.from('daily_tasks').select('id,task_date,completed_at').eq('user_id', userId).gte('task_date', range.start).lte('task_date', range.end),
      supabase.from('routine_completions').select('id,completed_on').eq('user_id', userId).gte('completed_on', range.start).lte('completed_on', range.end),
    ]).then(([taskResult, completionResult]) => {
      if (cancelled) return
      if (taskResult.error || completionResult.error) setError(taskResult.error?.message ?? completionResult.error?.message ?? 'Could not load statistics.')
      setTasks((taskResult.data ?? []) as StatsTask[])
      setCompletions((completionResult.data ?? []) as StatsCompletion[])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [range.end, range.start, userId])

  const completedTasks = tasks.filter((task) => Boolean(task.completed_at)).length
  const taskRate = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0
  const totalActivity = completedTasks + completions.length
  const activeDays = new Set([...tasks.map((task) => task.task_date), ...completions.map((item) => item.completed_on)]).size
  const label = preset === '7' ? 'Last 7 days' : preset === '15' ? 'Last 15 days' : preset === '30' ? 'Last 30 days' : preset === 'year' ? 'This year' : preset === 'today' ? 'Today' : preset === 'yesterday' ? 'Yesterday' : 'Custom range'

  return <>
    <section className="screen-heading"><div><p className="eyebrow">STATISTICS</p><h1>Progress</h1><p>{label} · {shortDate(dateFromKey(range.start))} – {shortDate(dateFromKey(range.end))}</p></div><AppIcon name="chart" /></section>
    <section className="stats-panel">
      <div className="stats-presets" aria-label="Statistics date range">
        {([['today', 'Today'], ['yesterday', 'Yesterday'], ['7', '7 days'], ['15', '15 days'], ['30', '30 days'], ['year', 'Year'], ['custom', 'Custom']] as [StatsPreset, string][]).map(([value, text]) => <button key={value} className={preset === value ? 'active' : ''} onClick={() => setPreset(value)}>{text}</button>)}
      </div>
      {preset === 'custom' && <div className="stats-custom-range"><label>From<input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></label><label>To<input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></label></div>}
    </section>
    {loading ? <section className="stats-loading" role="status">Loading metrics…</section> : error ? <section className="empty-state load-failure"><div className="empty-icon">!</div><h2>Statistics unavailable</h2><p>{error}</p></section> : <section className="stats-grid">
      <article className="stat-card stat-primary"><span>Tasks completed</span><strong>{completedTasks}<small> / {tasks.length}</small></strong><em>{taskRate}% completion rate</em></article>
      <article className="stat-card"><span>Routine completions</span><strong>{completions.length}</strong><em>Recorded in this period</em></article>
      <article className="stat-card"><span>Total completed actions</span><strong>{totalActivity}</strong><em>Tasks + routines</em></article>
      <article className="stat-card"><span>Active days</span><strong>{activeDays}</strong><em>Days with activity</em></article>
    </section>}
  </>
}

function TaskLoadingState() {
  return <section className="task-loading" role="status" aria-label="Loading tasks"><i /><i /><i /></section>
}

function LoadFailure({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <section className="empty-state load-failure"><div className="empty-icon">!</div><h2>Tasks could not load</h2><p>{message}</p><button className="primary-button" onClick={onRetry}>Retry</button></section>
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
