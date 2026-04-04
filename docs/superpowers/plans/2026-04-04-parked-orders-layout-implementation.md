# Parked Orders Layout Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move parked orders out of the inline invoice summary so action buttons remain reachable, using a desktop drawer and a mobile/tablet compact strip plus secondary full-list surface.

**Architecture:** Keep the current parked-order store and resume/load handlers, but split the UI into reusable surfaces: a compact summary/strip, a shared full parked-order list, and responsive containers for desktop drawer vs mobile/tablet sheet. `InvoiceSummary.vue` remains the orchestration point so no new parked-order subsystem is introduced.

**Tech Stack:** Vue 3, Pinia, Vuetify, Vitest, TypeScript via `vue-tsc`

---

## Chunk 1: Shared Parked Order Surfaces

### Task 1: Extract a reusable full parked-order list surface

**Files:**
- Create: `frontend/src/posapp/components/pos/invoice/ParkedOrdersList.vue`
- Modify: `frontend/src/posapp/components/pos/invoice/ParkedOrdersRail.vue`
- Test: `frontend/tests/parkedOrdersRail.spec.ts`

- [ ] **Step 1: Write the failing test**

Add/extend tests to assert:
- a shared full list surface can render parked orders independently
- resume and view-all actions still emit correctly

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn.cmd --cwd frontend test --run tests/parkedOrdersRail.spec.ts`
Expected: FAIL because the current component only supports inline rail rendering

- [ ] **Step 3: Write minimal implementation**

Create `ParkedOrdersList.vue` to own:
- parked order cards
- empty state (if needed later)
- resume click behavior

Reduce `ParkedOrdersRail.vue` to a compact recent-orders strip/summary surface instead of the full inline grid.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn.cmd --cwd frontend test --run tests/parkedOrdersRail.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/posapp/components/pos/invoice/ParkedOrdersList.vue frontend/src/posapp/components/pos/invoice/ParkedOrdersRail.vue frontend/tests/parkedOrdersRail.spec.ts
git commit -m "refactor(pos): split parked orders into compact and full-list surfaces"
```

### Task 2: Add desktop drawer and mobile/tablet full-list surface state to invoice summary

**Files:**
- Modify: `frontend/src/posapp/components/pos/invoice/InvoiceSummary.vue`
- Test: `frontend/tests/parkedOrdersRail.spec.ts`

- [ ] **Step 1: Write the failing test**

Add/extend tests to assert:
- desktop no longer renders a full inline parked list above buttons
- mobile/tablet uses a compact strip and secondary full-list surface

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn.cmd --cwd frontend test --run tests/parkedOrdersRail.spec.ts`
Expected: FAIL because parked orders are still inline in the summary column

- [ ] **Step 3: Write minimal implementation**

In `InvoiceSummary.vue`:
- add responsive state using existing responsive utilities
- desktop:
  - render compact parked-order trigger
  - open a right-side drawer containing `ParkedOrdersList`
- mobile/tablet:
  - render compact horizontal strip with recent parked orders
  - open a bottom sheet/fullscreen modal for full list
- keep existing `handleResumeParkedOrder` and `handleLoadDrafts` flow

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn.cmd --cwd frontend test --run tests/parkedOrdersRail.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/posapp/components/pos/invoice/InvoiceSummary.vue frontend/tests/parkedOrdersRail.spec.ts
git commit -m "feat(pos): add responsive parked orders drawer and sheet"
```

## Chunk 2: Responsive Polish and Regression Coverage

### Task 3: Keep action buttons stable and recent parked items compact

**Files:**
- Modify: `frontend/src/posapp/components/pos/invoice/ParkedOrdersRail.vue`
- Modify: `frontend/src/posapp/components/pos/invoice/InvoiceSummary.vue`
- Test: `frontend/tests/parkedOrdersRail.spec.ts`

- [ ] **Step 1: Write the failing test**

Add/extend tests to assert:
- compact strip only shows a recent subset
- full list lives in the drawer/sheet instead of the summary body
- action controls remain present regardless of parked-order count

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn.cmd --cwd frontend test --run tests/parkedOrdersRail.spec.ts`
Expected: FAIL before compact subset behavior is finalized

- [ ] **Step 3: Write minimal implementation**

Apply polish:
- desktop compact trigger with count and recent context
- mobile/tablet horizontal strip/chips for recent parked orders
- independent scroll for drawer/sheet full list
- auto-close drawer/sheet after resume if it improves flow

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn.cmd --cwd frontend test --run tests/parkedOrdersRail.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/posapp/components/pos/invoice/ParkedOrdersRail.vue frontend/src/posapp/components/pos/invoice/InvoiceSummary.vue frontend/tests/parkedOrdersRail.spec.ts
git commit -m "refactor(pos): keep parked orders compact across breakpoints"
```

### Task 4: Verify regressions and update progress log

**Files:**
- Modify: `progress.md`
- Test: `frontend/tests/parkedOrdersRail.spec.ts`
- Test: `frontend/tests/uiStore.spec.ts`

- [ ] **Step 1: Write the failing test**

Extend regression coverage so it confirms:
- parked orders still come from the existing store
- resume behavior still works
- no regression in parked-order visibility logic

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn.cmd --cwd frontend test --run tests/parkedOrdersRail.spec.ts tests/uiStore.spec.ts`
Expected: FAIL if relocation breaks store-backed behavior

- [ ] **Step 3: Write minimal implementation**

Adjust any remaining integration edges and update `progress.md` with the delivered responsive parked-order redesign.

- [ ] **Step 4: Run test to verify it passes**

Run:
- `yarn.cmd --cwd frontend test --run tests/parkedOrdersRail.spec.ts tests/uiStore.spec.ts`
- `yarn.cmd --cwd frontend type-check`

Expected:
- all tests PASS
- type-check PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/tests/parkedOrdersRail.spec.ts frontend/tests/uiStore.spec.ts progress.md
git commit -m "test(pos): cover responsive parked orders layout"
```
