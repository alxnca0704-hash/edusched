# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

Complete — Fixed Day-Pair Scheduling (MW / TTh)
(extend the spec 05 generator so each subject meets twice a week as a
linked pair on a chosen day pattern: `"MW"` Mon+Wed or `"TTh"` Tue+Thu)

## Current Goal

Replaced `meetingsPerWeek` with a `dayPattern` (`"MW" | "TTh"`) on every
Subject: the subject form picks the pattern, the CSP places each subject's
two sessions as a linked pair (same time + same room on both pattern days)
by solving only the time, and the schedule tables group subjects into one
row with a pattern badge. Migration `backfillSubjectDayPatterns` converted
the live dev subjects (SE 101, HCI 101, OS 101 → `"MW"`). Schema restored
to strict (`dayPattern` required, `meetingsPerWeek` removed). GA updated to
pair-atom chromosomes but still not wired in (soft constraints out of
scope). Loading/empty/error/infeasible states per code-standards; lint +
build pass.

## Completed

- Initial project scaffold (Next.js 16 + Convex + Clerk)
- Convex user synchronization and user schema (upsert by Clerk user id)
- Role-based routing and dashboards for Dean and Teacher roles
- Installed shadcn (`init --defaults`, style `base-nova`, base: Base UI)
  — generated `components.json`, `lib/utils.ts`, `components/ui/*`
- Installed `lucide-react` (done by shadcn init; iconLibrary = lucide)
- Added shadcn sidebar + deps (button, input, separator, skeleton,
  tooltip, sheet, `hooks/use-mobile.ts`)
- Added dean nav routes to `constants/routes.ts`:
  `APP_ROUTES.deanRooms` ("/dean/rooms"), `APP_ROUTES.deanSubjects`
  ("/dean/subjects")
- Built `components/DeanSidebar.tsx` — shadcn Sidebar (`collapsible="icon"`)
  with lucide icons: Dashboard, Manage Rooms, Manage Subjects; uses
  `usePathname` for active state; links via `next/link`
- Built `app/dean/layout.tsx` — `SidebarProvider` + `DeanSidebar` +
  content column with `SidebarTrigger`; gateway `requireRole(ROLES.dean)`
  for every dean route
- Root layout now defines `--app-header-height` (3.5rem) on `<body>`;
  `AppHeader` uses it, and the Dean sidebar offsets below the white header
  so it never overlaps top chrome
- **Dean Subject CRUD (spec 02)** — full unit:
  - Installed shadcn `table`, `badge`, `dialog`, `select`, `label`,
    `alert-dialog` primitives; added `zod` dependency
  - Added `subjects` table to `convex/schema.ts` (name, durationMinutes,
    meetingsPerWeek, roomType `lecture|lab`, teacherId = Clerk user id,
    createdAt/updatedAt) + `by_teacherId` index; added `by_role` index on
    `users` for teacher lookup
  - `convex/subjects.ts` — `listAll` (subjects joined with teacher name),
    `getTeachers` (dropdown options), `create` / `update` / `remove`
    mutations; all write mutations gate on Dean identity; teacherId is
    verified against an existing `role=teacher` user; queries return a
    `{ ok, data } | { ok: false, error }` Result union (never throw)
  - `types/subjects.ts` (`Subject`, `SubjectListItem`, `SubjectFormValues`,
    `TeacherOption`, `RoomType`), `constants/subjects.ts` (`ROOM_TYPES`,
    `ROOM_TYPE_LABELS`), `lib/validation/subject.ts` (zod
    `subjectFormSchema`)
  - `lib/result.ts` — `Result<T>` union + `errorMessage` helper
  - `components/shared/EmptyState.tsx` and `components/shared/ErrorState.tsx`
    (Skeleton-based, per code-standards)
  - `hooks/useSubjects.ts` — one hook per page: subjects + teachers queries,
    `isLoading`/`isEmpty`/`error`, `addSubject`/`updateSubject`/`deleteSubject`
  - `components/subjects/SubjectManagement.tsx` (search, add/edit/delete
    wiring, table with Category badge column + icon actions, Skeletons),
    `SubjectFormDialog.tsx` (add/edit modal, zod validation, controlled Base
    UI selects), `SubjectDeleteDialog.tsx` (confirm + inline error)
  - `app/dean/subjects/page.tsx` now renders `<SubjectManagement />`
  - Fixed vendored `hooks/use-mobile.ts` `react-hooks/set-state-in-effect`
    lint error — rewrote with `useSyncExternalStore` (SSR-safe, no effect
    setState)
  - **Role claim fix** (teacher assignment was empty): Clerk's JWT carries
    the role at `metadata.role`, but Convex read `identity.role` (top-level)
    → `upsertUser` stored no role and `isDean` was false, so `listAll`/
    `getTeachers` returned empty and mutations threw Unauthorized. Added
    `convex/roles.ts` (`roleOf` reads `metadata.role ?? role`, `isDean`),
    used by `users.ts` and `subjects.ts`. Existing users re-patch their role
    on next `useUserSync` page load.
  - **Teacher sync from Clerk**: teacher dropdown was disabled because
    Convex `users` had no `role=teacher` rows unless the teacher had logged
    in after the role fix. Added `convex/teachers.ts` —
    `syncFromClerk` action calls the Clerk API (`users?limit=500`, paginated,
    filtered to `public_metadata.role === "teacher"`) and upserts them via
    `upsertTeacher`; set `CLERK_SECRET_KEY` as a Convex deployment env var;
    `getTeachers` query + `listAll` teacher-name join moved to read Convex.
    `useSubjects` triggers the action once per session; teacher select is no
    longer disabled.
  - **Teacher names**: dropdown + subjects table display "First Last"
    from Clerk (`firstName`/`lastName`, email only as fallback);
    `scripts/seed-users.ts` now sets first/last names for the seeded
    accounts so Clerk always carries them (run against live Clerk).
  - Verified: `npm run lint` (0 errors), `npm run build` passes
- **Dean Room CRUD (spec 03)** — full unit:
  - Added `rooms` table to `convex/schema.ts` (name, type
    `lecture|lab`, createdAt/updatedAt)
  - `convex/rooms.ts` — `listAll` (Result union), `create` / `update` /
    `remove` mutations; all write mutations gate on Dean identity
  - Moved `RoomType`/`ROOM_TYPES`/`ROOM_TYPE_LABELS` from
    `types/subjects.ts`+`constants/subjects.ts` into
    `types/rooms.ts`/`constants/rooms.ts` (deleted
    `constants/subjects.ts`); `subjects` now imports them from rooms
  - `types/rooms.ts` (`Room`, `RoomFormValues`),
    `lib/validation/room.ts` (zod `roomFormSchema`)
  - `hooks/useRooms.ts` — one hook per page: listAll query,
    `isLoading`/`isEmpty`/`error`, `addRoom`/`updateRoom`/`deleteRoom`
  - `components/rooms/RoomManagement.tsx` (search + add/edit/delete
    wiring, table with Category badge column + icon actions, Skeletons),
    `RoomFormDialog.tsx` (add/edit modal, zod validation, controlled
    Base UI select), `RoomDeleteDialog.tsx` (confirm + inline error)
  - `app/dean/rooms/page.tsx` now renders `<RoomManagement />`
  - **Subjects now select a real Room** (spec 03): `subjects.roomType`
    replaced with `subjects.roomId` (Convex `v.id("rooms")`); the
    subject form's hard-coded Lecture/Lab select is now a "Room" select
    populated from `api.rooms.listAll`; `listAll` joins rooms to expose
    `roomName`/`roomType`; create/update validate the room exists;
    `useSubjects` exposes `rooms` for the form; the subjects table shows
    the Category badge + connected room name and search covers it
  - Verified: `npm run lint` (0 errors), `npm run build` passes
- **Legacy subjects schema fix (post spec 03)** — resolved, live:
  - Existing subject docs (created pre-spec-03) stored `roomType` and had
    no `roomId`, so Convex schema validation failed on every push
    (missing `roomId`; the extra `roomType` field was also rejected once
    `roomId` was optional). Fixed the stored data, not the code:
  - Added `convex/migrations.ts` — internal, idempotent
    `backfillSubjectRoomIds`: for each subject missing `roomId`, reuse an
    existing room of the subject's stale type or create a `Legacy
    <Type>` fallback room, then `ctx.db.replace` the doc with `roomId`
    (drops the stale `roomType`)
  - Ran it against dev (astute-akita-425): temporarily relaxed the
    schema (`roomId`/`roomType` optional) so the migration could deploy
    and run — the strict push would otherwise block on the invalid doc.
    After backfill (1 doc, `SE 101` → created `Legacy Lab`), restored
    the strict schema and re-pushed; validation now passes.
  - Verified `subjects` and `rooms` via `npx convex run --inline-query`
    (inline-query sandbox works if double quotes are written as single
    quotes in PowerShell 5.1, which otherwise strips `"` from native
    args); `npm run lint` (0 errors), `npm run build` passes
- **Teacher Availability (spec 04)** — full unit:
  - Installed shadcn `toggle`, `toggle-group`, `sonner` via CLI (deps
    added: `sonner`, `next-themes`)
  - Added `availability` table to `convex/schema.ts` (teacherId = Clerk
    user id, blockedSlots `string[]`, createdAt/updatedAt) +
    `by_teacherId` index
  - `convex/availability.ts` — `getMine` query + `setMine` mutation;
    both gate on teacher role (`roleOf`); `getMine` returns the doc's
    `blockedSlots` (or `[]`); `setMine` validates every slot key against
    known bounds (6 days × 12 slots) before upserting (insert or patch)
  - Slot keys are strings `"<dayIndex>-<timeIndex>"` — `0..5` =
    Mon–Sat, `0..11` = 7:30 AM–7:30 PM 60-min slots (bounds updated by the
    school-hours unit — the validator derives them from
    `constants/availability.ts` now, no plain-number copies)
  - `types/availability.ts` (`AvailabilityDay`, `AvailabilityTimeSlot`,
    `AvailabilitySlotKey`) + `constants/availability.ts`
    (`AVAILABILITY_DAYS`, `AVAILABILITY_TIME_SLOTS`,
    `availabilitySlotKey` / `parseAvailabilitySlotKey` /
    `availabilitySlotLabel`)
  - `hooks/useAvailability.ts` — one hook per page: `getMine` query,
    `isLoading`/`isEmpty`/`error`/`isSaving`, `save` mutation (stable
    `EMPTY_BLOCKED` reference so the page can hydrate draft without
    render loops)
  - `components/availability/AvailabilityGrid.tsx` (toggle grid via
    shadcn `Toggle` + `Tooltip` per cell, horizontally scrollable on
    small screens, `overflow-x-auto` + `min-w-[42rem]`),
    `AvailabilityGridSkeleton.tsx` (matching grid-shaped Skeletons),
    `AvailabilityPage.tsx` (page-level component: draft `Set` state
    hydrated once from the hook, Save persists full set, Reset reverts,
    sonner toasts, inline blocked-count summary, `ErrorState` retry)
  - **Sidebar refactor**: extracted shared `components/shared/AppSidebar.tsx`
    (takes `groups` prop) — `DeanSidebar` now wraps it with `DEAN_NAV`;
    added `components/TeacherSidebar.tsx` with `TEACHER_NAV`
    (Dashboard / Availability / My Schedule); no duplicated sidebar code
  - New routes: `APP_ROUTES.teacherAvailability` (`/teacher/availability`),
    `APP_ROUTES.teacherSchedule` (`/teacher/schedule`)
  - `app/teacher/layout.tsx` — `SidebarProvider` + `TeacherSidebar` +
    content column, `requireRole(ROLES.teacher)` (mirrors dean layout;
    plain `<div>` for content, no nested `<main>`)
  - `app/teacher/availability/page.tsx` renders `<AvailabilityPage />`;
    `app/teacher/schedule/page.tsx` is a `"use client"` placeholder
    (EmptyState) so the My Schedule nav link doesn't 404 (no real
    schedule yet)
  - Mounted `components/ui/sonner` `<Toaster position="top-right" />` in
    the root `app/layout.tsx` (inside the main column) for save/error
    toasts
  - Fixed runtime issue caught after build: passing a lucide icon
    component from a Server Component page into client `EmptyState` is
    not allowed (`Only plain objects can be passed to Client Components`)
    → schedule page is now a client component
  - Verified: `npm run lint` (0 errors — only pre-existing warnings in
    `convex/_generated/*` and `convex/auth.config.ts`), `npm run build`
    passes; `convex codegen` pushed the schema/functions to dev; ran
    `availability:getMine` (ok/empty unauthenticated) and
    `availability:setMine` (throws Unauthorized as expected) via
    `npx convex run`
- **Schedule Generation (spec 05)** — full unit:
  - Pure scheduling engine in `convex/scheduling/` (zero Convex imports,
    runs under plain `tsx`): `types.ts` (`SchedulingInput`, `PlacedSession`,
    `CspInfeasibleReason`, `CspResult`, `GaOptions`), `util.ts`
    (`intervalsOverlap`), `csp.ts` (`runCSP` backtracking search +
    `buildSessionUnits` + `greedyDecode` + `validateSchedulingInput`),
    `validate.ts` (`validateSolution` hard-constraint check), `ga.ts`
    (`runGA` permutation GA with greedy decode, valid-by-construction)
  - CSP decides the schedule (always runs). Hard constraints: no
    double-booked teacher, no double-booked room, room type must match the
    subject's room, subject never in a teacher-blocked slot, every subject
    placed exactly `meetingsPerWeek` sessions of `durationMinutes` each.
    Soft constraints (day spread, idle gaps, workload) are GA fitness only —
    not enforced by CSP.
  - Time model = the availability grid (Mon–Sat × 12 × 60-min, 7:30 AM–7:30 PM);
    `durationMinutes` must be a whole multiple of the 60-min slot
    (SE 101 = 180 min = 3 consecutive slots). Grid bounds come from
    `constants/availability.ts` only.
  - `convex/schema.ts`: new `schedules` table — one row per placed session
    (subjectId/Name, teacherId/Name, roomId/Name, roomType, dayIndex,
    startMinutes, endMinutes, createdAt/updatedAt) + `by_teacherId` index;
    an atomic snapshot — regenerating clears and rewrites all rows
  - `convex/schedule.ts`: `generate` action (Dean-gated) reads
    `rooms.listAll`/`subjects.listAll` queries + internal `listAvailability`,
    maps to a `SchedulingInput`, runs `runCSP`, defensively re-validates the
    result, then `saveGenerated` (internal mutation) clears old rows and
    inserts the new timetable in one transaction; returns
    `{ ok, count } | { ok: false, error }` (error = CSP infeasibility reason
    message). `listAll` query (Dean-gated, Result union) feeds the page.
  - `hooks/useSchedule.ts` — one hook per page: `listAll` query +
    `useAction(api.schedule.generate)`, `isLoading`/`isEmpty`/`error`/
    `isGenerating`/`generateError`/`generate`; sessions sorted Mon→Sat then
    by start time (`byTimeOfWeek`)
  - `types/schedule.ts` (`ScheduleSession`, `GenerateScheduleResult`),
    `constants/routes.ts` `APP_ROUTES.deanSchedule` (`/dean/schedule`),
    DeanSidebar "Generate Schedule" item (CalendarCog, Manage group)
  - `components/schedule/ScheduleTable.tsx` (Subject / Teacher / Room + type
    Badge / Day / Time via `AVAILABILITY_DAYS` + `formatClock`),
    `ScheduleTableSkeleton.tsx`, `SchedulePage.tsx` (loading → skeleton,
    query error → `ErrorState` + reload retry, generate failure →
    `ErrorState` retry = re-generate, empty → `EmptyState` + Generate button,
    else table; sonner success/error toasts; spinner while generating);
    `app/dean/schedule/page.tsx` renders `<SchedulePage />`
  - Fixed along the way: `constants/availability.ts` now imports
    `types/availability` relatively (Convex's tscc can't resolve `@/` inside
    `convex/`-imported files); explicit result type annotations in `generate`
    to break TS weather inference circularity on same-module helpers
  - Verification: `scripts/scheduling-smoke-test.ts` (`npx tsx`) — 14/14
    assertions: feasible case (8 sessions, zero violations), GA output stays
    valid vs CSP seed, blocked-slot respect, capacity overflow →
    `exhausted`, non-multiple-of-60 → `invalid-duration`, fully-blocked
    teacher, empty rooms, plus a case mirroring live dev data (SE 101
    180-min lab ×2 in `IT Lab 1`, no availability → exactly 2 sessions, zero
    violations). Root `npx tsc --noEmit` clean, `npm run lint` (0 errors),
    `npm run build` passes (`/dean/schedule` routed); `convex codegen`
    pushed functions to dev, where an unauthenticated
    `schedule:generate` throws `Unauthorized` and `schedule:listAll` returns
    `{ ok: true, data: [] }`
- **Fixed Day-Pair Scheduling (MW / TTh)** — full unit:
  - `constants/dayPatterns.ts` — single source for `DayPattern` (`"MW" |
    "TTh"`), `DAY_PATTERNS`, `DAY_PATTERN_OPTIONS`, `DAY_PATTERN_LABELS`
    ("MW (Mon & Wed)" / "TTh (Tue & Thu)"), and
    `DAY_PATTERN_DAY_INDEXES` (`MW = [0, 2]`, `TTh = [1, 3]` on the
    Mon=0…Sat=5 grid). **No imports** — the Convex-side compiler can't
    resolve `@/`, so the engine files import it relatively
    (`../../constants/dayPatterns`).
  - `types/subjects.ts` + `lib/validation/subject.ts`: `meetingsPerWeek`
    → `dayPattern` (required, zod `z.enum(["MW","TTh"])`).
  - `convex/scheduling/types.ts`: subject now carries `dayPattern`;
    `PlacedSession.meetingIndex` removed; `invalid-meetings` reason
    replaced by `invalid-pattern`.
  - `convex/scheduling/csp.ts` rewritten to the pair model:
    `expandSubjectsIntoSessions` emits exactly 2 fixed-day sessions per
    subject whose candidate slots are times the teacher is free on **both**
    pattern days; `runCSP` places/unplaces the pair atomically. Day is now
    an input, not a choice — the CSP solves only the time (room and day
    come from the subject/pattern).
  - `convex/scheduling/validate.ts`: pair invariants — exactly 2 sessions,
    correct pattern days, same time, same room; keeps teacher/room
    double-book, room type, blocked-slot, and bounds checks.
  - `convex/scheduling/ga.ts`: chromosome is now a permutation of
    **subject-pair units** (decode moves pairs atomically); removed the
    per-subject day-spread penalty that no longer applies. Still standalone
    / not wired into `generate`.
  - `convex/schedule.ts`: `SubjectRow` gains required `dayPattern`; passes
    straight into `SchedulingSubject`.
  - `convex/schema.ts` → `convex/migrations.ts`: added
    `backfillSubjectDayPatterns` (internal, idempotent: legacy docs →
    `dayPattern: "MW"`, strips `meetingsPerWeek`); `backfillSubjectRoomIds`
    replace shape updated. Ran through the same **relaxed → migrate →
    strict** window as the spec-03 backfill; dev now has 3 subjects, all
    `dayPattern: "MW"`, no `meetingsPerWeek` field.
  - `convex/subjects.ts`: `subjectFields` validator + create/update write
    `dayPattern`.
  - `components/subjects/SubjectFormDialog.tsx`: meetings number input →
    day-pattern `Select` (options from `DAY_PATTERN_LABELS`);
    `components/subjects/SubjectManagement.tsx`: "Meetings" → "Schedule
    Pattern" column (both skeleton + data) rendering a `Badge` with the
    pattern; search covers the pattern too. (Note: the sub-table lives
    inline in `SubjectManagement.tsx` — there is no
    `components/subjects/SubjectsTable.tsx`.)
  - `components/schedule/ScheduleTable.tsx`: one **grouped row per
    subject** with a "Schedule Pattern" column (badge + "Mon & Wed" /
    "Tue & Thu" via `DAY_PATTERNS`); clean pairs collapse to a single row,
    non-clean pairs fall back to per-session rows. Column layout matched
    dev data (all MW subjects) and follows `component/table` — `ui-context.md`
    is an unfilled template with no table guidance, so per-session rows +
    grouping was chosen by me and should be sanity-checked in the browser.
  - `components/schedule/ScheduleTableSkeleton.tsx`: header + skeleton
    cells updated for the pattern column.
  - `scripts/scheduling-smoke-test.ts` rewritten for the paired model:
    **26/26 assertions** (`npx tsx`) — feasible case (6 sessions, 6 hard
    constraints), per-pattern pair integrity (same time + same room, days
    [0,2] / [1,3]), blocked-on-either-day forces the pair to slot 9, GA
    validity + pair integrity, 11 TTh subjects → `exhausted`,
    invalid-duration, invalid-pattern, SE 101 3-hr lab mirror, the **full
    dev seed (3 MW labs, one teacher)** yielding 6 linked sessions with
    zero teacher double-books, blocked-teacher → `no-slot-fits`, empty
    rooms → `no-rooms`.
  - Migration + verification: pushed the relaxed schema, ran
    `backfillSubjectDayPatterns` (3 backfilled), restored the strict
    schema, re-pushed. Verified via inline-query that every subject doc has
    `dayPattern` and no `meetingsPerWeek`; unauthenticated
    `schedule:generate` still throws `Unauthorized`; `schedule:listAll` /
    `subjects:listAll` return `{ ok: true, data: [] }` (listAll is
    role-scoped — populated only for the owner/login). Root `npx tsc
    --noEmit` clean, `npm run lint` (0 errors — same pre-existing
    warnings), `npm run build` passes.
- One transient fix during the migration window: `schedule.ts`'s
     `SubjectRow.dayPattern` was made optional while the relaxed schema made
     `listAll` return `dayPattern?`; re-tightened to required after the
     strict re-push.
- **School Hours 7:30 AM–7:30 PM + Detailed Infeasibility Reasons** — full
  unit:
  - **Hours single-sourced**: `constants/availability.ts` now defines
    `AVAILABILITY_START_MINUTES = 7 * 60 + 30` (7:30 AM) and
    `AVAILABILITY_END_MINUTES = 19 * 60 + 30` (7:30 PM); slots stay 60-min
    → the grid is now 12 slots/day (7:30 AM–6:30 PM slots) instead of 10.
    This is the one source of the bounds; `csp.ts`/`ga.ts`/`validate.ts`/
    `cspDiagnostics.ts` read the grid from `input.timeSlots`, which
    `convex/schedule.ts` builds from the same constants.
  - **Validator synced to the source**: `convex/availability.ts` replaced its
    hardcoded `DAY_COUNT = 6` / `TIME_SLOT_COUNT = 10` with
    `AVAILABILITY_DAYS.length` / `AVAILABILITY_TIME_SLOTS.length` (now 12),
    so out-of-range slot keys ("stray" data outside 7:30 AM–7:30 PM) are
    rejected against the true bounds.
  - `AvailabilityGrid`/`AvailabilityGridSkeleton` derive rows/columns from
    the same constants (6 days × 12 slots) — skeleton no longer has a
    hardcoded 60-cell count.
  - **Detailed diagnostics**: new `convex/scheduling/cspDiagnostics.ts`
    (renamed from a hyphenated filename — Convex module paths reject `-`)
    with `explainInfeasibility(subject, input, placedSessions)` returning a
    structured `InfeasibilityReason` (`subjectName`, `dayPattern`,
    `durationMinutes`, `day1FreeWindows`, `day2FreeWindows`,
    `cause`, `message`) per failed subject. Teacher free windows are the
    maximal contiguous free runs (blocked slots minus other placed sessions
    of the same teacher) long enough to fit the duration, within school
    hours. Cause is `no-shared-teacher-window` (no start free on both
    pattern days), `no-room-available` (shared starts exist but the assigned
    room is occupied at all of them), or `unknown`.
  - `convex/scheduling/types.ts`: `CspResult` failure now carries
    `reasons: readonly InfeasibilityReason[]` for placement failures; the
    `no-slot-fits` and `exhausted` codes were removed (single
    `CspInfeasibleReason` remains for config errors: no-subjects, no-rooms,
    invalid-pattern, invalid-duration, no-matching-room).
  - `csp.ts`: `expandSubjectsIntoSessions` no longer fails fast on the first
    teacher-blocked subject — it collects one reason per subject with no
    shared window; `runCSP` returns those reasons, and on a backtracking
    `MAX_ATTEMPTS`/exhausted failure returns per-subject reasons from
    `diagnoseFailedPlacement` (a greedy pass in the same unit order that
    explains each subject that collides with the rest). Shared helpers
    `blockedByDayFor`/`intervalsOverlap` moved to `util.ts` (also used by
    `validate.ts` — removed its duplicate).
  - `convex/schedule.ts` `generate` returns `{ ok: false, error,
    infeasibleSubjects }` (the structured reasons array) instead of a single
    string; generic config errors still return just `{ ok: false, error }`.
    `types/schedule.ts` + `hooks/useSchedule.ts` mirror it
    (`generateError` + `infeasibleSubjects`).
  - **UI**: new `components/schedule/ScheduleGenerationError.tsx` — a richer
    error state using the shared ErrorState tokens (Skeleton icon, muted
    card, retry button) that lists each failed subject in a shadcn
    `accordion` (installed via CLI; Base UI) with subject name + day-pattern
    badge + minutes, the structured cause label, the plain-language
    `message`, and the free windows per pattern day formatted via
    `formatClock` ("7:30 AM–8:30 AM"). One subject is open by default.
    `SchedulePage` renders it when `infeasibleSubjects` is present, else the
    plain `ErrorState`.
  - `scripts/scheduling-smoke-test.ts` rebuilt on the new 7:30 AM–7:30 PM
    grid (derived from `AVAILABILITY_TIME_SLOTS`, not hand-counted) —
    **33/33 assertions**: existing coverage plus new diagnostic tests —
    no-shared-window across Mon/Wed (asserts the exact free windows and
    cause), room-caused distinction (two subjects sharing one room, teacher
    free on both days, room taken at every shared start → `no-room-available`
    on the blocked subject), and 13-subject one-room overflow →
    `no-room-available`.
  - Verified: `npx tsx scripts/scheduling-smoke-test.ts` (33/33), root
    `npx tsc --noEmit` clean, `npm run lint` (0 errors — same pre-existing
    warnings), `npm run build` passes, `npx convex codegen` pushes cleanly.
  - Note: this project's slot step is 60 minutes, not the 30 the change
    brief assumed; left at 60 (the brief's "leave as-is unless runtime is
    excessive" — it isn't; the 13-subject overflow resolves instantly).

## In Progress

- None. Schedule Generation unit remains complete (CSP wired; GA not yet
  wired).

## Next Up

1. Teacher My Schedule view (real, read-only, not placeholder) — consumes
   the generated `schedules` rows filtered by teacher id
2. Dean schedule view polish / student-facing schedule (out of scope until
   confirmed in specs)
3. (Optional, later) Wire `runGA` into the `generate` action once soft
   constraints come in scope — `convex/scheduling/ga.ts` is already built,
   standalone-tested (pair-atom chromosomes), and left with a clear call
   site
4. Sanity-check the `ScheduleGenerationError` accordion in the browser
   (real Dean, school-hours blocks) — the engine diagnostics and the UI
   state machine are verified by the smoke test + build, but a live generate
   failure hasn't been eyeballed.

## Open Questions

- ~~The exact availability time blocks were not defined in
  `project-overview.md` / `architecture.md`.~~ Resolved by spec 05 and the
  school-hours unit: the generator consumes the Mon–Sat × 12 × 1-hour grid
  (7:30 AM–7:30 PM, 60-min slots) from `constants/availability.ts` as the
  single source. One consequence: a subject's `durationMinutes` must be a
  whole multiple of the 60-min slot (SE 101 = 180 min = 3 consecutive
  slots). If non-aligned durations or half-hour slots are ever wanted, the
  grid and the CSP must change together.
- Generated schedules are an atomic snapshot: each `schedules` row
  denormalizes subject/teacher/room names at generation time, so editing a
  Subject's name or a Room's name does not rewrite an already-generated
  timetable (it will be refreshed next regenerate). Confirm this snapshot
  semantics is what we want, or join names live and drop the denormalized
  fields.
- Each Subject carries a single fixed `roomId` (spec 03 data model), so
  "room type matches subject" reduces to scheduling in the Dean-chosen
  room. If a subject should instead be placeable in *any* room of a type,
  the schema would expose `roomType` on the subject and the CSP's room
  candidates would widen — decide before extending the scheduler.
- Dev seed data only has lab rooms (IT Lab 1–3) and three MW subjects
  (SE 101 → IT Lab 1 180 min, HCI 101 → IT Lab 2 120 min, OS 101 → IT Lab 3
  180 min; all `dayPattern: "MW"`, one teacher) with teacher availability
  unset. Generating over the empty availability set works and yields 6
  linked sessions with no teacher double-books (verified), but a typical
  timetable needs the Dean to add lecture rooms/subjects and teachers to
  set availability first.
- **Day patterns beyond MW/TTh**: today a subject must meet twice on a
  contiguous Mon-Wed or Tue-Thu pair. The user's example key was `TTH`
  (reconciled to `TTh` to match the required union `"MW" | "TTh"`). Later
  patterns (e.g. a Friday-only lab, or M/W/F) would extend
  `DAY_PATTERN_DAY_INDEXES` / the union and relax the "exactly 2 sessions"
  assumption in `expandSubjectsIntoSessions` and `validate.ts`. Decide
  whether the pattern set should stay closed.
- The `backfillSubjectDayPatterns` migration defaults every legacy subject
  to `"MW"` (chosen because the prior seed carried `meetingsPerWeek: 2`).
  If any pre-pattern subject truly meant `TTh`, flip it in the UI before
  regenerating.
- The schedule table groups a subject's two sessions into one row with a
  pattern badge (clean pair) and falls back to per-session rows otherwise.
  `ui-context.md` is an unfilled template (no table guidance), so this is
  a judgment call — sanity-check the grouping/badge in the browser before
  it becomes convention.
- Spec 04 references a "dark green accent token" for sidebar active
  state. Introduced `--accent-primary` (+ `--accent-primary-foreground`)
  in `globals.css` (mapped in `@theme inline` as
  `--color-accent-primary*`). Used by the availability grid's blocked
  cells (`bg-accent-primary`). Teacher sidebar still mirrors the Dean
  sidebar styling — decide whether to migrate both sidebars to the
  green accent. Registered here rather than invented.
- `/teacher/schedule` ("My Schedule") is a placeholder page with a real
  schedule source now available (`schedules` table, `by_teacherId`
  index) — building the read-only teacher view is the next unit.
- The antd/shadcn split: existing dashboard components
  (`DeanDashboard`, `TeacherDashboard`, `AppHeader`, root antd
  `ConfigProvider`) still use antd, while new UI (DeanSidebar, Subject
  Management, Room Management, Teacher availability) uses shadcn. Decide
  when/how to migrate the remaining antd components to shadcn, or keep
  antd for them.
- Deleting a Room that is still referenced by Subjects: subjects always
  carry a `roomId` (strict schema), so deleting a referenced room leaves
  subjects pointing at a missing room (rendered as `—`). Decide whether
  Room delete should be blocked while subjects reference the room, or
  clear/reassign those subjects on delete.
- The `Legacy Lab`/`Legacy Lecture` fallback rooms created by
  `convex/migrations.ts` are editable/deletable from the Dean room UI —
  re-assign/move the `SE 101` subject first if the fallback room is
  deleted.

## Architecture Decisions

- Taskbar uses shadcn sidebar + lucide-react icons (per spec).
- Routes live in `constants/routes.ts` only (`APP_ROUTES.deanRooms`,
  `APP_ROUTES.deanSubjects`) — no raw path strings (Invariant 2).
- Dean routes are guarded once in `app/dean/layout.tsx` via
  `requireRole(ROLES.dean)` (middleware/role logic still centralized in
  `hooks/useAuth.ts`).
- Single source for top-chrome height: `--app-header-height` CSS
  variable set on `<body>` in the root layout; the Dean sidebar's fixed
  panel spans `top: var(--app-header-height)` → viewport bottom so it
  sits below the sticky white AppHeader instead of overlapping it.
- Subject management queries (`listAll`, `getTeachers`) return a
  `{ ok, data } | { ok: false, error }` Result union instead of throwing,
  so `useSubjects` can surface failed queries to the error state without
  relying on an error boundary. Mutations still throw and are caught in
  the dialog components.
- Subjects reference their assigned teacher by the teacher's Clerk user
  id (`teacherId`), matching how `users`/availability are keyed — never by
  name (Invariant 3). Display names are resolved at query time.
- Teacher accounts for the Dean's dropdown are sourced from Clerk
  (`convex/teachers.ts` `syncFromClerk` action), pulled on page load once
  per session and upserted into Convex; the dropdown then reads Convex
  reactively. Requires `CLERK_SECRET_KEY` as a Convex deployment env.
- Subject "category" is derived from the room a subject is assigned to:
  `subjects.roomId` points at a `rooms` document and the table's Category
  badge shows the room's `Lecture`/`Lab` type (+ name). Per spec 03, the
  subject form no longer picks a hard-coded type — it picks an actual
  room from the rooms table.
- `useSubjects` is the single hook for the page; search filtering is
  transient UI state kept in `SubjectManagement` (useMemo), not in Convex.
- Subject category/room type now lives on the `rooms` table
  (`convex/schema.ts`); `subjects.roomId` references the room by Convex
  `Id`, and `roomName`/`roomType` are joined at query time (mirrors how
  `teacherId` is joined to teacher names). `RoomType` and its constants
  are owned by the rooms module (`types/rooms.ts`, `constants/rooms.ts`)
  and imported by subjects.
- `useRooms` mirrors `useSubjects`: single hook per page, Result-union
  `listAll` query, throw-and-catch mutations in the dialog components,
  Skeleton-based loading/empty/error states.
- Availability is stored as one doc per teacher (`availability` table,
  indexed by Clerk `userId`); `blockedSlots` is the full set of
  `"<dayIndex>-<timeIndex>"` keys. Grid edits are kept as local draft
  state; **Save** writes the whole array (upsert: insert or patch) and
  **Reset** reverts to the last saved set — an atomic write avoids many
  small per-cell document churn.
- `getMine`/`setMine` gate on the teacher role (`roleOf`). `getMine`
  returns `{ ok: true, data: [] }` for non-teachers rather than throwing
  (mirrors `rooms.listAll`); `setMine` throws `Unauthorized` and also
  rejects any slot key outside the 6 days × 12 slots (7:30 AM–7:30 PM) bounds.
- Sidebar is now generic: `components/shared/AppSidebar.tsx` takes a
  `groups` prop; `DeanSidebar` and `TeacherSidebar` are thin wrappers
  supplying their own nav configs from `APP_ROUTES` (no raw path
  strings).
- The availability "empty" state (no blocked slots) is rendered as an
  inline hint above the grid rather than replacing the grid with
  `EmptyState`, because the grid is always interactive even when every
  cell is available — a full EmptyState swap would prevent marking slots.
- The scheduling engine lives in `convex/scheduling/` as pure TypeScript
  with no Convex imports, so the same CSP/GA/validator code can be driven
  by a standalone script (`scripts/scheduling-smoke-test.ts`) and executed
  in a Convex action (`convex/schedule.ts`). CSP is the production path;
  GA stays out of the wiring until soft constraints are in scope.
- Schedules are written as an atomic snapshot: `generate` clears the
  `schedules` table and inserts every session in one internal mutation,
  so the UI never sees a half-generated timetable.
- The clock/grid model is single-sourced: `constants/availability.ts`
  defines the 7:30 AM–7:30 PM school hours (`AVAILABILITY_START_MINUTES`/
  `AVAILABILITY_END_MINUTES`, 60-min slots → 12 slots/day) and is used by
  the UI, the availability grid, and via `formatClock`/`AVAILABILITY_DAYS`
  by the schedule tables. `convex/scheduling/*` derives its bounds purely
  from the grid (`input.timeSlots`) built from those same constants, and
  `convex/availability.ts`'s validator imports the constants directly —
  no plain-number copies to drift.
- Placement-failure reporting is structured: `CspResult` failures carry one
  `InfeasibilityReason` per unplaceable subject (cause
  `no-shared-teacher-window` / `no-room-available` / `unknown`, the teacher's
  free windows per pattern day, and a plain-language message), produced by
  `convex/scheduling/cspDiagnostics.ts`. Config-level failures (no rooms,
  invalid duration/pattern, missing room) still return a single reason.
- Dean-only reads/writes of schedule data, availability data, subjects,
  and rooms all gate on `roleOf`/`isDean` (Dean) or teacher role,
  including the `generate` action (throws `Unauthorized` for anonymous and
  non-Dean callers).
- Day patterns are a closed vocabulary on the subject (`dayPattern: "MW" |
  "TTh"`), single-sourced in `constants/dayPatterns.ts` including the day
  indexes (`MW = [0, 2]`, `TTh = [1, 3]`) on the shared Mon=0…Sat=5 grid.
  That file has **no imports** so the Convex-side compiler (which can't
  resolve `@/`) can consume it; the scheduling engine imports it
  relatively.
- The day is part of the input, not a CSP choice: a subject's two sessions
  are a **linked pair** — same time + same room on both pattern days. The
  CSP therefore solves only the time, and it treats the pair as one atomic
  placement (place/unplace both days together); candidate times require
  the teacher to be free on *both* days. This keeps the constraint model
  small and the output readable on the existing Mon-Sat grid.
- The GA chromosome is a permutation of subject-pair units, so crossover /
  mutation can never break a day-pair; the old per-subject day-spread
  penalty was dropped because the spread is now fixed by the pattern.
- Schema-evolution playbook (reused from spec 03): to migrate a field
  live, relax the schema (`v.optional`), deploy + run the idempotent
  internal backfill mutation, then restore the strict schema and re-push.
  This unit ran `backfillSubjectDayPatterns` (3 docs) inside that window.
- The schedule table collapses a clean pair into one row per subject with a
  "Schedule Pattern" badge + human label; a non-clean pair (shouldn't
  happen via `generate`) falls back to per-session rows.

## Session Notes

- shadcn style: `base-nova`, primitive base: `@base-ui/react`, icons:
  `lucide-react`, Tailwind v4. All `components/ui/*` are vendored.
- `app/dean/layout.tsx` uses a plain `<div>` for content (not
  `SidebarInset`, which renders a nested `<main>` making invalid HTML
  inside the root layout's `<main>`).
- Spec: `context/spec/01-design-taskbar-for-teacher.md`
- Spec: `context/spec/02-subject-management.md` (Dean Subject CRUD)
- Spec: `context/spec/03-room-management.md` (Dean Room CRUD + subject
  room selection)
- Spec: `context/spec/04-teacher-availability.md` (Teacher Availability
  + Teacher sidebar)
- Spec: `context/spec/05-teacher-generate-sched.md` (Generate Schedule —
  CSP engine wired via Convex action; GA built, not wired)
- Unit: Fixed Day-Pair Scheduling (MW / TTh) — extended spec 05's engine
  from `meetingsPerWeek` to linked `dayPattern` pairs (see Completed)
- PowerShell 5.1 caveat: to pass double quotes through `npx convex run
  --inline-query`, write the inner strings with doubled single quotes
  (`query(''rooms'')`), since PS otherwise strips `"` from native args.