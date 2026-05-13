# Architecture Notes

This project is based on ERPNext / Frappe / POS Awesome.

The POS system contains linked frontend and backend flows. Frontend UI changes often affect invoice payloads, pricing, discounts, stock, offline cache, sync, and printing.

## Main Principles

1. Business logic should be centralized.
2. UI components should not contain duplicated business calculations.
3. Backend payloads must match ERPNext expectations.
4. Offline data must stay compatible with online API data.
5. Printing must reflect the final submitted invoice.
6. Performance matters because POS may handle many items and large carts.
7. Responsive layout must work on desktop, tablet, and POS screens.
8. Existing ERPNext/POS Awesome behavior should be preserved unless explicitly changed.

## Important Linked Areas

- POS item search
- Cart
- Pricing
- Discounts
- UOM
- Stock
- Customer
- Payments
- Offline cache
- Sync
- Printing
- Reports

## Preferred Architecture

Prefer:

- Shared services
- Shared composables
- Central stores
- Utility helpers
- Typed data contracts where available
- Clear separation between UI and business logic

Avoid:

- Duplicating pricing logic in multiple components
- Duplicating discount logic in item row, cart summary, and payment screen
- Directly changing invoice totals in UI without syncing payload logic
- Creating fixes that only work online but break offline mode
- Creating fixes that only work in browser print but break QZ Tray print
