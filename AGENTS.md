<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
# AGENTS.md

## Rules for creating a page (Next.js)

1. **Separate logic from UI.**
   - `hooks/` → all functionality (data fetching, state, mutations, handlers).
   - `components/` → reusable client-side UI components only.

2. **Use hooks for all functionality.**
   - One hook per page, named after that page (e.g. a "dashboard" page → `useDashboard.ts`).
   - Hook returns data + handlers, component just consumes them.

3. **Use Ant Design (`antd`) for reusable components.**
   - Table, Form, Modal, Button, Select, Input, Card, etc.
   - Use Tailwind CSS only for **layout, spacing, and responsiveness** (see Rule 7) — not to re-style antd internals. Don't fight antd's own styling with conflicting Tailwind utility classes (e.g. don't override `.ant-btn` colors with Tailwind; use antd's `theme`/`ConfigProvider` for that instead).

4. **Types live in `types/`, constants live in `constants/`.**
   - Shared types go in `types/`.
   - Fixed values (roles, status enums, API routes, **app routes/paths**) go in `constants/`.

5. **Centralize all routes as constants — never hardcode paths.**
   - `constants/routes.ts` holds **both**:
     - **App routes** (frontend paths, e.g. `/dashboard`, `/orders/[id]`) — used in `<Link>`, `router.push()`, redirects.
     - **API routes** (backend endpoints, e.g. `/api/orders`) — used inside hooks for fetch calls.
   - Never write a raw string path anywhere else in the codebase. If a path changes, it changes in exactly one file.
   - Example:
     ```ts
     // constants/routes.ts
     export const APP_ROUTES = {
       dashboard: '/dashboard',
       orderDetail: (id: string) => `/orders/${id}`,
     } as const;

     export const API_ROUTES = {
       orders: '/api/orders',
       orderById: (id: string) => `/api/orders/${id}`,
     } as const;
     ```
   - Usage:
     ```ts
     router.push(APP_ROUTES.orderDetail(order.id));
     fetch(API_ROUTES.orderById(order.id));
     ```

6. **Every page/rendered view must handle loading and error states.**
   - Hook returns `isLoading` and `error` alongside data.
   - Loading → render Ant Design `Skeleton` (matching the shape of the content, e.g. `Skeleton active` for a card, `Skeleton.Input`/rows for a table).
   - Error → render Ant Design `Alert` (or `Result` for full-page errors) with a retry action if possible.
   - Never leave a blank screen or unhandled state while data is loading or fails.

7. **Mobile responsive by default — Tailwind CSS, mobile-first.**
   - Every page/component is built **mobile-first**: write the base (unprefixed) classes for mobile, then layer breakpoints upward (`sm:` `md:` `lg:` `xl:`). Never design desktop-first and shrink down.
   - Standard breakpoints (Tailwind defaults): `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px.
   - Use Tailwind for: grid/flex layout, spacing (`p-`, `gap-`), width/height, responsive visibility (`hidden md:block`), and container widths.
   - Tables: on small screens, prefer a stacked/card layout (antd `<List>` or custom cards with Tailwind) instead of a horizontally-scrolled `<Table>`. If a `Table` must stay, wrap it in `overflow-x-auto`.
   - Modals/Forms: ensure `Modal` width is responsive (`width="90%"` or Tailwind-controlled wrapper) and form fields stack in a single column on mobile (`grid grid-cols-1 md:grid-cols-2 gap-4`).
   - No fixed pixel widths on containers — use `w-full`, `max-w-*`, and `%`-based or `flex`/`grid` sizing.
   - Test every new page at mobile (375px), tablet (768px), and desktop (1280px) widths before considering it done.

8. **Visual design — clean, borderless, no neon.**
   - **No visible borders** on cards, containers, tables, or inputs by default. Separate content using:
     - Background shade contrast (e.g. `bg-white` content on `bg-gray-50`/`bg-slate-50` page background) instead of `border`.
     - Spacing/gaps (`gap-*`, `space-y-*`, padding) instead of dividing lines.
     - Soft shadows (`shadow-sm`) only where elevation genuinely helps (e.g. a modal, a dropdown) — not on every card.
   - If a boundary is truly needed for clarity, use a very subtle divider (`border-gray-100`/`divide-gray-100`), never a dark or saturated border color.
   - **Background:** neutral and calm — whites, off-whites, light grays (`bg-white`, `bg-gray-50`, `bg-slate-50`). Avoid pure black backgrounds, heavy gradients, or busy patterns behind content.
   - **Color palette:** muted, low-saturation tones for UI chrome (grays, soft blues/greens as needed for brand/status). **No neon or highly saturated colors** anywhere (no `bg-lime-400`, `bg-fuchsia-500`, `bg-cyan-400`-style neons). Status colors (success/warning/error) should use antd's default or a muted custom theme (soft green/amber/red), not bright/glowing variants.
   - Configure this once via antd's `ConfigProvider` `theme.token` (e.g. `colorPrimary`, `colorBgLayout`, `borderRadius`) so the whole app inherits a consistent, borderless, non-neon look instead of overriding styles page by page.
   - Favor whitespace and typographic hierarchy (font weight/size) over lines and boxes to organize a page.

## Structure

```
hooks/
  use<PageName>.ts        # e.g. useDashboard.ts

components/
  <PageName>Table.tsx     # "use client", reusable, antd + Tailwind, responsive
  <PageName>FormModal.tsx

types/
  <pageName>.ts           # export interface <PageName> {...}

constants/
  roles.ts                # export const ROLES = {...}
  routes.ts                # export const APP_ROUTES = {...}, export const API_ROUTES = {...}

app/
  <page>/page.tsx         # calls use<PageName>(), renders components
```

## Naming conventions

- Hooks: `use<PageName>.ts`, camelCase function name matching file.
- Components: `PascalCase.tsx`, named export matching filename.
- Types/interfaces: `PascalCase`, no `I` prefix.
- Constants: `UPPER_SNAKE_CASE` for values, `camelCase.ts` for filenames.
- Route constant objects: `APP_ROUTES` and `API_ROUTES` specifically (not `ROUTES` alone) so intent is unambiguous at the call site.
- Props types: `<ComponentName>Props`.
- Always type hook return values and component props explicitly — avoid `any`.

## Rule of thumb

- No `fetch`/API calls inside components — only inside hooks.
- No UI/JSX inside hooks — only inside components.
- No raw string paths inline — only `APP_ROUTES.*` / `API_ROUTES.*` from `constants/routes.ts`.
- Components are reusable and client-side (`"use client"`), just render what the hook gives them.
- Page files stay thin: call the hook, pass its data/handlers into components.
- Every component that renders data checks `isLoading` (Skeleton) and `error` (Alert/Result) before rendering real content.
- Every layout is mobile-first Tailwind: base classes = mobile, breakpoints add complexity for larger screens — never the reverse.
- Default to no borders: use background contrast, spacing, or soft shadows to separate content instead of drawing lines around everything.
- No neon/highly saturated colors anywhere — keep the palette muted and the background neutral (white/off-white/light gray).