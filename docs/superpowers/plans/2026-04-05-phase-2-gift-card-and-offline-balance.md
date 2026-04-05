# Phase 2 Gift Card And Offline Balance Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining Phase 2 scope by adding reloadable code-based gift cards and offline-safe customer-balance redemption snapshots and replay metadata.

**Architecture:** Keep `customer balance` on the existing customer-credit engine and add a separate `POS Gift Card` domain with transaction history. Extend the existing Vue 3 payment flow and Dexie offline cache incrementally so customer-balance redemption remains replay-safe while gift-card operations stay online-only.

**Tech Stack:** Vue 3, Pinia, Vuetify, TypeScript, Dexie offline cache, Frappe DocTypes, Python whitelisted APIs, Vitest, Python unittest.

---

## Chunk 1: Backend Gift Card Domain

### Task 1: Add the gift-card DocTypes and migrate setup

**Files:**
- Create: `posawesome/posawesome/doctype/pos_gift_card/pos_gift_card.json`
- Create: `posawesome/posawesome/doctype/pos_gift_card/pos_gift_card.py`
- Create: `posawesome/posawesome/doctype/pos_gift_card/pos_gift_card.js`
- Create: `posawesome/posawesome/doctype/pos_gift_card/__init__.py`
- Create: `posawesome/posawesome/doctype/pos_gift_card_transaction/pos_gift_card_transaction.json`
- Create: `posawesome/posawesome/doctype/pos_gift_card_transaction/pos_gift_card_transaction.py`
- Create: `posawesome/posawesome/doctype/pos_gift_card_transaction/__init__.py`
- Create: `posawesome/patches/add_gift_card_pos_profile_settings.py`
- Modify: `posawesome/hooks.py`
- Modify: `posawesome/fixtures/custom_field.json`
- Test: `posawesome/posawesome/api/test_gift_cards.py`

- [ ] **Step 1: Write the failing backend tests for gift-card setup and role rules**

```python
def test_issue_gift_card_requires_supervisor():
    ...

def test_top_up_updates_balance_and_transaction_history():
    ...
```

- [ ] **Step 2: Run the new test file to verify it fails**

Run: `python -m unittest posawesome.posawesome.api.test_gift_cards`
Expected: FAIL because gift-card APIs and DocTypes do not exist yet.

- [ ] **Step 3: Add `POS Gift Card` and `POS Gift Card Transaction` DocTypes**

```python
class POSGiftCard(Document):
    def validate(self):
        self.current_balance = flt(self.current_balance or 0)
```

- [ ] **Step 4: Add POS Profile custom fields and migrate wiring**

```python
after_migrate = [
    ...,
    "posawesome.patches.add_gift_card_pos_profile_settings.execute",
]
```

- [ ] **Step 5: Run the backend test file and make it pass**

Run: `python -m unittest posawesome.posawesome.api.test_gift_cards`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add posawesome/posawesome/doctype/pos_gift_card posawesome/posawesome/doctype/pos_gift_card_transaction posawesome/patches/add_gift_card_pos_profile_settings.py posawesome/hooks.py posawesome/fixtures/custom_field.json posawesome/posawesome/api/test_gift_cards.py
git commit -m "feat: add gift card domain and POS profile settings"
```

### Task 2: Add gift-card APIs and invoice-payment integration

**Files:**
- Create: `posawesome/posawesome/api/gift_cards.py`
- Modify: `posawesome/posawesome/api/invoice_processing/payment.py`
- Modify: `posawesome/posawesome/api/stored_value.py`
- Modify: `posawesome/posawesome/api/test_stored_value.py`
- Modify: `posawesome/posawesome/api/invoice_processing/test_payment.py`
- Modify: `posawesome/posawesome/api/test_gift_cards.py`

- [ ] **Step 1: Write failing tests for issue, top up, lookup, redeem, and invalid-state rejection**

```python
def test_redeem_gift_card_blocks_inactive_card():
    ...

def test_redeem_gift_card_records_transaction_against_invoice():
    ...
```

- [ ] **Step 2: Run targeted backend tests to verify they fail**

Run: `python -m unittest posawesome.posawesome.api.test_gift_cards posawesome.posawesome.api.invoice_processing.test_payment`
Expected: FAIL because redeem and lookup logic is missing.

- [ ] **Step 3: Implement whitelisted gift-card APIs**

```python
@frappe.whitelist()
def check_gift_card_balance(code, company):
    ...
```

- [ ] **Step 4: Extend invoice payment processing to consume gift-card redemptions**

```python
def apply_gift_card_redemptions(invoice_doc, data):
    ...
```

- [ ] **Step 5: Re-run backend tests and make them pass**

Run: `python -m unittest posawesome.posawesome.api.test_gift_cards posawesome.posawesome.api.invoice_processing.test_payment posawesome.posawesome.api.test_stored_value`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add posawesome/posawesome/api/gift_cards.py posawesome/posawesome/api/invoice_processing/payment.py posawesome/posawesome/api/stored_value.py posawesome/posawesome/api/test_gift_cards.py posawesome/posawesome/api/invoice_processing/test_payment.py posawesome/posawesome/api/test_stored_value.py
git commit -m "feat: add gift card APIs and payment redemption flow"
```

## Chunk 2: POS Gift Card UX

### Task 3: Add supervisor issue/top-up flows and cashier redeem/check flow

**Files:**
- Create: `frontend/src/posapp/components/pos/wallet/GiftCardPanel.vue`
- Create: `frontend/src/posapp/components/pos/wallet/GiftCardDialog.vue`
- Modify: `frontend/src/posapp/components/pos/payments/PaymentMethods.vue`
- Modify: `frontend/src/posapp/components/pos/payments/PaymentOptions.vue`
- Modify: `frontend/src/posapp/composables/pos/payments/usePaymentSubmission.ts`
- Modify: `frontend/src/posapp/composables/pos/payments/usePosPayData.ts`
- Modify: `frontend/src/posapp/stores/employeeStore.ts`
- Test: `frontend/tests/giftCardPayment.spec.ts`
- Test: `frontend/tests/paymentOptions.spec.ts`
- Test: `frontend/tests/usePaymentMethods.spec.ts`

- [ ] **Step 1: Write failing frontend tests for role-gated gift-card actions and payment validation**

```ts
it("shows issue and top-up actions only for supervisors", () => {});
it("caps gift-card redemption by balance and remaining invoice amount", () => {});
```

- [ ] **Step 2: Run the focused frontend tests to verify they fail**

Run: `cd frontend; cmd /c yarn vitest run tests/giftCardPayment.spec.ts tests/paymentOptions.spec.ts tests/usePaymentMethods.spec.ts`
Expected: FAIL because the Gift Card UI and state do not exist yet.

- [ ] **Step 3: Add the Gift Card payment panel and supervisor dialog**

```ts
const giftCardState = reactive({
    code: "",
    balance: 0,
    redeemAmount: 0,
});
```

- [ ] **Step 4: Wire the payment submission payload to backend gift-card APIs**

```ts
payload.gift_card_redemptions = [...]
```

- [ ] **Step 5: Re-run focused frontend tests and make them pass**

Run: `cd frontend; cmd /c yarn vitest run tests/giftCardPayment.spec.ts tests/paymentOptions.spec.ts tests/usePaymentMethods.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/posapp/components/pos/wallet/GiftCardPanel.vue frontend/src/posapp/components/pos/wallet/GiftCardDialog.vue frontend/src/posapp/components/pos/payments/PaymentMethods.vue frontend/src/posapp/components/pos/payments/PaymentOptions.vue frontend/src/posapp/composables/pos/payments/usePaymentSubmission.ts frontend/src/posapp/composables/pos/payments/usePosPayData.ts frontend/src/posapp/stores/employeeStore.ts frontend/tests/giftCardPayment.spec.ts frontend/tests/paymentOptions.spec.ts frontend/tests/usePaymentMethods.spec.ts
git commit -m "feat: add POS gift card payment and supervisor tools"
```

## Chunk 3: Offline Customer-Balance Safety

### Task 4: Cache customer-balance snapshots and queue replay metadata

**Files:**
- Modify: `frontend/src/offline/db.ts`
- Modify: `frontend/src/offline/customers.ts`
- Modify: `frontend/src/offline/invoices.ts`
- Modify: `frontend/src/posapp/workers/itemWorker.js`
- Modify: `frontend/src/posapp/composables/pos/payments/useRedemptionLogic.ts`
- Modify: `frontend/src/posapp/composables/pos/payments/usePaymentSubmission.ts`
- Modify: `frontend/src/posapp/components/pos/invoice_utils/customer.ts`
- Test: `frontend/tests/storedValue.spec.ts`
- Test: `frontend/tests/offlineKeyMapParity.spec.ts`
- Test: `frontend/tests/usePosPaySubmission.spec.ts`

- [ ] **Step 1: Write failing tests for offline snapshot caching and queued redemption metadata**

```ts
it("stores redeemable balance snapshots with offline customers", () => {});
it("adds replay-safe customer-balance metadata to offline invoices", () => {});
```

- [ ] **Step 2: Run targeted frontend tests to verify they fail**

Run: `cd frontend; cmd /c yarn vitest run tests/storedValue.spec.ts tests/offlineKeyMapParity.spec.ts tests/usePosPaySubmission.spec.ts`
Expected: FAIL because offline snapshot keys and metadata are not stored yet.

- [ ] **Step 3: Extend the offline schema and worker key map**

```ts
export const KEY_TABLE_MAP = {
    ...,
    stored_value_snapshot_cache: "cache",
}
```

- [ ] **Step 4: Persist rich customer-balance snapshots and invoice replay metadata**

```ts
cleanEntry.data.customer_balance_replay = {
    customer,
    company,
    sources,
}
```

- [ ] **Step 5: Re-run targeted frontend tests and make them pass**

Run: `cd frontend; cmd /c yarn vitest run tests/storedValue.spec.ts tests/offlineKeyMapParity.spec.ts tests/usePosPaySubmission.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/offline/db.ts frontend/src/offline/customers.ts frontend/src/offline/invoices.ts frontend/src/posapp/workers/itemWorker.js frontend/src/posapp/composables/pos/payments/useRedemptionLogic.ts frontend/src/posapp/composables/pos/payments/usePaymentSubmission.ts frontend/src/posapp/components/pos/invoice_utils/customer.ts frontend/tests/storedValue.spec.ts frontend/tests/offlineKeyMapParity.spec.ts frontend/tests/usePosPaySubmission.spec.ts
git commit -m "feat: add offline-safe customer balance snapshots"
```

## Chunk 4: Verification And Phase 2 Closeout

### Task 5: Run broad verification and update progress tracking

**Files:**
- Modify: `progress.md`

- [ ] **Step 1: Run backend verification**

Run: `python -m unittest posawesome.posawesome.api.test_gift_cards posawesome.posawesome.api.test_stored_value posawesome.posawesome.api.test_payments posawesome.posawesome.api.invoice_processing.test_payment`
Expected: PASS

- [ ] **Step 2: Run frontend verification**

Run: `cd frontend; cmd /c yarn vitest run tests/giftCardPayment.spec.ts tests/storedValue.spec.ts tests/offlineKeyMapParity.spec.ts tests/paymentOptions.spec.ts tests/usePaymentMethods.spec.ts tests/usePosPaySubmission.spec.ts`
Expected: PASS

- [ ] **Step 3: Run type-check**

Run: `cd frontend; cmd /c yarn -s type-check`
Expected: PASS

- [ ] **Step 4: Update progress tracking for literal Phase 2 scope**

```md
- Completed Phase 2 gift-card and offline customer-balance slices...
```

- [ ] **Step 5: Commit**

```bash
git add progress.md
git commit -m "docs: mark phase 2 implementation complete"
```
