# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

Complete — Dean Subject CRUD
(Task: `context/spec/02-subject-management.md`)

## Current Goal

Add a full CRUD management UI for subjects on the Dean side at
`/dean/subjects`: a table with a category column, an add/edit
form modal, row action icons, and search. Functions: add, delete,
update — all backed by Convex with lint passing.

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

## In Progress

- None. Dean Subject CRUD unit complete.

## Next Up

1. Dean Room CRUD (own unit) — fill `/dean/rooms` with hook + Convex
   mutations per architecture.md
2. Teacher taskbar/section (own unit)

## Open Questions

- The antd/shadcn split: existing dashboard components
  (`DeanDashboard`, `TeacherDashboard`, `AppHeader`, root antd
  `ConfigProvider`) still use antd, while new UI (DeanSidebar, Subject
  Management) uses shadcn. Decide when/how to migrate the remaining antd
  components to shadcn, or keep antd for them.

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
- Subject "category" = the required room type (`Lecture`/`Lab`), shown as
  a badge column and as a select in the form (the only categorical field
  in the subject model per project-overview).
- `useSubjects` is the single hook for the page; search filtering is
  transient UI state kept in `SubjectManagement` (useMemo), not in Convex.

## Session Notes

- shadcn style: `base-nova`, primitive base: `@base-ui/react`, icons:
  `lucide-react`, Tailwind v4. All `components/ui/*` are vendored.
- `app/dean/layout.tsx` uses a plain `<div>` for content (not
  `SidebarInset`, which renders a nested `<main>` making invalid HTML
  inside the root layout's `<main>`).
- Spec: `context/spec/01-design-taskbar-for-teacher.md`
- Spec: `context/spec/02-subject-management.md` (Dean Subject CRUD)