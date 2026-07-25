# DayPlan — Living Product & Implementation Plan

**Status:** Draft v1 — 25 July 2026  
**Purpose:** The single maintained plan for scope, decisions, delivery progress, and later feature additions.

## 1. Product statement

DayPlan is a calm, spreadsheet-like personal productivity app with two deliberately separate modes:

1. **Routine Tracker** for recurring practices, recorded in weekly grids with a per-routine running completion count.
2. **Daily Tasks** for one-time tasks, organised by date with quick completion and carry-forward actions.

The app should feel fast, focused, and premium rather than gamified or visually noisy. It must retain all history and restore it after a device change.

## 1.1 Experience and design standard

**Mobile is the primary experience.** Every core interaction must be designed, built, and tested at phone width before desktop enhancement. Desktop can expose more of the spreadsheet at once, but must never be the source of truth for the layout or interaction model.

The visual direction is **enterprise-grade personal productivity**: calm, precise, trustworthy, and highly legible. It should use purposeful visual guidance—clear icons, status colour, touch feedback, empty-state illustrations or diagrams only where they clarify an action—rather than decorative clutter. The goal is the confidence and polish of a leading productivity product, while keeping the speed of a lightweight spreadsheet.

### UX principles

- **Glanceable first:** today, progress, totals, dates, and next actions are understandable without reading dense instructions.
- **Thumb-friendly:** primary actions are reachable, targets are at least 44 x 44 px, and drag/swipe interactions have visible alternatives.
- **Progressive disclosure:** keep the grid and task list simple; place editing, notes, archive, and advanced controls behind a focused sheet or menu.
- **Immediate feedback:** completion, undo, carry-forward, sync, and errors are visible and never leave the user guessing.
- **Accessible by default:** strong contrast in both themes; colour is never the only status signal; keyboard and screen-reader flows work alongside touch gestures.
- **Consistent modules:** reusable cards, sheets, controls, date navigators, empty states, and confirmation patterns behave the same throughout the app.

### Mobile layout rules

- Routine Tracker uses a horizontally scrollable day grid with the task column and Total column kept visible where technically practical; month/week navigation remains easy to reach.
- A compact mobile header shows the current week and the most important action, with secondary actions in a bottom sheet or overflow menu.
- Daily Tasks prioritises a large, fast add field and clear pending/completed blocks; swipe actions include labelled visual previews and accessible action buttons.
- Bottom navigation exposes the two primary modules: **Routines** and **Daily Tasks**. No generic dashboard is needed for V1.
- Forms open in a mobile bottom sheet; destructive actions always require clear confirmation.

### Quality gates for every feature

- Build and verify at a representative phone viewport first, then tablet and desktop.
- Test one-handed reach, touch target size, no accidental swipe/drag collisions, loading, offline, and slow-network states.
- Review visual hierarchy, empty states, error copy, contrast, and dark mode before marking a feature complete.
- Use realistic content and data densities—not placeholder-only screens—during visual QA.

## 2. Version 1 scope

### Routine Tracker

- Month navigation and auto-generated Monday–Sunday weekly sheets.
- Spreadsheet grid: task name, seven dated day columns, and a final **Total** column.
- Create, rename, colour, reorder, archive, and delete routines.
- A tap toggles a daily completion. Completed cells use the routine colour and display its running number within that week.
- Removing a completion recalculates all later running numbers in the week.
- Weekly total per routine; month and lifetime completion totals in routine details/statistics.
- Search active and archived routines.
- Optional note attached to a completion (included in the data design; UI can follow after the core grid).

### Daily Tasks

- Separate date-based task lists, with history preserved indefinitely.
- Create, edit, prioritise, reorder, complete, archive, and search one-time tasks.
- Clear pending/completed sections and a `completed / total` daily summary.
- Mobile gesture actions: left swipe completes and moves the item to Completed; right swipe creates a copy for the next day.
- Long press (mobile) / menu (desktop) opens editing.
- Date navigation for today, history, and future carried-forward tasks.

### Foundation

- Sign-in and secure per-user cloud sync.
- Responsive mobile-first UI with desktop spreadsheet comfort.
- Light and dark themes.
- Loading, empty, offline, and error states.

## 3. Explicitly deferred after V1

- PDF / Excel export.
- Reminders, widgets, quick-add shortcuts.
- Streaks, graphs, heatmaps, and advanced insights.
- Routine categories, themes, pinning.
- Collaborative or shared lists.

## 3.1 Product improvements added from workflow review

The original specification is strong. The additions below close the common gaps that make daily-use trackers frustrating: uncertainty after an action, difficult recovery from mistakes, blank-state confusion, and losing context during a busy day.

### Include in V1

| Improvement | User benefit | Behaviour / logic |
| --- | --- | --- |
| First-use setup | A new user is useful in under a minute. | Offer a skippable starter set (for example: Exercise, Meditation, Reading) and let the user rename, recolour, or start empty. Never force a template. |
| Today shortcut | Reaches the useful view instantly. | From either module, one tap returns to the current week or today’s task list. |
| Clear undo | Removes fear of fast actions. | Every completion, removal, archive, and carry-forward shows a brief undo message. Undo restores the exact prior state. |
| Safe destructive actions | Prevents accidental data loss. | Archive is the default; permanent deletion requires confirmation and explains what history is affected. |
| Routine availability date | Keeps old history truthful. | A routine has a `started_on` date. It appears from that date forward; earlier weeks do not imply it was missed. Archived routines remain visible but muted in past history. |
| Intentional missed days | Distinguishes “not tracked” from “not done.” | V1 leaves untouched cells neutral. A future optional status can mark a day as skipped; it must not inflate totals or counts. |
| Carry-forward preview | Prevents surprise duplicates. | The swipe reveals “Move to tomorrow”; release/action confirms it. Repeated carry-forward preserves the chain and never overwrites tomorrow’s task. |
| Due-time awareness | Makes one-time tasks actionable. | Tasks with a due time are ordered before undated tasks by default, while manual order is retained within each group. Overdue tasks are clearly indicated, never silently hidden. |
| Duplicate prevention | Avoids everyday task clutter. | When creating a task, warn only if an identical pending title already exists on that same date; the user can still deliberately add it. |
| Recoverable archive | Keeps the interface clean without losing data. | Archived routines/tasks are excluded from default lists, remain searchable, and can be restored. |
| Sync status | Builds trust when connection is weak. | Show a quiet synced/saving/offline indicator. Queue safe local changes and reconcile after reconnect; show a clear recovery message if a save fails. |
| Timezone-aware rollover | Avoids wrong-day tasks when travelling. | Dates use the user’s saved timezone. The app rolls over on the next app open after midnight; no fragile background process is required for V1. |
| Gentle empty states | Makes blank pages self-explanatory. | Every first/empty view has one short explanation and one primary action, never a dense tutorial. |
| Accessibility alternatives | Makes speed features usable by everyone. | Swipe and long-press actions always have labelled buttons/menus; status is communicated by icon/text as well as colour. |

### Recommended after V1 is stable

| Improvement | Why it should wait |
| --- | --- |
| Smart quick-add parsing (for example, “Call bank tomorrow 10am”) | Valuable, but needs careful date/time parsing and confirmation UX. |
| Recurring daily tasks | Useful, but deliberately separate from the routine grid to avoid overlap and complexity. |
| Reminders with per-task scheduling | Requires notification permission, timezone handling, and reliable preference management. |
| Weekly reflection | A short optional note (“What went well / next week”) makes history meaningful without turning the app into a journal. |
| Backup export and import | Adds user control alongside automatic cloud sync; needs schema/version handling. |
| Insights and streaks | Add only after the core data and user habits are reliable; do not make the app feel judgmental. |

## 3.2 Core user workflows

### A. New user to first completion

1. The user signs in and sees a concise welcome with **Start with a template** or **Start empty**.
2. They land on this week’s Routine Tracker with one clear add action.
3. They tap a routine/day cell; the routine colour, running count, weekly total, and undo confirmation update immediately.
4. The change saves in the background and the user can keep moving without waiting.

### B. Routine management without rewriting history

1. The user adds, renames, recolours, or reorders a routine from a focused edit sheet.
2. New routines begin from their creation/start date; prior weeks remain accurate.
3. Archiving hides a routine from current tracking but keeps it visible in historical context and search.
4. Restoring an archived routine retains its colour, order, and past completions.

### C. Daily task capture and execution

1. The user opens Daily Tasks; Today is the default view with a prominent quick-add field.
2. They add a simple task immediately, with details such as time, note, and priority available but not required.
3. Completing a task moves it to the day’s Completed section and updates the summary. Undo is always available.
4. Carrying forward creates a linked pending copy for tomorrow while preserving today’s record.
5. At a later date, search finds both active and archived task history.

### D. Offline or cross-device use

1. The app shows the current sync state without interrupting work.
2. Safe edits made offline remain visibly saved on the device and queue for sync.
3. After reconnection/login on another device, current data loads securely; a conflict is surfaced rather than silently discarding the user’s latest change.

## 4. Product decisions to lock before build

| Decision | Proposed V1 default | Why it matters |
| --- | --- | --- |
| Week boundary | Monday through Sunday | Keeps all generated sheets consistent. |
| Routine count | Resets each week | Matches the specified weekly sheet behaviour; month/lifetime totals remain separate. |
| Completion model | One completion per routine per date | A second tap removes it; avoids ambiguity in the grid. |
| Starting a new routine | Available in every existing and future week | Preserves one stable routine list while history remains accurate. |
| Deleting a routine | Confirmation, then permanent delete | Archive is the safe everyday option; delete stays intentional. |
| Carry forward | Creates a new pending task tomorrow and keeps today unchanged | Maintains a truthful history. |
| Timezone | Saved user preference, initially device timezone | Determines date rollover and midnight behaviour. |

**Open choices for the product owner:** whether an archived routine should remain visible in historical weeks (recommended: yes, muted), and whether a carried-forward task should retain a link to its original task (recommended: yes, internally).

## 5. Recommended technical approach

| Area | Choice |
| --- | --- |
| Front end | React + TypeScript + Vite |
| UI | Tailwind CSS plus accessible, custom spreadsheet/task components |
| Data and auth | Supabase (Postgres, Auth, Row Level Security) |
| Data fetching/offline UX | TanStack Query with optimistic updates and persisted cache |
| Drag/reorder | dnd-kit |
| Gestures | Pointer-event swipe component, designed alongside accessible button alternatives |
| Hosting | Cloudflare Pages production deployment connected to GitHub (`https://dayplan.pages.dev/`) |
| Source control | Private GitHub repository |

Supabase handles authentication and data, while Cloudflare Pages deploys every push to `main` automatically. The deployment naming and service inventory live in `docs/deployment.md` and must be updated when a provider, URL, project name, or repository name changes.

## 6. Data model (initial)

All user-owned tables have `user_id`, Row Level Security, timestamps, and no cross-user reads.

| Entity | Core fields | Notes |
| --- | --- | --- |
| `profiles` | `id`, `timezone`, `theme` | Extends the authenticated user. |
| `routines` | `id`, `name`, `color`, `sort_order`, `started_on`, `archived_at` | One persistent routine per user. |
| `routine_completions` | `id`, `routine_id`, `completed_on`, `note` | Unique `(routine_id, completed_on)` enforces one cell per day. |
| `daily_tasks` | `id`, `task_date`, `title`, `notes`, `due_time`, `priority`, `sort_order`, `completed_at`, `archived_at`, `carried_from_id` | A copied carry-forward task references its source. |

Add `started_on` to `routines` and sync metadata/version fields where needed. Running counts are calculated from completion dates in the displayed week, rather than stored. This guarantees correct renumbering after an edit.

## 7. Delivery roadmap

### Phase 0 — Product foundation

- [x] Create private GitHub repository.
- [x] Create Supabase project and configure local/dev environment variables.
- [x] Initialise React/TypeScript/Vite app and production build baseline.
- [x] Connect Cloudflare Pages to the repository and create the production deployment at `https://dayplan.pages.dev/`.
- [x] Build application shell, responsive layout, theme, authentication, and empty states.
- [ ] Build first-use setup, a Today shortcut, standard confirmation/undo feedback, and sync-status patterns.
- **Exit condition:** a signed-in user reaches a protected app shell; preview deployment works.

### Phase 1 — Routine Tracker core

- [ ] Add schema, migrations, RLS policies, and seed/development helpers.
- [ ] Build month/week navigation and deterministic weekly date generation.
- [ ] Build routine CRUD, colours, archive, search, and persistent manual ordering. (CRUD, colours, archive, and search complete; manual reorder pending.)
- [ ] Add started dates so new routines do not rewrite historical weeks.
- [ ] Build desktop/mobile tracker grid, single-tap completion, undo, totals, and automatic renumbering.
- [ ] Add optimistic updates and retry-safe error feedback.
- **Exit condition:** routines and weekly history survive refresh, device change, edits, and reordering.

### Phase 2 — Daily Tasks core

- [ ] Build date navigation, task creation/editing, priorities, notes, and ordering.
- [ ] Add same-day duplicate awareness, due-time ordering, and overdue visual state.
- [x] Build date navigation, task creation, priorities, due-time entry, and due-time ordering.
- [x] Add same-day duplicate awareness and accessible explicit carry-forward action.
- [x] Build pending/completed sections and daily summary.
- [ ] Implement mobile swipe-left completion and swipe-right carry-forward gestures (explicit action buttons are complete).
- [ ] Add daily/history search and archiving.
- **Exit condition:** a carried-forward task appears correctly tomorrow while the original remains in its historic day.

### Phase 3 — Polish and release readiness

- [ ] Add routine statistics and completion notes UI.
- [ ] Refine empty/loading/offline/conflict states and mobile touch targets.
- [ ] Test keyboard navigation, screen readers, light/dark contrast, and gestures.
- [ ] Add unit tests for date boundaries, counts, reorder logic, carry-forward, and RLS integration checks.
- [ ] Add privacy copy, app icon, metadata, and production monitoring.
- **Exit condition:** all V1 acceptance checks pass on phone and desktop, using a production-like Supabase environment.

## 8. Acceptance checks

- A routine cell can be toggled in one interaction and reflects the correct count immediately.
- Removing any completion causes later weekly counts to renumber consecutively.
- Weekly totals always equal the number of completed cells in that row.
- New weeks render without manual creation and past weeks never disappear.
- Routine order, colours, archive state, and task order persist after reload/login on another device.
- Completing a daily task moves it into the day’s completed section without deleting it.
- Carry forward creates exactly one pending task on the following date and preserves source history.
- No user can read or write another user’s data.
- Core flows work comfortably at phone width and on desktop.

## 9. Working rules for this document

- Add every new feature request to **Deferred** or a new planned phase before implementation.
- Mark work complete only with a short evidence note (test, manual scenario, or deployed preview).
- Record changes to product decisions in a dated changelog below.
- Keep secrets out of the repository; only commit an `.env.example` with variable names.

## 10. Changelog

| Date | Change | Status / evidence |
| --- | --- | --- |
| 2026-07-25 | Created initial V1 plan from product brief. | Planning complete; implementation not started. |
| 2026-07-25 | Added mobile-first and enterprise-grade UI/UX standards. | Required for all future implementation and QA. |
| 2026-07-25 | Added workflow-led product improvements, recovery rules, and core user journeys. | V1 essentials and post-V1 scope clarified. |
| 2026-07-25 | Implemented Phase 0 foundation and applied the initial Supabase migration. | Production build passed; Cloudflare Pages connection remains pending. |
| 2026-07-25 | Added routine search, rename, colour controls, archive flow, and local-calendar date handling. | Production build passed. |
| 2026-07-25 | Renamed user-facing product branding to DayPlan. | Browser title, primary in-app branding, and living documentation updated. |
| 2026-07-25 | Replaced magic-link sign-in with email and password authentication for private family use. | Supabase email confirmation disabled; removes the shared free magic-email rate limit from normal sign-in. |
| 2026-07-25 | Replaced the mobile routine spreadsheet with a phone-first daily routine list. | Seven-day history is retained as compact progress markers; full titles, completion control, and weekly total fit without horizontal scrolling. |
