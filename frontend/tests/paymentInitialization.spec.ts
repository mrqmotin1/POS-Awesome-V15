import { describe, expect, it } from "vitest";

import * as paymentInitialization from "../src/posapp/utils/paymentInitialization";

const {
	applyPreferredPaymentAmount,
	initializePaymentLinesForDialog,
	resolvePreferredPaymentLine,
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
				{
					mode_of_payment: "Card",
					type: "Bank",
					amount: 0,
					base_amount: 0,
				},
				{
					mode_of_payment: "Cash",
					type: "Cash",
					amount: 0,
					base_amount: 0,
				},
			],
		};

		const payment = initializePaymentLinesForDialog(
			doc,
			2,
			isCashLikePayment,
		);

		expect(resolvePreferredPaymentLine(doc, isCashLikePayment)).toBe(
			doc.payments[1],
		);
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
				{
					mode_of_payment: "Cash",
					type: "Cash",
					amount: 50,
					base_amount: 50,
					default: 1,
				},
				{
					mode_of_payment: "Card",
					type: "Bank",
					amount: 150,
					base_amount: 150,
				},
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
			payments: [
				{
					mode_of_payment: "Cash",
					type: "Cash",
					amount: 0,
					base_amount: 0,
				},
			],
		};

		initializePaymentLinesForDialog(doc, 2, isCashLikePayment);

		expect(doc.payments[0].amount).toBe(-80);
		expect(doc.payments[0].base_amount).toBe(-80);
	});

	it("does not cap cashback for returns without an original invoice", () => {
		const doc: any = {
			rounded_total: -2625,
			conversion_rate: 1,
			is_return: 1,
			posa_refundable_amount: 0,
			payments: [
				{
					mode_of_payment: "Cash",
					type: "Cash",
					amount: 0,
					base_amount: 0,
				},
			],
		};

		initializePaymentLinesForDialog(doc, 2, isCashLikePayment);

		expect(doc.payments[0].amount).toBe(-2625);
		expect(doc.payments[0].base_amount).toBe(-2625);
	});

	it("caps cashback for returns against an original invoice", () => {
		const doc: any = {
			rounded_total: -2625,
			conversion_rate: 1,
			is_return: 1,
			return_against: "ACC-SINV-0001",
			posa_refundable_amount: 1000,
			payments: [
				{
					mode_of_payment: "Cash",
					type: "Cash",
					amount: 0,
					base_amount: 0,
				},
			],
		};

		initializePaymentLinesForDialog(doc, 2, isCashLikePayment);

		expect(doc.payments[0].amount).toBe(-1000);
		expect(doc.payments[0].base_amount).toBe(-1000);
	});

	it("initializes base payment amounts with ERPNext invoice conversion rate", () => {
		const doc: any = {
			currency: "USD",
			rounded_total: 80,
			conversion_rate: 280,
			payments: [
				{
					mode_of_payment: "Cash",
					type: "Cash",
					amount: 0,
					base_amount: 0,
				},
			],
		};

		initializePaymentLinesForDialog(doc, 2, isCashLikePayment);

		expect(doc.payments[0].amount).toBe(80);
		expect(doc.payments[0].base_amount).toBe(22400);
	});

	it("applies a shortcut amount to the POS Profile preferred payment line", () => {
		const doc: any = {
			currency: "USD",
			conversion_rate: 280,
			payments: [
				{
					mode_of_payment: "Card",
					type: "Bank",
					amount: 100,
					base_amount: 28000,
				},
				{
					mode_of_payment: "Cash",
					type: "Cash",
					default: 1,
					amount: 0,
					base_amount: 0,
				},
			],
		};

		const payment = applyPreferredPaymentAmount(
			doc,
			150,
			2,
			isCashLikePayment,
		);

		expect(payment).toBe(doc.payments[1]);
		expect(doc.payments[0].amount).toBe(0);
		expect(doc.payments[0].base_amount).toBe(0);
		expect(doc.payments[1].amount).toBe(150);
		expect(doc.payments[1].base_amount).toBe(42000);
	});

	it("stores shortcut amounts as negative refunds for returns", () => {
		const doc: any = {
			is_return: 1,
			conversion_rate: 1,
			payments: [
				{
					mode_of_payment: "Cash",
					type: "Cash",
					amount: 0,
					base_amount: 0,
				},
			],
		};

		applyPreferredPaymentAmount(doc, 80, 2, isCashLikePayment);

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

		const payment = paymentInitialization.rebalancePreferredPaymentLine?.(
			doc,
			{
				precision: 2,
				isCashLikePayment,
				giftCardAmount: 120,
			},
		);

		expect(payment).toBe(doc.payments[0]);
		expect(doc.payments[0].amount).toBe(180);
		expect(doc.payments[0].base_amount).toBe(180);
		expect(doc.payments[1].amount).toBe(0);
	});

	it("rebalances preferred payment base amount with ERPNext invoice conversion rate", () => {
		const doc: any = {
			currency: "USD",
			rounded_total: 100,
			conversion_rate: 280,
			payments: [
				{
					mode_of_payment: "Cash",
					type: "Cash",
					amount: 100,
					base_amount: 28000,
					default: 1,
				},
			],
		};

		const payment = paymentInitialization.rebalancePreferredPaymentLine?.(
			doc,
			{
				precision: 2,
				isCashLikePayment,
				giftCardAmount: 30,
			},
		);

		expect(payment).toBe(doc.payments[0]);
		expect(doc.payments[0].amount).toBe(70);
		expect(doc.payments[0].base_amount).toBe(19600);
	});
});

describe("isDrawerCashPayment", () => {
	const { isDrawerCashPayment } = paymentInitialization;

	it("does not treat a Cash-TYPE card mode as the drawer", () => {
		// The regression: "Card" is type "Cash" on these sites, which made the
		// card-overpayment guard skip every card row.
		expect(
			isDrawerCashPayment({ mode_of_payment: "Card", type: "Cash" }, "Cash"),
		).toBe(false);
	});

	it("matches the mode configured on the POS Profile", () => {
		expect(
			isDrawerCashPayment({ mode_of_payment: "Cash", type: "Cash" }, "Cash"),
		).toBe(true);
	});

	it("matches the configured mode regardless of its name or type", () => {
		expect(
			isDrawerCashPayment({ mode_of_payment: "Efectivo", type: "Bank" }, "Efectivo"),
		).toBe(true);
	});

	it("ignores a cash-sounding mode that is not the configured one", () => {
		expect(
			isDrawerCashPayment(
				{ mode_of_payment: "Pay at Cash Counter", type: "Cash" },
				"Cash",
			),
		).toBe(false);
	});

	it("falls back to name matching when the profile has no cash mode set", () => {
		expect(isDrawerCashPayment({ mode_of_payment: "Cash" }, "")).toBe(true);
		expect(isDrawerCashPayment({ mode_of_payment: "نقدي" }, undefined)).toBe(true);
		expect(isDrawerCashPayment({ mode_of_payment: "Card" }, "")).toBe(false);
	});

	it("is case- and whitespace-insensitive on the configured mode", () => {
		expect(isDrawerCashPayment({ mode_of_payment: "cash" }, " Cash ")).toBe(true);
	});

	it("returns false for a missing row", () => {
		expect(isDrawerCashPayment(null, "Cash")).toBe(false);
		expect(isDrawerCashPayment({}, "Cash")).toBe(false);
	});
});
