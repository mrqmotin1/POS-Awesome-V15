# Feature Contracts

This file defines how major POS features are connected.

Codex must check this file before changing any related feature.

---

## 1. Pricing Contract

Pricing is linked with:

- Item master
- Item price
- Customer price list
- POS Profile price list
- Pricing Rule
- UOM conversion
- Manual rate change
- Discount percentage
- Discount amount
- Tax calculation
- Cart total
- Payment total
- Sales Invoice payload
- Print receipt
- Offline cache

Rules:

- Price must be resolved from one shared pricing flow.
- Manual rate should not be overwritten unless ERPNext behavior requires it.
- Customer price list should take priority over POS Profile price list when configured.
- UOM conversion must not inflate or deflate prices incorrectly.
- Multi-currency conversion must be handled consistently.
- Discount percentage and discount amount must not fight each other.
- Cart totals, payment totals, invoice payload, and printed totals must match.

---

## 2. Discount Contract

Discount is linked with:

- Item row
- Cart summary
- Invoice total
- Additional discount
- Payment screen
- Print receipt
- Backend invoice payload

Rules:

- Discount percentage and discount amount must remain synchronized.
- Changing one discount field must not reset item rate incorrectly.
- Zero rate should not be created unless explicitly allowed.
- Total discount must match printed and submitted invoice values.
- Discount logic should not be duplicated across screens.

---

## 3. Cart Contract

Cart is linked with:

- Item search
- Barcode scan
- UOM selection
- Batch/serial logic
- Stock validation
- Pricing
- Discounts
- Taxes
- Payments
- Offline storage
- Sales Invoice creation
- Printing

Rules:

- Cart state is the source for visible cart data.
- Derived totals must be calculated consistently.
- Avoid separate total calculation logic in multiple screens.
- Cart should survive offline/online transitions safely.
- Large carts must remain performant.

---

## 4. Offline Cache Contract

Offline cache is linked with:

- Items
- Prices
- Customers
- Stock
- POS Profile
- Cart
- Sales Invoice sync
- Printing
- App version updates

Rules:

- Cached data shape must match API data shape as much as possible.
- Missing or stale cache must not crash the app.
- New build/version changes must not leave old IndexedDB data in a broken state.
- Sync transformations must be backward compatible where possible.
- Offline mode must use the same business rules as online mode wherever possible.

---

## 5. Printing Contract

Printing is linked with:

- Cart data
- Invoice data
- Customer
- Taxes
- Discounts
- UOM
- Payment methods
- QZ Tray
- Browser print
- ERPNext print format

Rules:

- Printed totals must match submitted invoice totals.
- QZ Tray and browser print should use the same final invoice values.
- Receipt formatting changes must not change business calculations.
- Print output should not calculate totals differently from the invoice payload.

---

## 6. Customer Contract

Customer selection is linked with:

- Customer price list
- Credit limit/outstanding balance if implemented
- Cart pricing refresh
- Taxes
- Discounts
- Sales Invoice payload
- Payment screen
- Print receipt
- Offline customer cache

Rules:

- Customer change must refresh all dependent pricing/tax fields safely.
- Customer-specific price list must be respected.
- Offline customer data must not crash pricing logic if optional fields are missing.

---

## 7. UOM Contract

UOM is linked with:

- Item master
- Barcode
- Price list
- Conversion factor
- Stock quantity
- Rate
- Discount
- Cart total
- Sales Invoice payload
- Print receipt

Rules:

- UOM conversion must be applied consistently.
- Rate must not be inflated because of wrong conversion direction.
- Quantity, stock, and invoice payload must use compatible UOM data.
