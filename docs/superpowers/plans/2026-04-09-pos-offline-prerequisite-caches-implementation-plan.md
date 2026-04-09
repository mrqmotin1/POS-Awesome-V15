# POS Offline Prerequisite Caches Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist missing offline prerequisite datasets and expose real cache usage so POS startup warnings and cache diagnostics reflect actual offline readiness.

**Architecture:** Extend the shared offline cache/db layer with new scoped caches and wire the existing fetch flows to save and read them. Keep startup permissive: missing datasets degrade individual features and surface explicit limited-mode warnings instead of blocking the app.

**Tech Stack:** Vue 3, Pinia, Dexie/IndexedDB, Vitest, Vite

---

## Chunk 1: Offline Cache Foundations

### Task 1: Add failing cache-layer tests

**Files:**
- Create: `frontend/tests/offlinePrerequisiteCaches.spec.ts`
- Modify: `frontend/tests/offlineKeyMapParity.spec.ts`

- [ ] **Step 1: Write the failing tests**
- [ ] **Step 2: Run the new tests to verify they fail**
- [ ] **Step 3: Cover key-map/storage expectations for the new caches**
- [ ] **Step 4: Re-run tests and confirm only implementation gaps remain**
- [ ] **Step 5: Commit**

### Task 2: Extend offline DB/cache schema

**Files:**
- Modify: `frontend/src/offline/db.ts`
- Modify: `frontend/src/offline/cache.ts`
- Modify: `frontend/src/offline/index.ts`

- [ ] **Step 1: Add new memory keys and `KEY_TABLE_MAP` entries**
- [ ] **Step 2: Add save/get helpers for each new cache**
- [ ] **Step 3: Keep serialization/profile scoping minimal and deterministic**
- [ ] **Step 4: Run targeted tests**
- [ ] **Step 5: Commit**

### Task 3: Replace zero cache-usage stub

**Files:**
- Modify: `frontend/src/offline/cache.ts`
- Test: `frontend/tests/offlinePrerequisiteCaches.spec.ts`

- [ ] **Step 1: Add a failing usage-estimator test**
- [ ] **Step 2: Implement approximate IndexedDB + localStorage byte calculation**
- [ ] **Step 3: Verify the estimator returns non-zero totals for seeded cache data**
- [ ] **Step 4: Run targeted tests**
- [ ] **Step 5: Commit**

## Chunk 2: Runtime Cache Wiring

### Task 4: Persist delivery charges and customer addresses

**Files:**
- Modify: `frontend/src/posapp/composables/pos/invoice/useInvoiceItems.ts`
- Modify: `frontend/src/posapp/composables/pos/invoice/useInvoiceDetails.ts`
- Modify: `frontend/src/offline/cache.ts`
- Test: `frontend/tests/offlinePrerequisiteCaches.spec.ts`

- [ ] **Step 1: Write failing tests for delivery-charge/address persistence behavior**
- [ ] **Step 2: Save successful online responses into offline cache**
- [ ] **Step 3: Use cached values in offline mode**
- [ ] **Step 4: Run targeted tests**
- [ ] **Step 5: Commit**

### Task 5: Persist currencies, exchange rates, and price-list metadata

**Files:**
- Modify: `frontend/src/posapp/composables/pos/invoice/useInvoiceCurrency.ts`
- Modify: `frontend/src/offline/cache.ts`
- Test: `frontend/tests/offlinePrerequisiteCaches.spec.ts`

- [ ] **Step 1: Write failing tests for currency/exchange-rate cache behavior**
- [ ] **Step 2: Save and read available currencies, exchange-rate pairs, and price-list metadata through offline helpers**
- [ ] **Step 3: Keep scope keyed by profile/company/currency pair**
- [ ] **Step 4: Run targeted tests**
- [ ] **Step 5: Commit**

### Task 6: Persist payment-method currency mappings

**Files:**
- Modify: `frontend/src/posapp/components/pos/shell/PayView.vue`
- Modify: `frontend/src/offline/cache.ts`
- Test: `frontend/tests/offlinePrerequisiteCaches.spec.ts`

- [ ] **Step 1: Write failing tests for payment-method currency fallback**
- [ ] **Step 2: Cache online mapping responses and use them offline**
- [ ] **Step 3: Keep basic payment flow usable when mapping cache is missing**
- [ ] **Step 4: Run targeted tests**
- [ ] **Step 5: Commit**

## Chunk 3: Bootstrap and Diagnostics

### Task 7: Expand bootstrap prerequisites and warning copy

**Files:**
- Modify: `frontend/src/offline/bootstrapSnapshot.ts`
- Modify: `frontend/src/posapp/utils/bootstrapWarnings.ts`
- Modify: `frontend/src/posapp/layouts/DefaultLayout.vue`
- Test: `frontend/tests/bootstrapSnapshot.spec.ts`
- Test: `frontend/tests/bootstrapWarningPresentation.spec.ts`

- [ ] **Step 1: Write failing tests for new prerequisite codes**
- [ ] **Step 2: Add the new prerequisite states to bootstrap snapshot collection**
- [ ] **Step 3: Add explicit warning text for each new missing cache**
- [ ] **Step 4: Run targeted tests**
- [ ] **Step 5: Commit**

### Task 8: Verify cache meter integration

**Files:**
- Modify: `frontend/src/posapp/layouts/DefaultLayout.vue`
- Modify: `frontend/src/posapp/composables/core/useNavbar.ts`
- Test: `frontend/tests/offlinePrerequisiteCaches.spec.ts`

- [ ] **Step 1: Confirm UI refresh path consumes real cache usage output**
- [ ] **Step 2: Add/adjust tests only if behavior changed**
- [ ] **Step 3: Run targeted tests**
- [ ] **Step 4: Run `yarn.cmd --cwd frontend build`**
- [ ] **Step 5: Commit**

## Final Verification

- [ ] Run: `yarn.cmd --cwd frontend test --run tests/offlinePrerequisiteCaches.spec.ts tests/offlineKeyMapParity.spec.ts tests/bootstrapSnapshot.spec.ts tests/bootstrapWarningPresentation.spec.ts`
- [ ] Run: `yarn.cmd --cwd frontend build`
- [ ] Check: `git status --short`
