# Reference Date Picker Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the pay sidebar reference date field open a calendar on click while still accepting manual entry, and keep reference fields empty by default so backend fallbacks are used when the user leaves them blank.

**Architecture:** Reuse the existing `@vuepic/vue-datepicker` stack already present in the pay screen instead of the browser-native date input. Keep the sidebar field bound to the existing `referenceDate` model, normalize user-entered display dates to backend format before emission, and preserve empty `referenceNo` and `referenceDate` values in the submit payload so server-side defaults remain authoritative.

**Tech Stack:** Vue 3, Vuetify, `@vuepic/vue-datepicker`, Vitest, Vue Test Utils

---

## Chunk 1: Sidebar Date Input

### Task 1: Add the failing sidebar test

**Files:**
- Modify: `frontend/tests/payTotalsSidebar.spec.ts`
- Test: `frontend/tests/payTotalsSidebar.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("emits a normalized reference date when the user types one", async () => {
  // mount with a VueDatePicker stub that emits a typed date string
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn.cmd test --run frontend/tests/payTotalsSidebar.spec.ts`
Expected: FAIL because the sidebar still uses a plain text field and does not normalize emitted dates.

- [ ] **Step 3: Write minimal implementation**

```ts
import VueDatePicker from "@vuepic/vue-datepicker";
import { normalizeDateForBackend } from "../../format";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn.cmd test --run frontend/tests/payTotalsSidebar.spec.ts`
Expected: PASS

### Task 2: Keep styling consistent with the existing pay view

**Files:**
- Modify: `frontend/src/posapp/components/pos_pay/PayTotalsSidebar.vue`

- [ ] **Step 1: Add the smallest styling needed for the embedded date picker**
- [ ] **Step 2: Re-run the sidebar test**

Run: `yarn.cmd test --run frontend/tests/payTotalsSidebar.spec.ts`
Expected: PASS

## Chunk 2: Submission Fallback Behavior

### Task 3: Add the failing payload test

**Files:**
- Modify: `frontend/tests/usePosPaySubmission.spec.ts`
- Test: `frontend/tests/usePosPaySubmission.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("sends null reference fields when the user leaves them blank", async () => {
  // assert payload.reference_no and payload.reference_date are null
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn.cmd test --run frontend/tests/usePosPaySubmission.spec.ts`
Expected: FAIL if the composable is not passed reference refs in the test setup or if trimming behavior regresses.

- [ ] **Step 3: Write minimal implementation**

```ts
reference_no: referenceNo?.value?.trim() || null,
reference_date: referenceDate?.value?.trim() || null,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn.cmd test --run frontend/tests/usePosPaySubmission.spec.ts`
Expected: PASS

## Chunk 3: Final Verification

### Task 4: Run targeted verification

**Files:**
- Test: `frontend/tests/payTotalsSidebar.spec.ts`
- Test: `frontend/tests/usePosPaySubmission.spec.ts`

- [ ] **Step 1: Run the sidebar test**

Run: `yarn.cmd test --run frontend/tests/payTotalsSidebar.spec.ts`
Expected: PASS

- [ ] **Step 2: Run the submission test**

Run: `yarn.cmd test --run frontend/tests/usePosPaySubmission.spec.ts`
Expected: PASS

- [ ] **Step 3: Review the diff**

Run: `git diff -- frontend/src/posapp/components/pos_pay/PayTotalsSidebar.vue frontend/tests/payTotalsSidebar.spec.ts frontend/tests/usePosPaySubmission.spec.ts docs/superpowers/plans/2026-04-03-reference-date-picker.md`
Expected: only the planned sidebar, tests, and plan changes appear
