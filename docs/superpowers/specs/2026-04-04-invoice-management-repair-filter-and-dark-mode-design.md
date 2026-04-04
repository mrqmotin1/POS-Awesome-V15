# Invoice Management Repair Filter And Dark Mode Design

**Goal:** Improve `Invoice Management` so that:
- cashiers only see invoice-management data for their current `POS Profile`
- supervisors see invoice-management data for the whole current `company`
- the `History` tab exposes a discoverable `Show Repair Candidates` filter for change-allocation repair candidates
- summary cards render correctly in dark mode

**Current state:**
- invoice-management scoping now depends on cashier role, but runtime behavior can still depend on how cashier metadata is hydrated
- the repair workflow exists only at invoice-detail level
- history discovery for repair candidates is missing
- summary cards use light-weight visual treatment that is not fully tuned for dark mode contrast

**Design:**
- Keep role scoping strict:
  - cashier: current `POS Profile` only
  - supervisor: current `company`, all `POS Profiles`
- Keep the repair workflow non-destructive and per-invoice:
  - no bulk repair action
  - `History` tab gets a visible `Show Repair Candidates` toggle/button
  - when enabled, history rows are additionally filtered by the existing `isRepairCandidate(invoice)` predicate
  - normal text search, date filters, and status filters still apply
- Preserve the existing detail action:
  - open invoice details
  - use `Repair Change Allocation` there to perform the actual fix
- Dark-mode polish stays local to `Invoice Management`:
  - summary cards get darker surfaces, stronger text contrast, and more theme-consistent gradients/borders
  - labels/meta copy remain readable against dark backgrounds

**UX details:**
- `Show Repair Candidates` appears in the `History` filter strip/header and is visible to all users
- toggle off: normal history behavior
- toggle on: history shows only candidate invoices and updates the summary-card counts/totals against the filtered set
- optional row-level visual cue can be added later, but not required for this iteration

**Error handling and behavior:**
- no change to actual repair logic
- no bulk mutation path
- if there are no repair candidates after filters, the normal empty state can be reused with candidate-aware copy if needed

**Testing:**
- frontend tests for role scoping remain green
- add frontend tests for history candidate filtering
- add frontend tests for dark-mode summary-card class/state behavior where practical
