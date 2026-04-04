# Progress Log

## 2026-04-04
- Reviewed local POS Awesome capabilities and major frontend surfaces.
- Compared feature positioning against Odoo POS, ERPNext POS docs, Open Source POS, and uniCenta.
- Wrote a prioritized modernization roadmap focused on highest-value missing capabilities and cashier UX improvements.
- Wrote a repo-specific phased implementation plan at `docs/superpowers/plans/2026-04-04-modern-pos-roadmap.md`.
- Added a duplicate-avoidance audit so future implementation extends existing drafts, customer-credit/cashback, and shortcut hooks before creating parallel systems.
- Started Phase 1 implementation by reusing the existing drafts flow as a parked-orders cache and adding a visible parked-orders rail in the invoice summary.
- Added payment quick-action UI in the payments screen using existing `set_full_amount` and `set_rest_amount` flows instead of creating duplicate payment logic.
- Added targeted frontend tests for parked-order state/rendering and payment quick-action rendering, then verified them along with `vue-tsc`.
- Started Phase 2 with a shared-terminal cashier switching slice: added a dedicated employee store, navbar switch/lock entry points, and a persistent employee switch dialog.
- Converted invoice shortcut placeholders into real `F4` switch-cashier and `F8` lock-screen events, wired through the shared event bus and navbar shell.
- Added a backend employee-list endpoint based on existing `POS Profile User` membership and verified it with a standalone Python test plus targeted frontend specs.
- Extended Phase 2 with PIN-gated cashier switching/unlocking: the dialog now verifies the selected cashier against `POS Profile User` membership and a new POS PIN field on `User` before applying the switch.
- Added repo fixtures for `User-posa_pos_pin` and `User-posa_is_pos_supervisor`, updated hooks so they ship with the app, and verified the flow with new frontend and backend tests plus `vue-tsc`.
