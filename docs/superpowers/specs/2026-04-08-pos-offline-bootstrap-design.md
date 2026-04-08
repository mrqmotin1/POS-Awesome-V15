# POS Offline Bootstrap Snapshot Design

## Context

POS Awesome already has multiple offline-capable pieces:

- cached opening shift and POS profile
- IndexedDB-backed items/customers storage
- pricing, coupons, offers, tax, print, and terms caches
- service-worker-based app shell caching

The missing layer is deterministic startup orchestration. At boot time the app can hydrate some cached data, but it cannot answer these questions consistently:

- Is offline startup safe for this build?
- Does the cached snapshot belong to the active POS profile?
- Which prerequisites are ready, missing, or mismatched?
- Should the app start normally, warn in limited mode, or require explicit user confirmation?

This gap is the reason offline startup behavior can feel unpredictable even when individual caches exist.

## Goals

- Add a deterministic bootstrap snapshot for offline POS startup.
- Cover all POS prerequisites required for practical offline operation, not only opening/profile data.
- Preserve the current stable `/app/posapp` startup path.
- Allow the app to open with warnings in limited mode when prerequisites are incomplete.
- Require explicit `Continue Offline` confirmation when snapshot `build version` or `POS profile` mismatches are detected.
- Reuse existing cache/storage layers instead of introducing a parallel offline architecture.

## Non-Goals

- Replace the existing Dexie cache model.
- Move POS Awesome to a standalone `/pos` shell.
- Redesign queue/sync internals in this phase.
- Implement full server-side idempotency or conflict-resolution flows in this phase.

## Recommended Approach

Use a bootstrap snapshot manifest layered on top of the existing offline caches.

Why this approach:

- lowest-risk fit for the current codebase
- keeps existing caches and flows intact
- makes startup decisions explicit and inspectable
- gives a clean base for later offline hardening phases

## Data Model

Create a central bootstrap module, expected location:

- `frontend/src/offline/bootstrapSnapshot.ts`

Persist snapshot state using the existing offline memory + Dexie persistence model.

### Snapshot Shape

The snapshot should store:

- `build_version`
- `profile_name`
- `profile_modified`
- `opening_shift_name`
- `opening_shift_user`
- `captured_at`
- `prerequisites`
- `capabilities`
- `status`

### Prerequisites

Each prerequisite should be stored with an explicit state such as:

- `ready`
- `missing`
- `stale`
- `error`

Initial required prerequisites:

- `pos_profile`
- `pos_opening_shift`
- `payment_methods`
- `sales_persons`
- `items_cache_ready`
- `customers_cache_ready`
- `item_groups`
- `pricing_rules_snapshot`
- `pricing_rules_context`
- `tax_inclusive`
- `print_template`
- `terms_and_conditions`
- `offers_cache`
- `coupons_cache`

### Capabilities

Capabilities should be derived from the prerequisite states rather than inferred ad hoc in UI code.

Initial capability set:

- `can_sell_offline`
- `can_apply_pricing_offline`
- `can_print_offline`
- `can_use_offers_offline`
- `can_use_customer_display_offline`

## Storage Integration

Do not add a separate persistence mechanism.

Integrate with:

- `frontend/src/offline/db.ts`
- `frontend/src/offline/cache.ts`
- `frontend/src/utils/pos_profile.ts`
- opening-shift registration flows

Expected additions:

- memory defaults for bootstrap snapshot fields
- persist/get helpers in `cache.ts`
- snapshot refresh hooks when profile/opening/prerequisite caches change

## Startup Behavior

At app startup:

1. Hydrate the current cached opening/profile data as today.
2. Load the bootstrap snapshot.
3. Validate the snapshot against the current build/profile/session.
4. Choose one of three startup modes.

### Mode 1: Normal Mode

Enter normal mode when:

- snapshot is complete enough for required capabilities
- no build-version mismatch exists
- no POS-profile mismatch exists
- opening shift user matches the current session user

### Mode 2: Limited Mode With Warning

Enter limited mode automatically when:

- snapshot matches the current build/profile
- but one or more prerequisites are incomplete

Behavior:

- app opens
- user sees a warning
- affected features are disabled or degraded by capability
- sales may continue if `can_sell_offline` remains true

### Mode 3: Confirmation Gate

Require explicit confirmation when:

- `build_version` mismatches current build version
- or `profile_name/profile_modified` mismatches current active profile

Behavior:

- show blocking confirmation dialog
- actions:
  - `Continue Offline`
  - `Retry / Go Online`

If the user selects `Continue Offline`:

- open using last-known cached data
- mark app as running in limited mode
- show the exact mismatch reason

If the user selects `Retry / Go Online`:

- rerun validation and normal startup checks

## Validation Rules

### Version Mismatch

Mismatch when:

- snapshot `build_version` does not equal current build version

### Profile Mismatch

Mismatch when:

- snapshot `profile_name` differs from current active profile name
- or snapshot `profile_modified` differs from current profile modified value

### Opening Shift User Mismatch

Invalidate cached startup when:

- cached opening shift user does not equal the current session user

### Prerequisite Completeness

Every required prerequisite must publish an explicit state.

Do not treat missing cache objects as implicit truthy/falsy startup signals.

### Capability Derivation

Feature availability must be derived centrally from snapshot prerequisite states.

Examples:

- missing print template or terms may degrade `can_print_offline`
- missing pricing snapshot/context may disable `can_apply_pricing_offline`
- missing payment methods may block practical offline selling

## UI Responsibilities

`DefaultLayout.vue` should become the startup decision consumer, not the owner of bootstrap logic.

The snapshot module should produce a normalized validation result such as:

- startup mode
- mismatch reason list
- missing prerequisite list
- derived capabilities

UI responsibilities:

- show warning banner in limited mode
- show blocking `Continue Offline` confirmation for version/profile mismatch
- expose capability-driven disabled states

## Implementation Slices

### Slice 1: Snapshot Core

- add bootstrap snapshot persistence and retrieval helpers
- define prerequisite and capability types
- define validation result shape

### Slice 2: Snapshot Writers

- update POS profile refresh flow to write snapshot metadata
- update opening shift flows to write snapshot metadata
- update prerequisite caches to mark readiness centrally

### Slice 3: Startup Consumer

- integrate validation into app startup
- add limited-mode and confirmation-gate UI state

### Slice 4: Capability Wiring

- wire capability checks into affected startup-critical features

## Testing Plan

Add focused regression tests for:

- snapshot builds complete status from cached prerequisites
- version mismatch returns confirmation-required result
- profile mismatch returns confirmation-required result
- matching but incomplete snapshot returns limited-mode result
- opening-shift user mismatch invalidates cached startup
- capability derivation only disables affected offline features

Existing startup hardening tests must remain green:

- chunk load recovery
- bundle version activation
- loader path normalization

## Risks

- prerequisite coverage may initially miss one or two runtime-critical caches
- capability derivation that is too permissive can create false confidence
- capability derivation that is too strict can over-block usable offline flows

Mitigation:

- centralize prerequisite declarations
- start with startup-critical features only
- add explicit tests for each prerequisite-to-capability rule

## Decision Summary

Approved design:

- keep canonical POS route on `/app/posapp`
- keep current stable startup/cache hardening from `58e270ec`
- add `/app/pos` only as a Desk alias redirect
- implement deterministic offline bootstrap using a central snapshot manifest
- include all practical POS prerequisites in the snapshot
- open with warning in limited mode when prerequisites are incomplete
- require explicit `Continue Offline` confirmation on build/profile mismatch
