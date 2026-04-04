# Invoice Repair Action Design

**Goal:** Add a targeted UI action for repairing historical POS invoices where non-cash overpayment change created an unallocated `Pay` payment entry and left the invoice with negative outstanding.

**Context:** The existing Pay screen auto-reconcile flow operates at the customer level and only works with positive outstanding invoices. Historical overpayment-change breakage is invoice-specific and sits on submitted POS invoices with negative outstanding, so it needs a dedicated action in invoice history/details instead of reusing bulk reconciliation.

**Design:**
- Add a dedicated `Repair Change Allocation` action to the invoice detail dialog in `InvoiceManagement.vue`.
- Show the action only for likely candidates:
  - submitted POS invoice
  - non-return invoice
  - `change_amount > 0`
  - `outstanding_amount < 0`
- On click, first call `repair_overpayment_change_allocations` with `dry_run=1` and the current invoice name.
- If the preview returns exactly one match and no skips, prompt for confirmation.
- On confirmation, call the same API with `dry_run=0`, then reload invoice detail and history/unpaid tabs, and show a success toast.
- If preview finds no exact match or an ambiguous case, surface that in a toast and do not mutate anything.

**Error handling:**
- Offline mode blocks the action with an info toast.
- Backend preview failures or reconcile failures show an error toast.
- Ambiguous/no-match previews stay non-destructive.

**Testing:**
- Add a focused frontend regression test for repair-candidate detection and the preview/apply API flow.
- Re-run backend payment tests to keep the repair helper contract verified.
