# POS Unified Offline Sync And Action Surfaces Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified offline sync system for POS Awesome and move sync/cache/diagnostic actions out of the crowded main menu into clearer status and settings surfaces.

**Architecture:** Add a `SyncCoordinator` plus per-resource adapters over the existing IndexedDB/cache layer, then expose sync state through a dedicated offline/status panel instead of adding more main-menu actions. Roll out in slices: foundation first, then UI surfaces, then boot-critical resource sync, then heavy operational delta sync, then diagnostics and polish.

**Tech Stack:** Vue 3, Pinia, Dexie/IndexedDB, Vitest, Python/Frappe API methods, unittest, Vite

---

## Chunk 1: Sync Foundation

### Task 1: Define sync types and registry contract

**Files:**
- Create: `frontend/src/offline/sync/types.ts`
- Create: `frontend/src/offline/sync/resourceRegistry.ts`
- Create: `frontend/tests/syncResourceRegistry.spec.ts`
- Modify: `frontend/src/offline/index.ts`

- [ ] **Step 1: Write failing tests for resource registration and priority ordering**
- [ ] **Step 2: Add shared sync types for resource ids, trigger kinds, priorities, and sync-state records**
- [ ] **Step 3: Add a registry module that exports deterministic resource metadata without runtime side effects**
- [ ] **Step 4: Run `yarn.cmd --cwd frontend test --run tests/syncResourceRegistry.spec.ts` and confirm pass**
- [ ] **Step 5: Commit with `git commit -m "feat: add offline sync resource registry foundation"`**

### Task 2: Add persistent sync-state storage

**Files:**
- Modify: `frontend/src/offline/db.ts`
- Modify: `frontend/src/offline/cache.ts`
- Create: `frontend/src/offline/sync/syncState.ts`
- Create: `frontend/tests/syncState.spec.ts`

- [ ] **Step 1: Write failing tests for reading/writing per-resource sync state**
- [ ] **Step 2: Add any missing `sync_state` helpers over the existing Dexie schema instead of inventing a second persistence path**
- [ ] **Step 3: Implement typed helpers for `last_synced_at`, `watermark`, `last_error`, `scope_signature`, and `consecutive_failures`**
- [ ] **Step 4: Run `yarn.cmd --cwd frontend test --run tests/syncState.spec.ts tests/offlineKeyMapParity.spec.ts` and confirm pass**
- [ ] **Step 5: Commit with `git commit -m "feat: persist offline resource sync state"`**

### Task 3: Create SyncCoordinator skeleton

**Files:**
- Create: `frontend/src/offline/sync/SyncCoordinator.ts`
- Create: `frontend/src/offline/sync/useSyncCoordinator.ts`
- Create: `frontend/tests/syncCoordinator.spec.ts`
- Modify: `frontend/src/offline/index.ts`

- [ ] **Step 1: Write failing tests for trigger deduplication, priority order, and limited concurrency**
- [ ] **Step 2: Implement a coordinator that schedules resources but does not yet contain resource-specific fetch logic**
- [ ] **Step 3: Add explicit states for `idle`, `syncing`, `fresh`, `stale`, `error`, and `limited`**
- [ ] **Step 4: Run `yarn.cmd --cwd frontend test --run tests/syncCoordinator.spec.ts tests/syncResourceRegistry.spec.ts tests/syncState.spec.ts` and confirm pass**
- [ ] **Step 5: Commit with `git commit -m "feat: add offline sync coordinator skeleton"`**

## Chunk 2: Action Surface Refactor

### Task 4: Add offline/status panel state and component

**Files:**
- Create: `frontend/src/posapp/stores/offlineSyncStore.ts`
- Create: `frontend/src/posapp/components/navbar/OfflineStatusPanel.vue`
- Create: `frontend/tests/offlineStatusPanel.spec.ts`
- Modify: `frontend/src/posapp/components/navbar/StatusIndicator.vue`
- Modify: `frontend/src/posapp/components/Navbar.vue`

- [ ] **Step 1: Write failing tests for a status-triggered panel that can show stale resources and action buttons**
- [ ] **Step 2: Add a small store for visible sync summary, resource statuses, and repair actions**
- [ ] **Step 3: Implement `OfflineStatusPanel.vue` and wire it to the existing status indicator entry point**
- [ ] **Step 4: Run `yarn.cmd --cwd frontend test --run tests/offlineStatusPanel.spec.ts tests/statusIndicator.spec.ts` and confirm pass**
- [ ] **Step 5: Commit with `git commit -m "feat: add offline status panel surface"`**

### Task 5: Slim the main menu and relocate maintenance actions

**Files:**
- Modify: `frontend/src/posapp/components/navbar/NavbarMenu.vue`
- Modify: `frontend/src/posapp/components/navbar/StatusIndicator.vue`
- Modify: `frontend/src/posapp/layouts/DefaultLayout.vue`
- Create: `frontend/tests/navbarMenuActions.spec.ts`

- [ ] **Step 1: Write failing tests that the main menu only keeps cashier/high-frequency actions**
- [ ] **Step 2: Move `Refresh Offline Data`, `Rebuild Offline Data`, and diagnostics ownership to the status panel**
- [ ] **Step 3: Keep `Sync Offline Sales` distinct in the main menu and leave `Clear Cache` in settings/tools only**
- [ ] **Step 4: Run `yarn.cmd --cwd frontend test --run tests/navbarMenuActions.spec.ts tests/offlineStatusPanel.spec.ts` and confirm pass**
- [ ] **Step 5: Commit with `git commit -m "refactor: separate offline data actions from cashier menu"`**

## Chunk 3: Boot-Critical Resource Sync

### Task 6: Add backend sync endpoints for boot-critical config

**Files:**
- Create: `posawesome/posawesome/api/offline_sync/__init__.py`
- Create: `posawesome/posawesome/api/offline_sync/bootstrap.py`
- Create: `posawesome/posawesome/api/offline_sync/currencies.py`
- Create: `posawesome/posawesome/api/offline_sync/payment_methods.py`
- Create: `posawesome/posawesome/api/test_offline_sync_bootstrap.py`
- Create: `posawesome/posawesome/api/test_offline_sync_currencies.py`
- Create: `posawesome/posawesome/api/test_offline_sync_payment_methods.py`

- [ ] **Step 1: Write failing unittest coverage for delta/scoped responses, delete payloads where relevant, and watermark behavior**
- [ ] **Step 2: Add backend methods for bootstrap config, available currencies, exchange-rate scope, price-list metadata, and payment-method currency mappings**
- [ ] **Step 3: Keep response shape consistent: `changes`, `deleted`, `next_watermark`, `has_more`, optional `full_resync_required`**
- [ ] **Step 4: Run `python -m unittest posawesome.posawesome.api.test_offline_sync_bootstrap posawesome.posawesome.api.test_offline_sync_currencies posawesome.posawesome.api.test_offline_sync_payment_methods` and confirm pass**
- [ ] **Step 5: Commit with `git commit -m "feat: add boot-critical offline sync endpoints"`**

### Task 7: Implement boot-critical resource adapters

**Files:**
- Create: `frontend/src/offline/sync/adapters/bootstrapConfig.ts`
- Create: `frontend/src/offline/sync/adapters/currencyMatrix.ts`
- Create: `frontend/src/offline/sync/adapters/paymentMethodCurrencies.ts`
- Modify: `frontend/src/offline/bootstrapSnapshot.ts`
- Modify: `frontend/src/offline/cache.ts`
- Modify: `frontend/src/posapp/utils/bootstrapWarnings.ts`
- Create: `frontend/tests/offlineSyncBootCritical.spec.ts`

- [ ] **Step 1: Write failing frontend tests for boot-critical sync success, stale state, and limited-mode reporting**
- [ ] **Step 2: Implement adapters that write through the existing cache helpers instead of bypassing them**
- [ ] **Step 3: Feed adapter readiness back into bootstrap snapshot and warning generation**
- [ ] **Step 4: Run `yarn.cmd --cwd frontend test --run tests/offlineSyncBootCritical.spec.ts tests/bootstrapSnapshot.spec.ts` and confirm pass**
- [ ] **Step 5: Commit with `git commit -m "feat: sync boot-critical offline resources"`**

### Task 8: Wire SyncCoordinator into boot and online-resume flow

**Files:**
- Modify: `frontend/src/posapp/layouts/DefaultLayout.vue`
- Modify: `frontend/src/posapp/composables/core/useNetwork.ts`
- Modify: `frontend/src/posapp/components/Navbar.vue`
- Modify: `frontend/src/posapp/stores/offlineSyncStore.ts`
- Create: `frontend/tests/offlineSyncTriggers.spec.ts`

- [ ] **Step 1: Write failing tests for boot warm-sync, online-resume sync, and deduped re-entry**
- [ ] **Step 2: Start boot-critical warm sync after first paint, not before usable render**
- [ ] **Step 3: Update the status panel/store when coordinator state changes**
- [ ] **Step 4: Run `yarn.cmd --cwd frontend test --run tests/offlineSyncTriggers.spec.ts tests/offlineStatusPanel.spec.ts tests/offlineSyncBootCritical.spec.ts` and confirm pass**
- [ ] **Step 5: Commit with `git commit -m "feat: trigger boot-critical sync on boot and resume"`**

## Chunk 4: Heavy Operational Delta Sync

### Task 9: Add backend delta endpoints for items, prices, stock, and customers

**Files:**
- Create: `posawesome/posawesome/api/offline_sync/items.py`
- Create: `posawesome/posawesome/api/offline_sync/customers.py`
- Create: `posawesome/posawesome/api/offline_sync/stock.py`
- Create: `posawesome/posawesome/api/test_offline_sync_items.py`
- Create: `posawesome/posawesome/api/test_offline_sync_customers.py`
- Create: `posawesome/posawesome/api/test_offline_sync_stock.py`
- Modify: `posawesome/posawesome/api/items.py`
- Modify: `posawesome/posawesome/api/customers.py`

- [ ] **Step 1: Write failing backend tests for delta updates, scoped deletes, and pagination**
- [ ] **Step 2: Implement item, customer, and stock sync endpoints with deterministic watermarks**
- [ ] **Step 3: Reuse existing query/business helpers where possible instead of duplicating fetch logic**
- [ ] **Step 4: Run `python -m unittest posawesome.posawesome.api.test_offline_sync_items posawesome.posawesome.api.test_offline_sync_customers posawesome.posawesome.api.test_offline_sync_stock` and confirm pass**
- [ ] **Step 5: Commit with `git commit -m "feat: add operational offline delta sync endpoints"`**

### Task 10: Implement heavy resource adapters and scoped invalidation

**Files:**
- Create: `frontend/src/offline/sync/adapters/items.ts`
- Create: `frontend/src/offline/sync/adapters/customers.ts`
- Create: `frontend/src/offline/sync/adapters/stock.ts`
- Modify: `frontend/src/offline/items.ts`
- Modify: `frontend/src/offline/customers.ts`
- Modify: `frontend/src/offline/stock.ts`
- Modify: `frontend/src/posapp/stores/itemsStore.ts`
- Modify: `frontend/src/posapp/stores/customersStore.ts`
- Create: `frontend/tests/offlineSyncOperational.spec.ts`

- [ ] **Step 1: Write failing tests for delta merge, delete handling, and profile/company invalidation**
- [ ] **Step 2: Implement adapters that apply changes through existing offline item/customer/stock writers**
- [ ] **Step 3: Invalidate mismatched scoped data on profile/company changes without wiping unrelated durable state**
- [ ] **Step 4: Run `yarn.cmd --cwd frontend test --run tests/offlineSyncOperational.spec.ts tests/offlineItemsCache.spec.ts tests/bootstrapSnapshot.spec.ts` and confirm pass**
- [ ] **Step 5: Commit with `git commit -m "feat: delta-sync operational offline datasets"`**

## Chunk 5: Diagnostics, Repair, and Final Polish

### Task 11: Add diagnostics and manual repair actions

**Files:**
- Create: `frontend/src/posapp/components/navbar/OfflineDiagnosticsDialog.vue`
- Create: `frontend/tests/offlineDiagnostics.spec.ts`
- Modify: `frontend/src/posapp/components/navbar/OfflineStatusPanel.vue`
- Modify: `frontend/src/posapp/components/navbar/NavbarMenu.vue`
- Modify: `frontend/src/offline/cache.ts`
- Modify: `frontend/src/offline/sync/SyncCoordinator.ts`

- [ ] **Step 1: Write failing tests for diagnostics visibility, stale resource details, and repair action dispatch**
- [ ] **Step 2: Add `Refresh Offline Data`, `Rebuild Offline Data`, and diagnostics flows to the status panel**
- [ ] **Step 3: Keep `Clear Cache` in settings/tools and make sure copy differentiates it from data refresh**
- [ ] **Step 4: Run `yarn.cmd --cwd frontend test --run tests/offlineDiagnostics.spec.ts tests/offlineStatusPanel.spec.ts tests/navbarMenuActions.spec.ts` and confirm pass**
- [ ] **Step 5: Commit with `git commit -m "feat: add offline sync diagnostics and repair actions"`**

### Task 12: End-to-end verification and cleanup

**Files:**
- Modify: `frontend/tests/smoke/offline-pos-shell.spec.ts`
- Modify: `frontend/tests/smoke/posapp.global-errors.spec.ts`
- Modify: `docs/superpowers/specs/2026-04-09-pos-unified-offline-sync-and-action-surfaces-design.md` (only if implementation forced design drift)
- Modify: `docs/superpowers/plans/2026-04-09-pos-unified-offline-sync-and-action-surfaces-implementation-plan.md` (checklist updates only if needed)

- [ ] **Step 1: Add or update smoke coverage for warm boot, online resume refresh, and menu/status action separation**
- [ ] **Step 2: Run the targeted frontend suites for sync foundation, panel UI, and operational adapters**
- [ ] **Step 3: Run the backend unittest suites for offline sync endpoints**
- [ ] **Step 4: Run `yarn.cmd --cwd frontend build` and confirm pass**
- [ ] **Step 5: Commit with `git commit -m "test: verify unified offline sync rollout"`**

## Final Verification

- [ ] Run: `yarn.cmd --cwd frontend test --run tests/syncResourceRegistry.spec.ts tests/syncState.spec.ts tests/syncCoordinator.spec.ts tests/offlineStatusPanel.spec.ts tests/navbarMenuActions.spec.ts tests/offlineSyncBootCritical.spec.ts tests/offlineSyncTriggers.spec.ts tests/offlineSyncOperational.spec.ts tests/offlineDiagnostics.spec.ts`
- [ ] Run: `python -m unittest posawesome.posawesome.api.test_offline_sync_bootstrap posawesome.posawesome.api.test_offline_sync_currencies posawesome.posawesome.api.test_offline_sync_payment_methods posawesome.posawesome.api.test_offline_sync_items posawesome.posawesome.api.test_offline_sync_customers posawesome.posawesome.api.test_offline_sync_stock`
- [ ] Run: `yarn.cmd --cwd frontend build`
- [ ] Check: `git status --short`
