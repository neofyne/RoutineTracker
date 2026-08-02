# DayPlan — Living Product & Implementation Plan

**Status:** Active living plan — updated 28 July 2026
**Purpose:** The single maintained plan for scope, decisions, delivery progress, and later feature additions.

## 1. Product statement

DayPlan is a calm, spreadsheet-like personal productivity app with two deliberately separate modes:

1. **Routine Tracker** for recurring practices, recorded in weekly grids with a per-routine running completion count.
2. **Daily Tasks** for one-time tasks, organised by date with quick completion and a deliberate Move to tomorrow action.
3. **Statistics** for compact, date-ranged progress metrics without changing the underlying history.

The app should feel fast, focused, and premium rather than gamified or visually noisy. It must retain all history and restore it after a device change.

## 1.1 Experience and design standard

**Mobile is the primary experience.** Every core interaction must be designed, built, and tested at phone width before desktop enhancement. Desktop can expose more of the spreadsheet at once, but must never be the source of truth for the layout or interaction model.

The visual direction is **enterprise-grade personal productivity**: calm, precise, trustworthy, and highly legible. It should use purposeful visual guidance—clear icons, status colour, touch feedback, empty-state illustrations or diagrams only where they clarify an action—rather than decorative clutter. The goal is the confidence and polish of a leading productivity product, while keeping the speed of a lightweight spreadsheet.

### UX principles

- **Glanceable first:** today, progress, totals, dates, and next actions are understandable without reading dense instructions.
- **Thumb-friendly:** primary actions are reachable, targets are at least 44 x 44 px, and drag/swipe interactions have visible alternatives.
- **Progressive disclosure:** keep the grid and task list simple; place editing, notes, archive, and advanced controls behind a focused sheet or menu.
- **Immediate feedback:** completion, undo, Move to tomorrow, sync, and errors are visible and never leave the user guessing.
- **Accessible by default:** strong contrast in both themes; colour is never the only status signal; keyboard and screen-reader flows work alongside touch gestures.
- **Consistent modules:** reusable cards, sheets, controls, date navigators, empty states, and confirmation patterns behave the same throughout the app.

### Mobile layout rules

- Routine Tracker has two coordinated views: **Today** for fast one-tap completion and **Week** for the complete seven-day sheet.
- On mobile, each weekly routine is a full-width card: its complete name and weekly total sit above seven equal day cells. This preserves the original grid logic without squeezing names, days, and totals into one narrow row.
- Completed weekly cells use the routine colour and show the recalculated running count. Every day remains available for deliberate backfilling; archived routines are read-only.
- A compact mobile header shows the current week and the most important action, with secondary actions in a bottom sheet or overflow menu.
- Daily Tasks prioritises a large, fast add field and clear pending/completed blocks; long-press actions always have an equivalent labelled menu action.
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
- Create, rename, colour, reorder, archive, and delete routines. Reordering uses a dedicated compact mode with touch drag handles, auto-scroll, keyboard arrows, and persistent saved order.
- A tap toggles a daily completion. Completed cells use the routine colour and display its running number within that week.
- Removing a completion recalculates all later running numbers in the week.
- Weekly total per routine; month and lifetime completion totals in routine details/statistics.
- Search active and archived routines.
- Optional note attached to a completion (included in the data design; UI can follow after the core grid).

### Daily Tasks

- Separate date-based task lists, with history preserved indefinitely.
- Create, edit, prioritise, reorder, complete, archive, and search one-time tasks.
- Clear pending/completed sections and a `completed / total` daily summary.
- Tap the completion control to move an item between Pending and Completed.
- Long press (mobile) opens a task action menu. The same actions remain available through the three-dot menu for accessibility and discoverability.
- **Move to tomorrow** changes the task’s date, removes it from today, and preserves the same task record.
- Date navigation for today, history, and future carried-forward tasks.
- **Bring pending to today** lets the user choose any earlier date, previews its unfinished one-time tasks, and moves those existing rows to today in one confirmed action. Recurring routines are not copied or auto-completed; they already remain available on today’s routine view.

### Foundation

- Sign-in and secure per-user cloud sync.
- Responsive mobile-first UI with desktop spreadsheet comfort.
- Light and dark themes.
- Loading, empty, offline, and error states.
- Week changes are view filters only: routine completions and dated tasks remain stored by their own dates and are never reset when the calendar week changes.
- Statistics presets: today, yesterday, 7 days (default), 15 days, 30 days, year, and custom date range. The primary metric is completed tasks out of all tasks in the selected period.

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
| Clear undo | Removes fear of fast actions. | Every completion, removal, archive, and Move to tomorrow action shows a brief undo message. Undo restores the exact prior state. |
| Safe destructive actions | Prevents accidental data loss. | Archive is the default; permanent deletion requires confirmation and explains what history is affected. |
| Routine availability date | Keeps old history truthful. | A routine has a `started_on` date. It appears from that date forward; earlier weeks do not imply it was missed. Archived routines remain visible but muted in past history. |
| Intentional missed days | Distinguishes “not tracked” from “not done.” | V1 leaves untouched cells neutral. A future optional status can mark a day as skipped; it must not inflate totals or counts. |
| Move-to-tomorrow menu | Prevents surprise duplicates and an always-visible confusing button. | A deliberate long press opens the task action menu; **Move to tomorrow** changes the task date. The same action is available in the three-dot menu and supports Undo. |
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

1. The user adds, renames, recolours, archives, or deletes a routine from a focused edit sheet.
2. New routines begin from their creation/start date; prior weeks remain accurate.
3. Archiving hides a routine from current tracking but keeps it visible in historical context and search.
4. Restoring an archived routine retains its colour, order, and past completions.

### C. Daily task capture and execution

1. The user opens Daily Tasks; Today is the default view with a prominent quick-add field.
2. They add a simple task immediately, with details such as time, note, and priority available but not required.
3. Completing a task moves it to the day’s Completed section and updates the summary. Undo is always available.
4. Moving a task to tomorrow updates its date, removes it from today’s list, and immediately makes it visible tomorrow. Undo restores it to the original date.
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
| Move to tomorrow | Updates the existing task’s date and removes it from today | Matches the expected mental model, avoids duplicates, and keeps Undo straightforward. |
| Timezone | Saved user preference, initially device timezone | Determines date rollover and midnight behaviour. |

**Open choices for the product owner:** whether an archived routine should remain visible in historical weeks (recommended: yes, muted), and whether a carried-forward task should retain a link to its original task (recommended: yes, internally).

## 5. Recommended technical approach

| Area | Choice |
| --- | --- |
| Front end | React + TypeScript + Vite |
| UI | Tailwind CSS plus accessible, custom spreadsheet/task components |
| Data and auth | Supabase (Postgres, Auth, Row Level Security) |
| Data fetching/offline UX | TanStack Query with optimistic updates and persisted cache |
| Gestures | Pointer-event long-press interaction with movement cancellation, designed alongside the three-dot menu alternative |
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
| `daily_tasks` | `id`, `task_date`, `title`, `notes`, `due_time`, `priority`, `sort_order`, `completed_at`, `archived_at`, `carried_from_id` | Move to tomorrow updates `task_date` on the same row. `carried_from_id` remains only for backward compatibility with previously copied tasks. |

Add `started_on` to `routines` and sync metadata/version fields where needed. Running counts are calculated from completion dates in the displayed week, rather than stored. This guarantees correct renumbering after an edit.

## 7. Delivery roadmap

### Immediate release 1.1 — Data reliability and mobile interaction correction

**Status:** Implemented and deployed to production on 26 July 2026.
**Goal:** remove the behaviours that make DayPlan feel unreliable before adding any further feature scope.

#### Confirmed findings and product decisions

| Report | Current cause / evidence | Planned behaviour |
| --- | --- | --- |
| Reloading Daily Tasks returns to Routines | The app initialises the active module to `routines`; the module and selected date are not stored in the URL or restored after reload. | Put the active module and selected date in lightweight URL state, with a saved last-view fallback. Reload, browser back/forward, and reopening the installed app restore the same module and date. |
| Tasks disappear or reappear only after reload | Root cause is not yet proven. The current list has no loading state, request sequencing, or reconciliation after every mutation, so a slow/stale response can look like an empty list. | Begin with a Supabase row audit and a reproducible task lifecycle. Then add explicit loading/error states, stale-request cancellation, mutation reconciliation, and a visible saved/failed result. Never display a premature “empty day” while a request is unresolved. |
| The visible **Tomorrow** button is confusing | The current action inserts a copy and keeps the original today, which conflicts with the requested workflow. | Remove the visible button. Long press opens an action menu with **Move to tomorrow**; the same action appears in the three-dot menu. It updates the existing task date, removes it from today, adds it tomorrow, and offers Undo. |
| Move earlier/later is too slow | The settings sheet exposed two serial-order buttons, which made multi-position changes tedious. | Keep both controls out of routine settings. A dedicated compact **Reorder** mode exposes drag handles on phone and desktop, auto-scrolls during long moves, supports keyboard arrows, and saves after every drop. |
| Adding a routine can require a second tap and then create duplicates | Routine saving has no in-flight lock, so repeated taps can submit the same insert before the first response closes the sheet. | The first tap immediately enters a visible **Adding…** state and disables all repeat submission. Close the sheet only after one confirmed insert; on failure, keep it open with a retry message. |
| “Today” is awkwardly placed below the Daily Tasks date | The page heading already says Today, while the date navigator repeats Today as a second centred line. | Remove the redundant line for the current date. Past/future dates use a small, separately tappable **Return to today** action. |
| “Week of 20 Jul” is unnecessary | The seven date cells already communicate the cycle, and ordinal week labels become ambiguous across month boundaries. | Remove “Week of…”. Show the month/year and the seven-day calendar strip; Week view keeps the explicit date range. |

#### Implementation order

1. **Protect and audit task data**
   - Reproduce add, complete, edit, date navigation, reload, and move flows against the affected family account.
   - Inspect the corresponding Supabase rows before and after each step to distinguish missing data from stale rendering.
   - Add a task-loading state, request identity/cancellation, and a single reload/reconcile path used after mutations.
   - Keep the last confirmed task list visible during a refresh; show a clear error and Retry if the request fails.

2. **Persist navigation context**
   - Represent module and date as URL state, for example `?view=tasks&date=2026-07-26`.
   - Restore the selected module/date before rendering protected content so the app never flashes or lands on the wrong module.
   - Support browser back/forward and retain Today as the default only for a genuinely new session with no saved state.

3. **Replace copy-to-tomorrow with an intentional move**
   - Open the existing task action sheet after a 500 ms long press; cancel when the finger moves enough to indicate scrolling.
   - Keep the three-dot action as the accessible, discoverable alternative.
   - Update the same task row’s `task_date` instead of inserting a duplicate.
   - Optimistically remove it from today, confirm it exists tomorrow, and offer Undo that restores the original date.
   - Guard the mutation so repeated long presses or taps cannot move the task twice.

4. **Make routine creation single-submit and simplify routine settings**
   - Add a submission mutex and **Adding… / Saving…** button state.
   - Reconcile the returned row by ID so a success can be rendered only once.
   - Remove Move earlier and Move later from the sheet and delete the unused UI handler.
   - Put ordering in a dedicated compact Reorder mode so the normal completion view stays focused.
   - Allow handle-only touch dragging with edge auto-scroll and keyboard-arrow fallback; persist each completed move.

5. **Clean up date hierarchy**
   - Remove the duplicate Today subtitle from Daily Tasks.
   - Remove “Week of…” from Routines and let the month/year plus seven-day strip provide the calendar context.
   - Verify the hierarchy with the keyboard open and closed on iPhone-sized screens.

6. **Regression and release gate**
   - Test Safari on iPhone, the saved home-screen app, the in-app browser, and desktop.
   - Repeat add/reload/navigation scenarios under normal, slow, interrupted, and recovered network conditions.
   - Ship only after the acceptance checks below pass against production-like Supabase data.

#### Release 1.1 acceptance checks

- [x] Reloading while Daily Tasks is active returns to Daily Tasks on the same selected date.
- [x] Adding a task and reloading 20 times never hides or duplicates the confirmed Supabase row.
- [x] Loading is visually distinct from a genuinely empty day; a failed fetch never masquerades as “0 tasks.”
- [ ] A long press opens the task action menu without firing during normal vertical scrolling. (Movement-cancel logic is implemented; final physical iPhone touch QA remains.)
- [x] **Move to tomorrow** removes exactly one task from today, creates no duplicate row, shows it tomorrow, and can be undone.
- [x] The three-dot task menu exposes the same move action for users who do not discover or cannot use long press.
- [x] One routine submission creates exactly one row; the Add button cannot be submitted twice while saving.
- [x] Routine settings contain no Move earlier or Move later controls.
- [x] A dedicated Reorder mode supports phone-width handle dragging, auto-scroll, keyboard arrows, and persistent saved order without interfering with routine completion.
- [x] Daily Tasks does not repeat Today beneath the full date.
- [x] The routine calendar contains no “Week of…” subtitle and remains understandable as a seven-day cycle.

**Local verification evidence:** the real `Dub Reel` and `Make Tracks` rows were found intact on 25 July rather than deleted. Daily Tasks and 25 July restored correctly in 20/20 consecutive reloads and through browser back navigation. `Dub Reel` was moved to 26 July, verified there, then restored with Undo. Two simultaneous submissions of a temporary routine created one row, which was removed after the test. The production build passes with no browser console errors.

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
- [ ] Build routine CRUD, colours, archive, search, and dedicated handle-based reordering.
- [ ] Add started dates so new routines do not rewrite historical weeks.
- [ ] Build desktop/mobile tracker grid, single-tap completion, undo, totals, and automatic renumbering.
- [ ] Add optimistic updates and retry-safe error feedback.
- **Exit condition:** routines and weekly history survive refresh, device change, and edits.

### Phase 2 — Daily Tasks core

- [ ] Build date navigation, task creation/editing, priorities, notes, and ordering.
- [ ] Add same-day duplicate awareness, due-time ordering, and overdue visual state.
- [x] Build date navigation, task creation, priorities, due-time entry, and due-time ordering.
- [ ] Replace the current visible copy-forward button with transactional Move to tomorrow, long press, menu alternative, and Undo.
- [x] Build pending/completed sections and daily summary.
- [ ] Implement long-press task actions with a three-dot menu alternative and transactional Move to tomorrow.
- [ ] Add daily/history search and archiving.
- **Exit condition:** a carried-forward task appears correctly tomorrow while the original remains in its historic day.

### Phase 3 — Polish and release readiness

- [x] Add a brief two-note success chime after a confirmed task/routine creation or completion.
- [ ] Add routine statistics and completion notes UI.
- [ ] Refine empty/loading/offline/conflict states and mobile touch targets.
- [ ] Test keyboard navigation, screen readers, light/dark contrast, and gestures.
- [ ] Add unit tests for date boundaries, counts, single-submit protection, Move to tomorrow, and RLS integration checks.
- [ ] Add privacy copy, app icon, metadata, and production monitoring.
- **Exit condition:** all V1 acceptance checks pass on phone and desktop, using a production-like Supabase environment.

## 8. Acceptance checks

- A routine cell can be toggled in one interaction and reflects the correct count immediately.
- Removing any completion causes later weekly counts to renumber consecutively.
- Weekly totals always equal the number of completed cells in that row.
- New weeks render without manual creation and past weeks never disappear.
- Routine order, colours, archive state, and task order persist after reload/login on another device.
- Routine reordering works from a dedicated phone-width mode, does not hijack normal page scrolling, and exposes keyboard-arrow controls as an accessible alternative.
- Completing a daily task moves it into the day’s completed section without deleting it.
- Move to tomorrow updates exactly one task row, removes it from the source date, shows it on the following date, and can be undone.
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
| 2026-07-25 | Rebuilt DayPlan around coordinated Today and Week views. | Phone-width browser QA confirms full routine names, seven tappable day cells, running counts, totals, undo, dedicated edit sheets, archive/restore, colour, reorder controls, and no title-to-rename shortcut. Daily Tasks now uses the same card, date-navigation, and edit-sheet system. |
| 2026-07-25 | Prevented iPhone zoom when opening routine and task settings. | Settings sheets no longer auto-focus their title field; all mobile form controls use a Safari-safe 16px text size. |
| 2026-07-26 | Planned Release 1.1 reliability and mobile-interaction correction from family phone testing. | Plan covers task persistence auditing, module/date reload restoration, long-press Move to tomorrow with menu alternative and Undo, single-submit routine creation, removal of routine reorder controls, and simplified date labels. Implementation pending. |
| 2026-07-26 | Implemented Release 1.1 reliability and interaction corrections locally. | 20/20 reload test passed; real task move/Undo and duplicate-submit cleanup passed; production build and browser console checks passed. Physical iPhone long-press/scroll QA remains before closing the release. |
| 2026-07-26 | Added a dedicated routine Reorder mode after family feedback restored ordering to V1. | Compact full-name rows use handle-only phone/desktop dragging, edge auto-scroll, keyboard-arrow fallback, and save the order after each completed move; Move earlier/later remains absent from routine settings. |
| 2026-07-26 | Deployed the Reorder mode and Release 1.1 fixes to Cloudflare Pages production. | `https://dayplan.pages.dev/` returned HTTP 200 and served the exact built `index-B8cASWt2.js` and `index-HdpleOjT.css` assets; Cloudflare deployment `f8e8c642.dayplan.pages.dev` completed successfully. |
| 2026-07-28 | Added success audio feedback for confirmed task/routine creation and completion. | A compact two-note browser chime is generated locally with Web Audio; it has no network or asset dependency. |
| 2026-07-28 | Made confirmation sound playback reliable on WebKit. | The audio context is resumed during the original tap and the chime waits for that resume to complete after a confirmed save. |
| 2026-07-28 | Consolidated routine-setting secondary actions into one row. | Archive and Delete now sit side by side in the routine sheet; Delete retains its distinct danger treatment. |
| 2026-07-28 | Moved the Today-routine overflow menu below the weekly `total / 7` score. | The actions now occupy one compact vertical column, preserving more room for routine titles and completion detail. |
