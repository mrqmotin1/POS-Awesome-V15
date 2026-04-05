# Invoice-Centric Gift Card Redemption Design

## Goal

Move gift card redemption to an invoice-native settlement flow so that:

- gift card application is visible on the `Sales Invoice` / `POS Invoice`
- no separate `Journal Entry` or standalone redemption transaction document is created
- invoice cancellation restores the gift card balance directly from invoice data
- operators only need to inspect the invoice to understand redemption activity

## Current Problem

The current gift card implementation treats redemption as a separate backend flow:

- frontend sends `gift_card_redemptions`
- backend redeems cards after invoice submit
- gift card state and accounting are split between the invoice, gift card record, and extra documents

This creates two operational problems:

- invoice cancellation becomes dependent on extra linked documents
- redemption audit is not centered on the invoice, which makes support and recovery harder

## Proposed Model

### POS Gift Card

`POS Gift Card` remains the master record for:

- `gift_card_code`
- `company`
- `currency`
- `current_balance`
- `status`
- `expiry_date`
- supervisor issue / top-up operations

It should no longer be the primary redemption audit trail.

### Invoice Child Table

Add a dedicated child table to `Sales Invoice` and `POS Invoice` for gift card applications.

Suggested fields:

- `gift_card_code`
- `redeemed_amount`
- `balance_before`
- `balance_after`
- `status`

This child table becomes the user-facing and backend-facing source of truth for redemption activity on the invoice.

## Settlement Behavior

Gift card redemption is treated as `payment/settlement`, not discount.

That means:

- it reduces the remaining amount to be settled on the invoice
- it must not reduce item rates or tax logic like a coupon/offer
- it must not require a dedicated `Mode of Payment`

Backend behavior:

- frontend sends selected gift card rows with the invoice payload
- backend validates each card before submit
- backend records `balance_before` and `balance_after` on the invoice child rows
- backend reduces `POS Gift Card.current_balance`
- invoice submit uses the child rows as part of settlement coverage without creating a separate accounting document

## Cancellation Behavior

Invoice cancellation is derived only from invoice data.

On cancel:

- read the invoice gift card child rows
- restore each affected gift card balance
- mark invoice gift card rows as cancelled if a status field is present

No separate linked `Journal Entry` or gift-card redemption document should need cancellation.

## UI Behavior

POS payment UI can still use the same scan / redeem interaction, but the saved result must land in the invoice child table model.

Expected UX:

- cashier scans or enters a gift card
- system shows available balance
- cashier applies part or all of the amount
- applied rows are reflected as invoice-native gift card rows
- after submit, the invoice shows those rows in the same spirit as offers/coupons visibility

## Data Flow

1. Frontend captures applied gift card rows.
2. Invoice payload includes those rows as invoice settlement metadata.
3. Backend validates and normalizes the rows.
4. Backend updates card balances and persists invoice child rows.
5. Invoice cancel restores card balances from the same rows.

## Migration / Refactor Scope

Implementation should:

- remove redemption reliance on `POS Gift Card.transactions`
- remove redemption reliance on separate `Journal Entry` creation
- keep issue / top-up support on `POS Gift Card`
- preserve existing scan / balance-check UX where possible

## Testing

Required regression coverage:

- redeeming a gift card stores invoice child rows
- redeeming does not require a dedicated gift-card payment mode
- invoice cancel restores gift card balances
- cancelled invoice does not require separate document cleanup
- partial redemption and split settlement still work
