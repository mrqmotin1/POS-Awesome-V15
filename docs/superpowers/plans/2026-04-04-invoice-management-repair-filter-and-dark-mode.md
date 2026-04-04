# Invoice Management Repair Filter And Dark Mode Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a repair-candidate history filter and fix Invoice Management summary-card dark-mode styling while preserving cashier/supervisor scope rules.

**Architecture:** Reuse the existing `isRepairCandidate(invoice)` predicate to drive a history-tab toggle instead of introducing a new dataset or tab. Keep all scope logic in the current Invoice Management data loaders, and apply dark-mode polish through local CSS adjustments in the same component.

**Tech Stack:** Vue 3, Pinia, Vuetify, Vitest

---

## Chunk 1: Repair Candidate History Filter

### Task 1: Add failing frontend tests for the history repair-candidate toggle

**Files:**
- Modify: `frontend/src/posapp/components/pos/flows/InvoiceManagement.vue`
- Create or modify: `frontend/tests/invoiceManagementRepairFilter.spec.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run the focused test to verify it fails**
- [ ] **Step 3: Implement the minimal toggle/filter state**
- [ ] **Step 4: Re-run the focused test to verify it passes**
- [ ] **Step 5: Commit**

### Task 2: Wire the toggle into the history toolbar and summary calculations

**Files:**
- Modify: `frontend/src/posapp/components/pos/flows/InvoiceManagement.vue`
- Test: `frontend/tests/invoiceManagementRepairFilter.spec.ts`

- [ ] **Step 1: Extend the failing test for summary behavior**
- [ ] **Step 2: Run the focused test to verify it fails**
- [ ] **Step 3: Implement the minimal UI wiring**
- [ ] **Step 4: Re-run the focused test to verify it passes**
- [ ] **Step 5: Commit**

## Chunk 2: Dark Mode Summary Cards

### Task 3: Add failing coverage or assertions for dark-mode summary-card presentation

**Files:**
- Modify: `frontend/src/posapp/components/pos/flows/InvoiceManagement.vue`
- Create or modify: `frontend/tests/invoiceManagementDarkMode.spec.ts`

- [ ] **Step 1: Write the failing test or style assertion**
- [ ] **Step 2: Run the focused test to verify it fails**
- [ ] **Step 3: Implement the minimal dark-mode card polish**
- [ ] **Step 4: Run focused frontend verification**
- [ ] **Step 5: Commit**
