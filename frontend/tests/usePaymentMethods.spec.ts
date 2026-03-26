import { computed, ref } from "vue";
import { describe, expect, it } from "vitest";

import { usePaymentMethods } from "../src/posapp/composables/pos/payments/usePaymentMethods";

describe("usePaymentMethods", () => {
	it("sets the selected payment method to the post-credit outstanding amount", () => {
		const invoiceDoc = ref<any>({
			rounded_total: 500,
			grand_total: 500,
			conversion_rate: 1,
			payments: [
				{
					mode_of_payment: "Cash",
					type: "Cash",
					amount: 250,
					base_amount: 250,
					default: 1,
				},
				{
					mode_of_payment: "Card",
					type: "Bank",
					amount: 0,
					base_amount: 0,
				},
			],
		});

		const { set_full_amount } = usePaymentMethods({
			invoiceDoc,
			posProfile: ref({}),
			diffPayment: computed(() => 0),
			getNetInvoiceAmount: () => 250,
			stores: {
				toastStore: { show: () => undefined },
				uiStore: { freeze: () => undefined, unfreeze: () => undefined },
			},
		});

		set_full_amount(invoiceDoc.value.payments[1]);

		expect(invoiceDoc.value.payments[0].amount).toBe(0);
		expect(invoiceDoc.value.payments[1].amount).toBe(250);
		expect(invoiceDoc.value.payments[1].base_amount).toBe(250);
	});

	it("fills only the remaining outstanding amount after redeemed credit and other payments", () => {
		const invoiceDoc = ref<any>({
			rounded_total: 500,
			grand_total: 500,
			conversion_rate: 1,
			payments: [
				{
					mode_of_payment: "Cash",
					type: "Cash",
					amount: 100,
					base_amount: 100,
					default: 1,
				},
				{
					mode_of_payment: "Card",
					type: "Bank",
					amount: 0,
					base_amount: 0,
				},
			],
		});

		const { set_rest_amount } = usePaymentMethods({
			invoiceDoc,
			posProfile: ref({}),
			diffPayment: computed(() => 150),
			getNetInvoiceAmount: () => 250,
			stores: {
				toastStore: { show: () => undefined },
				uiStore: { freeze: () => undefined, unfreeze: () => undefined },
			},
		});

		set_rest_amount(invoiceDoc.value.payments[1]);

		expect(invoiceDoc.value.payments[1].amount).toBe(150);
		expect(invoiceDoc.value.payments[1].base_amount).toBe(150);
	});
});
