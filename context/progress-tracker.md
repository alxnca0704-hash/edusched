# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

Complete — Dean Room CRUD
(Task: `context/spec/03-room-management.md`)

## Current Goal

Add a full CRUD management UI for rooms on the Dean side at
`/dean/rooms`: a table with a category column, an add/edit form
modal, row action icons, and search. Functions: add, delete,
update — all backed by Convex with lint passing. Also connect room
selection into Subject management (replacing the hard-coded
lecture/lab type picker).

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

## In Progress

- None. Dean Room CRUD unit complete.

## Next Up

1. Teacher taskbar/section (own unit)
2. Schedule Generation (Dean) + schedule views — depends on Rooms and
   Subjects (now by room id) and Teacher availability

## Open Questions

- The antd/shadcn split: existing dashboard components
  (`DeanDashboard`, `TeacherDashboard`, `AppHeader`, root antd
  `ConfigProvider`) still use antd, while new UI (DeanSidebar, Subject
  Management, Room Management) uses shadcn. Decide when/how to migrate
  the remaining antd components to shadcn, or keep antd for them.
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