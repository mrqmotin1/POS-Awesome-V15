# POS Offline Prerequisite Caches Design

**Date:** 2026-04-09

**Goal:** Expand POS Awesome's offline prerequisite coverage so delivery charges, multi-currency support data, customer addresses, and payment-method currency mapping survive offline use and are reflected in cache reporting.

## Scope

This chunk covers:

- Real local cache usage estimation for `IndexedDB` and `localStorage`
- Durable offline caches for:
  - delivery charge options
  - available currencies
  - exchange-rate pairs
  - selling price-list metadata
  - customer addresses
  - payment-method currency mappings
- Bootstrap prerequisite expansion and warning surfacing for the new caches

This chunk does **not** cover:

- bundle component offline durability
- variant detail/rate offline durability
- last-invoice-rate offline durability
- online-only payment reconciliation / payment-request flows

## Design

### Storage model

All new data will stay inside the existing `posawesome_offline` Dexie database and the shared in-memory cache layer. No new database is introduced.

New cache keys:

- `delivery_charges_cache`
- `currency_options_cache`
- `exchange_rate_cache`
- `price_list_meta_cache`
- `customer_addresses_cache`
- `payment_method_currency_cache`

Each cache entry will carry the smallest practical payload plus freshness metadata (`timestamp` and relevant scope such as profile/company/customer/currency pair).

### Runtime behavior

Online-first fetch flows will continue using the server as source of truth, but every successful response will also update durable offline cache. Offline mode will read from cache first and only degrade the affected feature if the relevant cache is missing.

Expected degraded behavior:

- Missing delivery-charge cache: invoice still opens, delivery-charge selector is unavailable
- Missing currency/exchange-rate cache: invoice continues in cached/default currency, unsupported currency switch is blocked
- Missing customer-address cache: customer sale continues, address selection is limited
- Missing payment-method currency cache: basic payment flow continues, multi-currency filtering is limited

### Bootstrap integration

Bootstrap snapshot prerequisites will be extended with dedicated codes for the new datasets so warning text remains explicit instead of generic. The app should continue opening with warning-based limited mode rather than hard-blocking startup.

### Cache usage reporting

`getCacheUsageEstimate()` will move from a zero stub to an approximate real calculation:

- sum serialized `localStorage` payload size
- sum serialized IndexedDB table sizes by walking the app DB
- return total bytes and a percentage estimate

Exact browser quota reporting is not required for this chunk; a consistent approximation is sufficient.

## Risks and constraints

- IndexedDB byte estimation will be approximate because browser quota APIs are inconsistent
- New caches must respect profile/company/customer scoping to avoid cross-profile stale data
- This chunk should not widen scope into advanced item intelligence caches
