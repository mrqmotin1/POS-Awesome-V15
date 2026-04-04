# Invoice Repair Action Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a targeted invoice-detail action that previews and repairs historical overpayment-change allocations for one invoice at a time.

**Architecture:** Keep the repair logic on the backend in the dedicated helper and expose only a narrow invoice-level button in `InvoiceManagement.vue`. The frontend should preview first, confirm only on exact matches, then apply and refresh local invoice data.

**Tech Stack:** Vue 3, Vuetify, Vitest, Frappe RPC APIs, Python backend helper already added in `posawesome.posawesome.api.payments`

---

## Chunk 1: Frontend Repair Flow

### Task 1: Add failing UI regression coverage

**Files:**
- Create: `frontend/tests/invoiceRepairAction.spec.ts`
- Modify: `frontend/src/posapp/components/pos/flows/InvoiceManagement.vue`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run the test to verify it fails**
- [ ] **Step 3: Implement the minimal UI action and RPC flow**
- [ ] **Step 4: Run the test to verify it passes**
- [ ] **Step 5: Commit**

### Task 2: Refresh and feedback behavior

**Files:**
- Modify: `frontend/src/posapp/components/pos/flows/InvoiceManagement.vue`
- Test: `frontend/tests/invoiceRepairAction.spec.ts`

- [ ] **Step 1: Extend the failing test for refresh/toast behavior**
- [ ] **Step 2: Run the test to verify it fails**
- [ ] **Step 3: Implement the minimal refresh and error feedback**
- [ ] **Step 4: Run the focused frontend tests**
- [ ] **Step 5: Commit**

## Chunk 2: Backend Contract Verification

### Task 3: Keep the repair helper contract green

**Files:**
- Test: `posawesome/posawesome/api/test_payments.py`

- [ ] **Step 1: Re-run backend helper tests**
- [ ] **Step 2: Re-run invoice-processing tests**
- [ ] **Step 3: Fix any integration regression if found**
- [ ] **Step 4: Commit**
