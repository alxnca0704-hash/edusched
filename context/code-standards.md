# Code Standards

## General

- Keep modules small and single-purpose — one hook does one page's data logic, one component renders one piece of UI.
- Separate logic from UI completely: no data fetching, mutations, or business logic inside a component; no JSX inside a hook.
- Fix root causes, do not layer workarounds — if a hook's shape doesn't fit a new page's needs, adjust the hook, don't patch around it in the component.
- Do not mix unrelated concerns in one component or route — a Table component renders rows, it does not also decide what happens on delete (that's the hook's job).
- No raw string paths or route strings anywhere — always reference `APP_ROUTES` / `API_ROUTES` from `constants/routes.ts`.
- Reuse before creating — check `components/ui/` and `components/shared/` before writing a new component that likely already exists in a similar form.
- Every page/view has three explicit states to account for — loading, empty, and error — and all three render a `Skeleton`-based placeholder rather than blank space, an icon-only empty message, or a text-only error message. This keeps layout stable and avoids visual "jumps" between states.

## TypeScript

- Strict mode is required throughout the project.
- Avoid `any` — use explicit interfaces from `types/`, or narrowly scoped inline types when something is truly local and not reused.
- Every hook has an explicit return type; every component has an explicit `Props` type (`<ComponentName>Props`).
- Validate unknown external input (Convex query results at the edges, form input, URL params) before trusting it — use `zod` schemas in `lib/validation/` where input needs shape-checking beyond TypeScript's compile-time guarantees.
- No `I` prefix on interfaces; types/interfaces are `PascalCase`.

## Next.js

- Default to server components; add `"use client"` only when the component needs browser interactivity (state, effects, event handlers, Convex hooks).
- Page files (`app/**/page.tsx`) stay thin: call the page's hook, pass its data/handlers into components, render nothing else.
- One hook per page, named after that page (e.g. `/dean/rooms` → `useRooms.ts`).
- Route handlers (if any exist outside Convex) are focused on a single responsibility — no multi-purpose catch-all endpoints.
- Middleware (`middleware.ts`) is the only place Clerk route protection logic lives — do not duplicate auth checks ad hoc inside pages.

## Styling

- Use Tailwind CSS for layout, spacing, sizing, and responsiveness — mobile-first (base classes = mobile, add `sm:`/`md:`/`lg:` upward, never desktop-first).
- Use shadcn/ui components for all interactive/reusable UI (Table, Form, Dialog, Select, Button, Card, Skeleton, etc.) — do not hand-roll a component shadcn already provides.
- Theme via CSS custom properties in `globals.css` (shadcn's token system) — no hardcoded hex values in components.
- No visible borders by default — separate content with background shade contrast (`bg-white` on `bg-gray-50`/`bg-slate-50`), spacing, or a subtle `shadow-sm`, not `border`.
- No neon or highly saturated colors — muted, low-saturation palette for all UI chrome and status colors (success/warning/error use shadcn's default muted variants).
- No fixed pixel widths on containers — use `w-full`, `max-w-*`, `flex`, or `grid`.
- Tables collapse to a stacked/card layout on small screens; if a table must remain, wrap it in `overflow-x-auto`.

## Loading, Empty, and Error States

- **Loading**: render a `Skeleton` shaped like the real content (row-shaped skeletons for a table, block-shaped for a card, form-field-shaped for a form) — never a spinner-only or blank screen.
- **Empty** (query succeeded, zero records): render the same `Skeleton`-based layout region but replace it with a muted placeholder built from `Skeleton` blocks plus a short message and a primary action (e.g. "No rooms yet — Add Room"), kept in `components/shared/EmptyState.tsx` so every feature uses the same look.
- **Error** (query/mutation failed): render a `Skeleton`-shaped placeholder region with a muted inline message and a retry action, kept in `components/shared/ErrorState.tsx`, so a failed load never collapses the layout or shows a jarring red banner — it stays visually consistent with the loading state it replaces.
- Every hook exposes `isLoading`, `isEmpty` (or an equivalent derived check), and `error` so the component can pick the right one of the three states without re-deriving logic itself.

## API Routes / Convex Functions

- Validate and parse input (via `zod` or explicit checks) before any logic runs, whether it's a Next.js route handler or a Convex query/mutation.
- Enforce auth and ownership before any mutation — a Convex mutation checks the caller's Clerk identity and role before writing (e.g. a Teacher mutation only ever writes to that Teacher's own record).
- Return consistent, predictable response shapes — Convex queries/mutations return typed objects matching `types/`, not ad hoc shapes per function.
- Convex functions are the only code that talks to the database directly — never query Convex from inside a component.

## Data and Storage

- All application data (Rooms, Subjects, Availability, Schedules) lives in Convex — no local component state used as a source of truth beyond transient UI state (form drafts, modal open/close).
- Identity (name, email, password, role) lives in Clerk — Convex records reference a user only by Clerk `userId`, never duplicate identity fields.
- No large generated content or file storage needed at this stage — if added later (e.g. exported PDFs), it belongs in a dedicated blob store, not inline in Convex documents.

## File Organization