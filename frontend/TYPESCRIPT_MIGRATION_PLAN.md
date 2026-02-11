# TypeScript Migration Plan (Frontend)

## Current State

- `tsconfig.json` currently has `allowJs: true` and `checkJs: false`.
- Type checking passes, but several modules still bypass checks using `// @ts-nocheck`.
- Some core POS modules are in TS but still loosely typed (`any` heavy).
- Multiple runtime paths are still implemented in `.js` (offline, workers, composables).

## Migration Strategy

Use phased migration to keep POS stable while reducing type-risk in high-impact flows first.

## Batch 1 (High Impact: Items + Scan + Invoice add flow)

### Scope

- `src/posapp/components/pos/ItemsSelector.vue`
- `src/posapp/composables/useScanProcessor.ts`
- `src/posapp/composables/useBarcodeIndexing.ts`
- `src/posapp/composables/useItemsIntegration.ts`
- `src/posapp/composables/useItemAddition.ts`
- `src/posapp/composables/useItemAvailability.ts`
- `src/posapp/composables/useItemDetailFetcher.ts`
- `src/posapp/composables/useItemsLoader.ts`
- `src/posapp/composables/useItemSelection.ts`
- `src/posapp/composables/useItemSync.ts`

### Targets

1. Remove `@ts-nocheck` from Batch 1 files.
2. Replace top-level `any` with shared interfaces for:
   - `Item`
   - `PosProfile`
   - `BarcodeEntry`
   - `ScanError`
   - `ItemDetailContext`
3. Type `registerContext()` contracts in helper composables.
4. Keep behavior identical (no UX/logic changes).

### Acceptance Criteria

- `yarn type-check` passes.
- `yarn eslint . --ext .js,.ts,.vue` passes.
- `yarn build` passes.
- No `@ts-nocheck` in Batch 1 files.

## Batch 2 (POS payment + shift + offers composables)

### Scope (convert JS to TS)

- `src/posapp/composables/usePosPayData.js`
- `src/posapp/composables/usePosPaySelection.js`
- `src/posapp/composables/usePosPaySubmission.js`
- `src/posapp/composables/useOffers.js`
- `src/posapp/composables/usePosShift.js`
- `src/posapp/composables/useClosingShift.js`
- `src/posapp/composables/useClosingSummary.js`
- `src/posapp/composables/useCartValidation.js`
- `src/posapp/composables/useBundles.js`

### Acceptance Criteria

- Files renamed to `.ts` with types for public APIs.
- No regressions in payment and shift flows.
- Type-check/lint/build all green.

## Batch 3 (Offline and worker layer)

### Scope

- `src/offline/*.js`
- `src/posapp/workers/*.js`
- `src/posapp/plugins/print.js`
- `src/posapp/router/index.js`

### Acceptance Criteria

- Core offline data contracts typed.
- Worker message payloads typed.
- Build and runtime behavior unchanged.

## Final Hardening

1. Set `checkJs: true` temporarily to catch remaining JS risks.
2. Complete final JS-to-TS conversions.
3. Set `allowJs: false`.
4. Tighten strictness (`noImplicitAny`, `exactOptionalPropertyTypes`, etc.) incrementally.

## Execution Notes

- Keep commits small and scoped to one batch slice.
- Run `type-check`, `eslint`, and `build` after each slice.
- Prefer introducing shared `types/` models early to reduce duplicate interfaces.
