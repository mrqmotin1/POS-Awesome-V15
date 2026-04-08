# POS Offline Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic offline bootstrap snapshot that validates POS startup prerequisites, supports limited mode, and requires explicit `Continue Offline` confirmation on build/profile mismatch.

**Architecture:** Build a central bootstrap snapshot module on top of the existing offline memory + Dexie persistence model. Reuse current caches as snapshot inputs, derive startup capabilities centrally, and let the layout consume a normalized startup decision instead of scattered cache heuristics.

**Tech Stack:** Vue 3, Pinia, TypeScript, Vitest, Dexie, existing POS Awesome offline cache utilities

---

## File Map

### Create

- `frontend/src/offline/bootstrapSnapshot.ts`
- `frontend/tests/bootstrapSnapshot.spec.ts`

### Modify

- `frontend/src/offline/db.ts`
- `frontend/src/offline/cache.ts`
- `frontend/src/offline/index.ts`
- `frontend/src/utils/pos_profile.ts`
- `frontend/src/posapp/composables/pos/shared/usePosShift.ts`
- `frontend/src/posapp/components/pos/shift/OpeningDialog.vue`
- `frontend/src/posapp/layouts/DefaultLayout.vue`

### Existing Tests To Keep Green

- `frontend/tests/chunkLoadRecovery.spec.ts`
- `frontend/tests/bundleVersionActivation.spec.ts`
- `frontend/tests/loaderPathNormalization.spec.ts`
- `frontend/tests/openingCache.spec.ts`

## Chunk 1: Snapshot Core And Persistence

### Task 1: Add failing tests for snapshot validation

**Files:**
- Create: `frontend/tests/bootstrapSnapshot.spec.ts`
- Create: `frontend/src/offline/bootstrapSnapshot.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
	buildBootstrapSnapshot,
	validateBootstrapSnapshot,
} from "../src/offline/bootstrapSnapshot";

describe("bootstrap snapshot", () => {
	it("returns confirmation_required on build mismatch", () => {
		const snapshot = buildBootstrapSnapshot({
			buildVersion: "build-1",
			profileName: "Main POS",
			profileModified: "2026-04-08 10:00:00",
			openingShiftName: "POS-OPEN-1",
			openingShiftUser: "test@example.com",
			prerequisites: {
				pos_profile: "ready",
				pos_opening_shift: "ready",
				payment_methods: "ready",
			},
		});

		const result = validateBootstrapSnapshot(snapshot, {
			buildVersion: "build-2",
			profileName: "Main POS",
			profileModified: "2026-04-08 10:00:00",
			sessionUser: "test@example.com",
		});

		expect(result.mode).toBe("confirmation_required");
		expect(result.reasons).toContain("build_version_mismatch");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn.cmd --cwd frontend test --run tests/bootstrapSnapshot.spec.ts`
Expected: FAIL because `bootstrapSnapshot.ts` does not exist or required exports are missing.

- [ ] **Step 3: Write minimal implementation**

```ts
export function buildBootstrapSnapshot(input: any) {
	return {
		build_version: input.buildVersion,
		profile_name: input.profileName,
		profile_modified: input.profileModified,
		opening_shift_name: input.openingShiftName,
		opening_shift_user: input.openingShiftUser,
		prerequisites: input.prerequisites || {},
	};
}

export function validateBootstrapSnapshot(snapshot: any, current: any) {
	const reasons: string[] = [];
	if (snapshot?.build_version !== current?.buildVersion) {
		reasons.push("build_version_mismatch");
	}
	return {
		mode: reasons.length ? "confirmation_required" : "normal",
		reasons,
	};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn.cmd --cwd frontend test --run tests/bootstrapSnapshot.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/tests/bootstrapSnapshot.spec.ts frontend/src/offline/bootstrapSnapshot.ts
git commit -m "test: add bootstrap snapshot validation coverage"
```

### Task 2: Expand snapshot tests to cover limited mode and opening-user mismatch

**Files:**
- Modify: `frontend/tests/bootstrapSnapshot.spec.ts`
- Modify: `frontend/src/offline/bootstrapSnapshot.ts`

- [ ] **Step 1: Write the failing tests**

Add tests for:

- matching but incomplete snapshot -> `limited`
- opening shift user mismatch -> `invalid`
- capability derivation disables pricing when pricing snapshot/context missing

```ts
it("returns limited mode when matching snapshot is incomplete", () => {
	expect(
		validateBootstrapSnapshot(
			buildBootstrapSnapshot({
				buildVersion: "build-2",
				profileName: "Main POS",
				profileModified: "2026-04-08 10:00:00",
				openingShiftName: "POS-OPEN-1",
				openingShiftUser: "test@example.com",
				prerequisites: {
					pos_profile: "ready",
					pos_opening_shift: "ready",
					payment_methods: "missing",
				},
			}),
			{
				buildVersion: "build-2",
				profileName: "Main POS",
				profileModified: "2026-04-08 10:00:00",
				sessionUser: "test@example.com",
			},
		).mode,
	).toBe("limited");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn.cmd --cwd frontend test --run tests/bootstrapSnapshot.spec.ts`
Expected: FAIL on new expectations.

- [ ] **Step 3: Implement minimal validation rules**

Implement:

- explicit prerequisite state map
- `mode` values: `normal`, `limited`, `confirmation_required`, `invalid`
- `reasons`, `missingPrerequisites`, `capabilities`

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn.cmd --cwd frontend test --run tests/bootstrapSnapshot.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/tests/bootstrapSnapshot.spec.ts frontend/src/offline/bootstrapSnapshot.ts
git commit -m "feat: add bootstrap snapshot validation modes"
```

### Task 3: Persist snapshot state in offline storage

**Files:**
- Modify: `frontend/src/offline/db.ts`
- Modify: `frontend/src/offline/cache.ts`
- Modify: `frontend/src/offline/index.ts`
- Modify: `frontend/tests/offlineKeyMapParity.spec.ts`

- [ ] **Step 1: Write the failing test**

Add parity expectations for:

- `bootstrap_snapshot`
- `bootstrap_snapshot_status`
- `bootstrap_limited_mode`

```ts
expect(KEY_TABLE_MAP.bootstrap_snapshot).toBe("settings");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn.cmd --cwd frontend test --run tests/offlineKeyMapParity.spec.ts`
Expected: FAIL because keys are missing from the map or memory defaults.

- [ ] **Step 3: Implement minimal persistence support**

Add to `db.ts`:

- memory defaults for snapshot values
- key mappings in `KEY_TABLE_MAP`

Add to `cache.ts`:

- `getBootstrapSnapshot()`
- `setBootstrapSnapshot(snapshot)`
- `getBootstrapLimitedMode()`
- `setBootstrapLimitedMode(state)`

Re-export via `offline/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn.cmd --cwd frontend test --run tests/offlineKeyMapParity.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/offline/db.ts frontend/src/offline/cache.ts frontend/src/offline/index.ts frontend/tests/offlineKeyMapParity.spec.ts
git commit -m "feat: persist offline bootstrap snapshot state"
```

## Chunk 2: Snapshot Writers And Startup Consumer

### Task 4: Refresh snapshot when profile and opening state changes

**Files:**
- Modify: `frontend/src/utils/pos_profile.ts`
- Modify: `frontend/src/posapp/composables/pos/shared/usePosShift.ts`
- Modify: `frontend/src/posapp/components/pos/shift/OpeningDialog.vue`
- Modify: `frontend/tests/openingCache.spec.ts`

- [ ] **Step 1: Write the failing test**

Add/adjust test coverage so opening/profile updates preserve current-user validation and write snapshot-compatible state.

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn.cmd --cwd frontend test --run tests/openingCache.spec.ts tests/bootstrapSnapshot.spec.ts`
Expected: FAIL because snapshot writer hooks do not exist yet.

- [ ] **Step 3: Implement minimal snapshot writer hooks**

Update flows so that:

- refreshed profile updates snapshot metadata
- opening shift registration updates snapshot metadata
- prerequisite states for `pos_profile` and `pos_opening_shift` become `ready`

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn.cmd --cwd frontend test --run tests/openingCache.spec.ts tests/bootstrapSnapshot.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/pos_profile.ts frontend/src/posapp/composables/pos/shared/usePosShift.ts frontend/src/posapp/components/pos/shift/OpeningDialog.vue frontend/tests/openingCache.spec.ts frontend/src/offline/bootstrapSnapshot.ts
git commit -m "feat: refresh bootstrap snapshot from profile and opening flows"
```

### Task 5: Add startup decision handling in the layout

**Files:**
- Modify: `frontend/src/posapp/layouts/DefaultLayout.vue`
- Modify: `frontend/tests/bootstrapSnapshot.spec.ts`

- [ ] **Step 1: Write the failing test**

Add bootstrap result tests covering:

- mismatch -> confirmation_required
- incomplete snapshot -> limited
- complete snapshot -> normal

If layout-level unit coverage is too expensive, keep logic in `bootstrapSnapshot.ts` and test the pure decision function.

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn.cmd --cwd frontend test --run tests/bootstrapSnapshot.spec.ts tests/chunkLoadRecovery.spec.ts tests/bundleVersionActivation.spec.ts tests/loaderPathNormalization.spec.ts`
Expected: FAIL on startup decision behavior until the layout consumes it.

- [ ] **Step 3: Implement minimal startup consumer**

In `DefaultLayout.vue`:

- validate snapshot after opening/profile hydration
- store `limited mode` state
- expose mismatch/missing prerequisite messages
- show confirmation gate for build/profile mismatch
- support `Continue Offline`

Avoid adding large inline logic; prefer small helper calls into `bootstrapSnapshot.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn.cmd --cwd frontend test --run tests/bootstrapSnapshot.spec.ts tests/chunkLoadRecovery.spec.ts tests/bundleVersionActivation.spec.ts tests/loaderPathNormalization.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/posapp/layouts/DefaultLayout.vue frontend/src/offline/bootstrapSnapshot.ts frontend/tests/bootstrapSnapshot.spec.ts
git commit -m "feat: gate offline startup with bootstrap validation"
```

### Task 6: Verify end-to-end targeted coverage

**Files:**
- No new code unless verification exposes a bug

- [ ] **Step 1: Run targeted bootstrap and startup tests**

Run:

```bash
yarn.cmd --cwd frontend test --run tests/bootstrapSnapshot.spec.ts tests/openingCache.spec.ts tests/offlineKeyMapParity.spec.ts tests/chunkLoadRecovery.spec.ts tests/bundleVersionActivation.spec.ts tests/loaderPathNormalization.spec.ts
```

Expected: PASS

- [ ] **Step 2: Run syntax/build verification**

Run:

```bash
yarn.cmd --cwd frontend build
node --check posawesome\posawesome\page\pos\pos.js
python -m unittest posawesome.posawesome.page.test_page_aliases
```

Expected: all pass

- [ ] **Step 3: Commit final implementation**

```bash
git add frontend posawesome
git commit -m "feat: add deterministic offline bootstrap snapshot"
```

## Notes For Execution

- Keep route architecture unchanged: canonical route stays `/app/posapp`.
- Do not introduce standalone `/pos` shell work in this phase.
- Prefer pure helper logic in `bootstrapSnapshot.ts` so startup decisions stay testable.
- Keep limited mode capability-driven; do not scatter new boolean checks across unrelated components.
- If startup UI work becomes too broad, stop after the core decision layer and surface the gap before guessing.
