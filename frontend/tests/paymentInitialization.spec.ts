import { describe, expect, it } from "vitest";

import * as paymentInitialization from "../src/posapp/utils/paymentInitialization";

const {
	initializePaymentLinesForDialog,
	resolvePreferredPaymentLine,
	ensureGiftCardPaymentLine,
} = paymentInitialization;

describe("paymentInitialization", () => {
	const isCashLikePayment = (payment: any) =>
		String(payment?.type || "").toLowerCase() === "cash" ||
		String(payment?.mode_of_payment || "")
			.toLowerCase()
			.includes("cash");

	it("falls back to a cash-like payment when no default flag exists", () => {
		const doc: any = {
			rounded_total: 125,
			conversion_rate: 1,
			payments: [
				{ mode_of_payment: "Card", type: "Bank", amount: 0, base_amount: 0 },
				{ mode_of_payment: "Cash", type: "Cash", amount: 0, base_amount: 0 },
			],
		};

		const payment = initializePaymentLinesForDialog(doc, 2, isCashLikePayment);

		expect(resolvePreferredPaymentLine(doc, isCashLikePayment)).toBe(doc.payments[1]);
		expect(payment).toBe(doc.payments[1]);
		expect(doc.payments[1].amount).toBe(125);
		expect(doc.payments[1].base_amount).toBe(125);
		expect(doc.payments[0].amount).toBe(0);
	});

	it("preserves existing entered amounts instead of overwriting them", () => {
		const doc: any = {
			rounded_total: 200,
			conversion_rate: 1,
			payments: [
				{ mode_of_payment: "Cash", type: "Cash", amount: 50, base_amount: 50, default: 1 },
				{ mode_of_payment: "Card", type: "Bank", amount: 150, base_amount: 150 },
			],
		};

		initializePaymentLinesForDialog(doc, 2, isCashLikePayment);

		expect(doc.payments[0].amount).toBe(50);
		expect(doc.payments[1].amount).toBe(150);
	});

	it("initializes return payments as negative values", () => {
		const doc: any = {
			rounded_total: -80,
			conversion_rate: 1,
			is_return: 1,
			payments: [{ mode_of_payment: "Cash", type: "Cash", amount: 0, base_amount: 0 }],
		};

		initializePaymentLinesForDialog(doc, 2, isCashLikePayment);

		expect(doc.payments[0].amount).toBe(-80);
		expect(doc.payments[0].base_amount).toBe(-80);
	});

	it("reduces the preferred payment amount when customer credit is redeemed", () => {
		const doc: any = {
			rounded_total: 2700,
			conversion_rate: 1,
			payments: [
				{
					mode_of_payment: "Credit Card",
					type: "Bank",
					amount: 2700,
					base_amount: 2700,
					default: 1,
				},
				{
					mode_of_payment: "Cash",
					type: "Cash",
					amount: 0,
					base_amount: 0,
				},
			],
		};

		const payment = paymentInitialization.rebalancePreferredPaymentLine?.(
			doc,
			{
				precision: 2,
				isCashLikePayment,
				redeemedCustomerCredit: 900,
			},
		);

		expect(payment).toBe(doc.payments[0]);
		expect(doc.payments[0].amount).toBe(1800);
		expect(doc.payments[0].base_amount).toBe(1800);
		expect(doc.payments[1].amount).toBe(0);
	});

	it("reduces the preferred payment amount when a gift card is redeemed", () => {
		const doc: any = {
			rounded_total: 300,
			conversion_rate: 1,
			payments: [
				{
					mode_of_payment: "Cash",
					type: "Cash",
					amount: 300,
					base_amount: 300,
					default: 1,
				},
				{
					mode_of_payment: "Card",
					type: "Bank",
					amount: 0,
					base_amount: 0,
				},
			],
		};

		const payment = paymentInitialization.rebalancePreferredPaymentLine?.(doc, {
			precision: 2,
			isCashLikePayment,
			giftCardAmount: 120,
		});

		expect(payment).toBe(doc.payments[0]);
		expect(doc.payments[0].amount).toBe(180);
		expect(doc.payments[0].base_amount).toBe(180);
		expect(doc.payments[1].amount).toBe(0);
	});

	it("syncs an existing hidden gift card payment line for submission", () => {
		const doc: any = {
			rounded_total: 300,
			conversion_rate: 1,
			payments: [
				{ mode_of_payment: "Cash", type: "Cash", amount: 300, base_amount: 300, default: 1 },
				{ mode_of_payment: "Gift Card", type: "Bank", amount: 0, base_amount: 0 },
			],
		};

		const payment = ensureGiftCardPaymentLine(doc, null, 120, 2);

		expect(payment).toBe(doc.payments[1]);
		expect(doc.payments[1].amount).toBe(120);
		expect(doc.payments[1].base_amount).toBe(120);
	});

	it("adds a gift card payment line from the POS profile when the invoice does not already have one", () => {
		const doc: any = {
			rounded_total: 300,
			conversion_rate: 1,
			payments: [{ mode_of_payment: "Cash", type: "Cash", amount: 300, base_amount: 300, default: 1 }],
		};

		const payment = ensureGiftCardPaymentLine(
			doc,
			{
				payments: [
					{ mode_of_payment: "Cash", type: "Cash", account: "1110 - Cash", default: 1 },
					{ mode_of_payment: "Gift Card", type: "Bank", account: "2190 - Gift Card", default: 0 },
				],
			},
			150,
			2,
		);

		expect(payment).toEqual(
			expect.objectContaining({
				mode_of_payment: "Gift Card",
				type: "Bank",
				account: "2190 - Gift Card",
				amount: 150,
				base_amount: 150,
			}),
		);
		expect(doc.payments).toHaveLength(2);
	});
});
