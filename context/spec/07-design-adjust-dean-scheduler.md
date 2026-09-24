Read `AGENTS.md` and everything in `context/` before starting. Follow the hook/component separation, file organization, and UI token rules defined there — do not invent conventions.

## Feature: Replace List View with Draggable Calendar (Dean Schedule View)

### Current state → target state

The Dean's `/dean/schedule` page currently shows the generated schedule as a **table/list** (`ScheduleTable.tsx`). Replace this with a **weekly calendar grid**, where each scheduled subject renders as a **card-style time block** positioned at its day/time, not a table row.

### 1. Calendar Layout

- Build `components/schedule/ScheduleCalendar.tsx`: a weekly grid — columns for the day-pairs already in place (Mon/Wed and Tue/Thu, per the MW/TTh model), rows for time within the 7:30 AM–7:30 PM school hours.
- Each scheduled subject is a **card** positioned and sized within the grid according to its start time and duration (like a typical calendar app block, not a table row) — showing subject name, room, and time on the card face.
- Retire `ScheduleTable.tsx` as the primary view for this page (keep the component if useful elsewhere, but the Dean's `/dean/schedule` page should render `ScheduleCalendar.tsx` instead).
- Since no shadcn/ui primitive covers a calendar grid, build this as a custom component using CSS grid, following `ui-context.md` tokens (spacing, radius, borderless separation via background contrast, pastel-red accent reserved for primary actions/selection, not decoration).

### 2. Per-Teacher Color

- Each teacher gets one consistent color, applied to every card for their subjects across the whole calendar, so the Dean can visually track one teacher's load at a glance.
- Generate colors from a small fixed, muted, non-neon palette defined in `ui-context.md` (add a `--teacher-palette` set of tokens if not already present) — do not use random/generated colors.
- Map teacher → color deterministically (e.g. hash teacher ID to a palette index) so the same teacher always gets the same color across reloads.
- Show a legend (`components/schedule/TeacherLegend.tsx`): teacher name + color swatch, displayed alongside the calendar.

### 3. Drag-to-Reschedule with Cascading Auto-Adjustment

- The Dean can drag any subject's card to a different day/time/room slot on the calendar.
- Since subjects are paired (same time/room on both days of MW or TTh), dragging one day's card moves both linked sessions together — they never desynchronize.
- On drop, validate against hard constraints (teacher availability, room type match, no double-booking) using the same logic as `csp.ts`.
- **If the new position conflicts with another already-placed subject** (same teacher or same room, overlapping time): automatically find a new valid slot for the *displaced* subject and move it there — do not just reject the drag. Reuse `buildDomain` from `csp.ts` to search for the displaced subject's next best valid slot, keeping everything else fixed.
- **Cascading**: if moving the displaced subject itself creates a new conflict with a third subject, repeat the same auto-adjustment for that one too. Limit this cascade to a maximum depth (e.g. 3 subjects deep) to prevent runaway chains — if the cascade hits the limit without resolving, revert the original drag entirely and show the Dean a clear reason why (reuse the `explainInfeasibility` diagnostic pattern, scoped to the specific subjects involved).
- Every successful auto-adjustment shows a toast (`sonner`) naming what moved and where (e.g. "Moved CS 201 to Tue/Thu 1:00 PM to make room for your change").
- Put this logic in a new `convex/scheduling/reschedule.ts`, separate from `csp.ts`'s full-generation logic — this solves a different problem (adjust one existing schedule) and should not be merged into the generation algorithm.

### UI/UX Requirements

- Follow `ui-context.md`: borderless separation via background contrast, muted/non-neon palette (including the teacher color set), Roboto for card text, Montserrat for headers.
- Mobile-first: the full weekly grid won't fit on small screens — use a day-by-day swipeable/tabbed view instead of squeezing the grid (a deliberate, documented exception to the general horizontal-scroll rule in `code-standards.md`, since drag-and-drop on a squeezed/scrolled grid is unusable).
- Include `ScheduleCalendarSkeleton.tsx` (loading), the shared `EmptyState` (no schedule generated yet), and error states per existing conventions.

### New Dependencies / shadcn Components

- Check `components/ui/` before adding anything. Likely needed: `tooltip`, `sonner`, `badge`.
- New non-shadcn dependency: `dnd-kit` for drag-and-drop — confirm and log this in `progress-tracker.md` before installing.

### Scope Note

This reverses the "manual drag-and-drop schedule editing" item in `project-overview.md`'s Out of Scope list. Update `project-overview.md` to move it into In Scope (described accurately per this feature) and log the scope change with today's date in `progress-tracker.md`.

### Linting

- Run the project's lint command and fix all errors and warnings before considering this done — do not disable rules to force a pass.
- Confirm `npm run build` also passes, per the "Before Moving to the Next Unit" checklist in `ai-workflow-rules.md`.

### Before finishing

- Confirm the calendar renders as card-based time blocks (not a list/table), with each teacher's cards in a consistent color and a visible legend.
- Confirm dragging a subject to a valid empty slot moves both paired sessions (MW or TTh) together and saves correctly.
- Confirm dragging into a conflict triggers correct cascading auto-adjustment, up to the depth limit, with clear toast notifications for every subject that moved.
- Confirm a drag that can't be resolved even after cascading reverts cleanly with a clear explanation — never leaves the schedule in a broken/partial state.
- Update `progress-tracker.md`: scope change, new dependency (`dnd-kit`), cascade depth limit chosen, and any open questions.
- Do not touch `components/ui/*` internals directly — only add new primitives via the CLI.