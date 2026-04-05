# Phase 2 Gift Card And Offline Balance Design

**Goal:** Close the remaining Phase 2 gaps by adding reloadable code-based gift cards for POS and by making customer-balance redemption safe for offline queueing and replay.

**Why this is still Phase 2 work:**
- employee switching, PIN flows, supervisor gating, and customer-balance redemption already exist
- the roadmap still has two missing code-level slices:
  - reloadable `gift card` support
  - offline-safe `stored value` / customer-balance caching and replay metadata
- manual release-gate walkthroughs remain operational work after implementation

**Current state:**
- customer balance redemption already extends the existing customer-credit engine instead of introducing a parallel wallet ledger
- payment UI already exposes `Use Customer Balance`
- offline storage does not yet preserve rich redeemable-balance snapshots or replay metadata for queued invoices
- there is no gift-card DocType, POS UI, or API flow yet

**Design:**
- Keep `customer balance` and `gift card` as separate concepts:
  - `customer balance` stays tied to the existing customer-credit/cashback path
  - `gift card` is a code-based prepaid instrument with its own balance and transaction history
- Close Phase 2 with a minimal but audit-friendly gift-card domain:
  - parent DocType: `POS Gift Card`
  - child table: `POS Gift Card Transaction`
- Keep gift-card operations online-only in this phase:
  - balance lookup may use cached last-known data for display
  - issue, top-up, and redeem require connectivity
- Allow offline customer-balance redemption using cached snapshots plus replay-safe metadata on queued invoices

**Domain model:**
- `POS Gift Card`
  - `gift_card_code`
  - `company`
  - `currency`
  - `current_balance`
  - `status` such as `Active`, `Inactive`, `Expired`
  - optional `expiry_date`
  - `issued_by`
  - `last_redeemed_on`
- `POS Gift Card Transaction`
  - `transaction_type` such as `Issue`, `Top Up`, `Redeem`, `Adjust`
  - `amount`
  - `balance_after`
  - `reference_doctype`
  - `reference_name`
  - `cashier`
  - `posting_datetime`

**Permissions and roles:**
- cashier
  - can check gift-card balance
  - can redeem gift cards during payment
  - cannot issue, top up, or deactivate cards
- POS supervisor
  - can do everything a cashier can
  - can issue cards
  - can top up cards
  - can deactivate or reactivate cards if exposed in the first slice
- Desk/backoffice uses the same gift-card DocType and APIs as POS-facing flows

**POS UX:**
- Payment methods keep `Use Customer Balance` for customer-credit redemption
- Add a separate `Gift Card` payment path in the payment flow
- Gift-card input is scan-friendly:
  - manual code entry works
  - barcode scan into the same field works
  - QR scan into the same field works if the scanner outputs the card code
- Cashier flow:
  - enter or scan code
  - check current balance
  - enter or accept capped redeem amount
  - continue with split payment if invoice still has remaining amount
- Supervisor flow:
  - issue new gift card from POS
  - top up existing gift card from POS
  - optionally change active state

**Validation rules:**
- gift-card redemption is capped by both:
  - card balance
  - invoice remaining payable amount
- partial redemption is allowed
- full redemption is allowed
- insufficient balance blocks submit
- inactive or expired cards cannot be redeemed
- customer-balance redemption remains capped by the current invoice amount after loyalty and other adjustments

**Offline and replay rules:**
- customer balance
  - enrich offline customer storage with redeemable-balance snapshot fields
  - cache last-known redeemable-balance details for offline use
  - store compact redemption metadata on queued offline invoices
  - replay revalidates against the backend before final submit
  - mismatch must not silently over-redeem; safe failure or existing draft fallback remains acceptable
- gift card
  - issue is blocked offline
  - top up is blocked offline
  - redeem is blocked offline
  - last-known lookup snapshot may be shown for operator guidance only

**Backend/API shape:**
- extend `stored_value.py` only where it helps customer-balance snapshots
- add dedicated gift-card APIs for:
  - issue
  - top up
  - lookup/check balance
  - redeem during payment submit
- keep accounting behavior aligned with existing invoice/payment flows instead of inventing a parallel settlement path

**Hook and migration considerations:**
- review `hooks.py` for new DocType registration, fixtures, and any import wiring already used by POS setup
- review any `after_migrate` path that currently arranges POS-profile fields or fixtures so the new gift-card setup lands cleanly
- avoid duplicating setup behavior if current migrate hooks already centralize field ordering or fixture repair

**Testing:**
- frontend
  - gift-card payment method visibility and role gating
  - gift-card validation for partial, full, and insufficient-balance cases
  - offline customer-balance snapshot and replay metadata behavior
  - offline key-map parity for any new persisted keys
- backend
  - gift-card issue, top up, lookup, redeem, and invalid-state rejection
  - customer-balance replay validation helpers where new logic is introduced
- operational release gate after code is done
  - shift handoff between two cashiers on one terminal
  - gift-card partial redemption, full redemption, and insufficient-balance rejection
  - customer-balance behavior offline and after replay
