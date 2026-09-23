# AI Workflow Rules

## Approach

Build this project incrementally using a spec-driven workflow. `project-overview.md`, `architecture.md`, and `code-standards.md` define what to build, how to build it, and what conventions to follow. `progress-tracker.md` tracks current state and open questions. Always implement against these context files — do not infer or invent Dean/Teacher behavior, data shape, or scheduling logic from scratch. If a context file doesn't cover something needed to proceed, stop and resolve it in that file first rather than guessing.

## Scoping Rules

- Work on one feature unit at a time (e.g. "Room CRUD" is one unit, "Subject CRUD" is a separate unit — do not build both in the same pass).
- Prefer small, verifiable increments over large speculative changes — a hook + its component + its Convex functions for one feature, not a batch of unrelated features.
- Do not combine unrelated system boundaries in a single implementation step (e.g. do not touch `convex/subjects.ts` while implementing the Availability grid).
- Do not start on the scheduling algorithm (CSP/GA) while CRUD features are still incomplete — it depends on Rooms, Subjects, and Availability already working end to end.

## When to Split Work

Split an implementation step if it combines:

- UI changes and Convex schema/function changes that aren't both required for the same single feature
- Multiple unrelated features (e.g. Rooms CRUD and Teacher Availability in one step)
- Both Dean-side and Teacher-side work in the same step — these are separate units even when they touch the same data (e.g. Subjects reference teacherId, but building the Subjects form and building Availability are still separate steps)
- Behavior not clearly defined in `project-overview.md` or `architecture.md` (e.g. if it's unclear whether the scheduling algorithm runs as a Convex action or an external service, that ambiguity must be resolved first, not built around)
- Adding a new shadcn/ui primitive and building feature logic on top of it in the same step — install/generate the primitive first, verify it renders, then build the feature

If a change cannot be verified end to end quickly (loaded, tested in the browser, confirmed against its context file), the scope is too broad — split it.

## Handling Missing Requirements

- Do not invent product behavior not defined in the context files — e.g. do not add a "publish" step, notifications, or manual drag-and-drop editing since `project-overview.md` explicitly marks these Out of Scope.
- If a requirement is ambiguous (e.g. exact fields on a form, exact wording of an empty state), resolve it in the relevant context file (`project-overview.md` for scope/behavior, `code-standards.md` for conventions) before implementing.
- If a requirement is missing entirely (e.g. how the scheduling algorithm will be triggered — Convex action vs external Python service), add it as an open question in `progress-tracker.md` before continuing, and do not proceed on that specific unit until it's resolved.

## Protected Files

Do not modify the following unless explicitly instructed:

- `components/ui/*` — shadcn/ui generated primitives, vendored via the shadcn CLI
- `convex/_generated/*` — Convex's auto-generated types and API bindings
- `middleware.ts` — Clerk route protection logic, unless the task is specifically about auth/routing
- Any third-party library internals (`node_modules/`)
- Seeded Clerk account data/configuration — accounts are managed manually outside the codebase

## Keeping Docs in Sync

Update the relevant context file whenever implementation changes:

- **System architecture or boundaries** → update `architecture.md` (e.g. if the scheduling algorithm moves from a Convex action to an external Python service)
- **Storage model decisions** → update `architecture.md` (e.g. if a new Convex table or a link to Clerk changes)
- **Code conventions or standards** → update `code-standards.md` (e.g. a new shared component pattern, a new file organization rule)
- **Feature scope** → update `project-overview.md` (e.g. if something marked Out of Scope becomes in scope, or vice versa)

## Before Moving to the Next Unit

1. The current unit works end to end within its defined scope (e.g. Rooms CRUD: add, edit, delete, list all work against Convex, not just in local state)
2. No invariant defined in `architecture.md` was violated (e.g. no component queries Convex directly, no Teacher data is looked up by name instead of Clerk `userId`)
3. The unit follows `code-standards.md` (hook/component separation, loading/empty/error states via Skeleton, no raw route strings, mobile-first Tailwind)
4. `progress-tracker.md` reflects the completed work and any open questions raised along the way
5. `npm run build` passes