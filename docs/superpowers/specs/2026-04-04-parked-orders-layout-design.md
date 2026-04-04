# Parked Orders Layout Design

Date: 2026-04-04

## Goal

Move parked orders out of the inline invoice summary flow so large parked-order counts do not push primary action buttons too far down the page.

## Problem

The current parked orders rail sits directly above the invoice action buttons. When the number of parked orders grows, the summary area becomes taller and the main cashier buttons move lower on the page. This makes the checkout surface harder to use, especially during busy counters and small viewports.

## Design Decision

Use a responsive split approach:

1. `Desktop`: a right-side parked-orders drawer
2. `Mobile/Tablet`: a horizontal parked-order tabs/chips strip with a full-list secondary surface

The parked orders list should never expand inline inside the primary action area.

## Desktop Design

- Replace the inline parked orders rail with a compact summary trigger near the action area
- Show a `Parked Orders (count)` summary with recent-order context
- Open a `right-side collapsible drawer` for the full parked orders list
- The drawer should have its own internal scroll
- Main invoice action buttons must remain visually stable and not shift downward when parked-order count increases

### Desktop Drawer Behavior

- Default can be collapsed
- Clicking the summary trigger opens the drawer
- Clicking a parked order resumes it
- After resume, the drawer can close automatically
- `View all` behavior should reuse the same drawer rather than opening a duplicate surface

## Mobile / Tablet Design

- Show a `horizontal parked orders strip` using tabs/chips/cards for recent parked orders only
- Limit the visible surface to a small recent subset
- Include a `View all` action at the end of the strip
- `View all` opens a secondary full-list surface such as a sheet or fullscreen modal
- The full list should be scrollable inside that secondary surface, not in the main page

### Mobile / Tablet Behavior

- Tapping a visible parked chip resumes the order directly
- Tapping `View all` opens the full list
- After resume, the sheet/modal can close automatically
- The primary payment and action buttons should stay in place and remain reachable

## Shared Rules

- Do not render the full parked orders list inline in the invoice summary
- Keep a shared parked-order list component for desktop drawer and mobile full-list surface
- Reuse the existing parked order load/resume flow
- Reuse the existing parked order cache/store instead of creating a new parked-order subsystem

## UI Structure

### Desktop

- `Invoice Summary`
  - compact parked-order trigger
  - action buttons
- `Right Drawer`
  - header with count
  - searchable/scrollable list if needed later
  - resume action per parked order

### Mobile / Tablet

- `Invoice Summary`
  - horizontal parked-order strip
  - action buttons
- `Bottom Sheet / Fullscreen Modal`
  - full parked order list
  - resume action per parked order

## Responsiveness

- Use existing responsive utilities to choose desktop drawer vs mobile/tablet strip
- Desktop should prioritize stable vertical layout
- Mobile/tablet should prioritize touch-friendly quick switching and shallow scroll depth

## Reuse Rules

- Reuse `ParkedOrdersRail.vue` if practical, but only after reducing it to a compact recent-orders surface
- If needed, split responsibilities into:
  - compact trigger/strip component
  - full parked-order list component
- Reuse current `view all` and `resume` handlers from `InvoiceSummary.vue`

## Testing

Verify:

- parked orders no longer increase invoice summary height on desktop
- desktop shows drawer trigger instead of full inline list
- mobile/tablet shows compact recent strip instead of full inline list
- `View all` opens the correct secondary surface
- resume still works from both compact and full-list surfaces
- action buttons remain present and reachable regardless of parked-order count

## Recommendation

Proceed with:

- desktop parked-orders drawer
- mobile/tablet horizontal parked-order strip
- shared secondary full-list surface
- no inline full-list rendering in the summary area

This gives the best balance of cashier speed, stable layout, and scalability when parked-order counts grow.
