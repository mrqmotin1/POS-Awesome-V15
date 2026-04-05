// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";

import PaymentSummary from "../src/posapp/components/pos/payments/PaymentSummary.vue";

const BoxStub = defineComponent({
	setup(_, { slots }) {
		return () => h("div", {}, slots.default?.());
	},
});

const VTextFieldStub = defineComponent({
	name: "VTextFieldStub",
	props: {
		modelValue: {
			type: [String, Number],
			default: "",
		},
		label: {
			type: String,
			default: "",
		},
	},
	setup(props) {
		return () =>
			h("div", { "data-label": props.label }, String(props.modelValue ?? ""));
	},
});

describe("PaymentSummary", () => {
	beforeEach(() => {
		(window as any).frappe = { _: (value: string) => value };
	});

	it("shows applied gift card details inside the payment summary", () => {
		const wrapper = mount(PaymentSummary, {
			props: {
				invoice_doc: {
					currency: "PKR",
					is_return: false,
				},
				total_payments_display: "900",
				diff_payment_display: "0",
				diff_label: "Remaining",
				change_due: 0,
				paid_change: 0,
				credit_change: 0,
				paid_change_rules: [],
				currencySymbol: () => "Rs",
				formatCurrency: (value: number) => String(value),
				giftCardAppliedAmount: 300,
				giftCardCode: "GC-0001",
			},
			global: {
				components: {
					VRow: BoxStub,
					VCol: BoxStub,
					VTextField: VTextFieldStub,
				},
			},
		});

		expect(wrapper.text()).toContain("Gift Card Applied");
		expect(wrapper.text()).toContain("GC-0001");
		expect(wrapper.text()).toContain("300");
		expect(wrapper.text()).toContain("Included in settlement");
	});
});
