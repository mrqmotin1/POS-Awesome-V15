# Navbar Settings Panel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a border-separated `Settings` entry to the left drawer that opens a dedicated POS settings panel for offline, terminal, personal, and diagnostics actions.

**Architecture:** Keep route navigation in `NavbarDrawer.vue`, add a footer-owned settings launcher there, and let `Navbar.vue` own a new `NavbarSettingsPanel.vue` surface plus the existing action handlers. Reuse existing offline/menu handlers so the panel becomes the stable home for low-frequency settings without changing POS route state.

**Tech Stack:** Vue 3, Vuetify, Pinia, Vitest, Vue Test Utils

---

## File Structure

- Modify: `frontend/src/posapp/components/navbar/NavbarDrawer.vue`
  - Add footer settings area and emit a dedicated settings-open event.
- Create: `frontend/src/posapp/components/navbar/NavbarSettingsPanel.vue`
  - Render grouped settings sections and action buttons.
- Modify: `frontend/src/posapp/components/Navbar.vue`
  - Own panel open state, connect drawer settings click to the new panel, and route panel actions to existing handlers.
- Modify: `frontend/tests/navbar.spec.ts`
  - Cover drawer settings launcher visibility and navbar-owned panel open behavior.
- Create: `frontend/tests/navbarSettingsPanel.spec.ts`
  - Cover panel section/action rendering and emitted actions.

## Chunk 1: Test First

### Task 1: Drawer settings entry

**Files:**
- Modify: `frontend/tests/navbar.spec.ts`
- Modify: `frontend/src/posapp/components/navbar/NavbarDrawer.vue`

- [ ] **Step 1: Write the failing test**

Add a test that mounts `Navbar` with a real `NavbarDrawer` stub or prop inspection and expects a footer settings launcher contract to be passed to the drawer.

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn.cmd --cwd frontend test --run tests/navbar.spec.ts`
Expected: FAIL because no drawer settings footer contract exists yet.

- [ ] **Step 3: Write minimal implementation**

Add drawer footer props/events so `NavbarDrawer.vue` can render a settings entry and `Navbar.vue` can provide the label and handler.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn.cmd --cwd frontend test --run tests/navbar.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/tests/navbar.spec.ts frontend/src/posapp/components/navbar/NavbarDrawer.vue frontend/src/posapp/components/Navbar.vue
git commit -m "feat: add drawer settings launcher"
```

### Task 2: Settings panel surface

**Files:**
- Create: `frontend/tests/navbarSettingsPanel.spec.ts`
- Create: `frontend/src/posapp/components/navbar/NavbarSettingsPanel.vue`

- [ ] **Step 1: Write the failing test**

Add tests that expect grouped sections:
- `Offline & Sync`
- `Terminal & Devices`
- `Personal`
- `System / Diagnostics`

And verify action emits:
- `refresh-offline-data`
- `rebuild-offline-data`
- `clear-cache`
- `open-diagnostics`

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn.cmd --cwd frontend test --run tests/navbarSettingsPanel.spec.ts`
Expected: FAIL because the component does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `NavbarSettingsPanel.vue` as a light dialog/sheet component with grouped actions and emitted events.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn.cmd --cwd frontend test --run tests/navbarSettingsPanel.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/tests/navbarSettingsPanel.spec.ts frontend/src/posapp/components/navbar/NavbarSettingsPanel.vue
git commit -m "feat: add navbar settings panel"
```

## Chunk 2: Wiring and Regression Coverage

### Task 3: Navbar wiring

**Files:**
- Modify: `frontend/src/posapp/components/Navbar.vue`
- Modify: `frontend/tests/navbar.spec.ts`

- [ ] **Step 1: Write/update the failing test**

Extend `navbar.spec.ts` to verify:
- drawer settings click opens the settings panel
- drawer closes when settings panel opens
- panel events call the existing navbar handlers

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn.cmd --cwd frontend test --run tests/navbar.spec.ts tests/navbarSettingsPanel.spec.ts`
Expected: FAIL because navbar wiring is incomplete.

- [ ] **Step 3: Write minimal implementation**

Wire `Navbar.vue` to:
- manage `settingsPanelOpen`
- close drawer before opening panel
- pass grouped actions/feature flags into `NavbarSettingsPanel`
- reuse existing offline/session/theme/about handlers

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn.cmd --cwd frontend test --run tests/navbar.spec.ts tests/navbarSettingsPanel.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/posapp/components/Navbar.vue frontend/tests/navbar.spec.ts frontend/tests/navbarSettingsPanel.spec.ts
git commit -m "feat: wire drawer settings panel into navbar"
```

### Task 4: Full targeted verification and cleanup

**Files:**
- Modify as needed from prior tasks only
- Remove before final completion:
  - `docs/superpowers/specs/2026-04-09-navbar-settings-panel-design.md`
  - `docs/superpowers/plans/2026-04-09-navbar-settings-panel-implementation-plan.md`

- [ ] **Step 1: Run targeted regression tests**

Run:
- `yarn.cmd --cwd frontend test --run tests/navbar.spec.ts tests/navbarSettingsPanel.spec.ts tests/navbarMenuActions.spec.ts tests/offlineStatusPanel.spec.ts`

Expected: PASS

- [ ] **Step 2: Run build verification**

Run: `yarn.cmd --cwd frontend build`
Expected: PASS

- [ ] **Step 3: Remove temporary spec/plan docs**

Delete the temporary docs created for this feature after implementation is complete.

- [ ] **Step 4: Run final verification**

Run:
- `yarn.cmd --cwd frontend test --run tests/navbar.spec.ts tests/navbarSettingsPanel.spec.ts tests/navbarMenuActions.spec.ts tests/offlineStatusPanel.spec.ts`
- `yarn.cmd --cwd frontend build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/posapp/components/Navbar.vue frontend/src/posapp/components/navbar/NavbarDrawer.vue frontend/src/posapp/components/navbar/NavbarSettingsPanel.vue frontend/tests/navbar.spec.ts frontend/tests/navbarSettingsPanel.spec.ts frontend/tests/navbarMenuActions.spec.ts frontend/tests/offlineStatusPanel.spec.ts
git add -u docs/superpowers/specs/2026-04-09-navbar-settings-panel-design.md docs/superpowers/plans/2026-04-09-navbar-settings-panel-implementation-plan.md
git commit -m "feat: add drawer settings panel for POS actions"
```
