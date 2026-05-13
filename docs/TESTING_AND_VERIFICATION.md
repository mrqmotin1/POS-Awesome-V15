# Testing and Verification

Codex must verify changes according to the affected area.

---

## Pricing / Discount Changes

Check:

- Normal item price
- Manual rate change
- Discount percentage
- Discount amount
- Pricing Rule
- Customer price list
- POS Profile price list
- UOM conversion
- Multi-currency if applicable
- Invoice total
- Print total
- Backend Sales Invoice payload

---

## Cart Changes

Check:

- Add item
- Remove item
- Update quantity
- Change UOM
- Change rate
- Apply discount
- Large cart performance
- Payment screen total
- Sales Invoice payload
- Offline cart behavior

---

## Offline Changes

Check:

- Fresh cache
- Existing old cache
- Missing cache fields
- Sync after reconnect
- New build update behavior
- App reload behavior
- IndexedDB compatibility

---

## Printing Changes

Check:

- Browser print
- QZ Tray print
- Item rates
- Discounts
- Taxes
- Payment method
- Grand total
- UOM display
- Customer display

---

## Customer Changes

Check:

- Default customer
- Newly added customer
- Customer-specific price list
- POS Profile fallback price list
- Offline customer data
- Invoice payload customer field
- Printed customer details

---

## UOM Changes

Check:

- Default UOM
- Alternate UOM
- Barcode UOM
- Conversion factor
- Stock quantity
- Item rate
- Discount
- Invoice payload
- Print receipt

---

## Required Final Verification Format

After changes, report:

```md
## Summary
...

## Files Changed
- `path/to/file`: reason

## Linked Features Checked
- ...

## Commands Run
- ...

## Risks / Notes
- ...
```
