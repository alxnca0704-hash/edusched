# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

Complete — Dean taskbar/sidebar
(Task: `context/spec/01-design-taskbar-for-teacher.md`)

## Current Goal

Add a taskbar (sidebar) to the Dean dashboard with links to
Manage Rooms and Manage Subjects, each landing on a blank page.
Setup required:
- Install shadcn + add the sidebar component
- Install lucide-react for icons

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
- Added blank pages `app/dean/rooms/page.tsx` and
  `app/dean/subjects/page.tsx`
- Verified: `npm run build` passes (routes compile + typecheck)
- Root layout now defines `--app-header-height` (3.5rem) on `<body>`;
  `AppHeader` uses it, and the Dean sidebar offsets below the white header
  so it never overlaps top chrome

## In Progress

- None. Dean taskbar unit complete.

## Next Up

1. Resolve the lint error in vendored `components/ui/use-mobile.ts`
   (react-hooks/set-state-in-effect) — or upstream fix via
   `npx shadcn@latest add use-mobile --overwrite`
2. Dean Room CRUD (own unit) — fill `/dean/rooms` with hook +
   Convex mutations per architecture.md
3. Dean Subject CRUD (own unit) — fill `/dean/subjects`
4. Teacher taskbar/section (own unit)

## Open Questions

- The antd/shadcn split: existing dashboard components
  (`DeanDashboard`, `TeacherDashboard`, `AppHeader`, root antd
  `ConfigProvider`) still use antd, while new UI (DeanSidebar) uses
  shadcn. Decide when/how to migrate the remaining antd components to
  shadcn, or keep antd for them.
- `hooks/use-mobile.ts` (vendored by shadcn CLI) fails the new
  `react-hooks/set-state-in-effect` eslint rule. Leave vendored code
  untouched, apply an upstream update when available, or locally adapt?

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
- Blank Pages explicitly deferred CRUD data/UI to later units — the
  current pages show a heading + "coming soon" placeholder only.

## Session Notes

- shadcn style: `base-nova`, primitive base: `@base-ui/react`, icons:
  `lucide-react`, Tailwind v4. All `components/ui/*` are vendored.
- `app/dean/layout.tsx` uses a plain `<div>` for content (not
  `SidebarInset`, which renders a nested `<main>` making invalid HTML
  inside the root layout's `<main>`).
- Spec: `context/spec/01-design-taskbar-for-teacher.md`