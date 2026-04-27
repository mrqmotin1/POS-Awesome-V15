// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";

import InvoiceTotals from "../src/posapp/components/pos/payments/InvoiceTotals.vue";

const BoxStub = defineComponent({
	setup(_, { slots }) {
		return () => h("div", {}, slots.default?.());
	},
});

const VIconStub = defineComponent({
	props: {
		icon: {
			type: String,
			default: "",
		},
	},
	setup(props) {
		return () => h("span", {}, props.icon);
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

describe("InvoiceTotals", () => {
	beforeEach(() => {
		(window as any).frappe = { _: (value: string) => value };
	});

	it("separates item/rate discounts from additional discount", () => {
		const wrapper = mount(InvoiceTotals, {
			props: {
				invoice_doc: {
					currency: "PKR",
					net_total: 900,
					total_taxes_and_charges: 0,
					total: 900,
					discount_amount: 50,
					grand_total: 850,
				},
				itemDiscountTotal: 120,
				displayCurrency: "PKR",
				diff_payment: 0,
				diff_label: "Remaining",
				currencySymbol: () => "Rs",
				formatCurrency: (value: number) => String(value),
			},
			global: {
				components: {
					VRow: BoxStub,
					VCol: BoxStub,
					VIcon: VIconStub,
					VTextField: VTextFieldStub,
				},
			},
		});

		expect(wrapper.find('[data-label="Item / Rate Discounts"]').text()).toContain("120");
		expect(wrapper.find('[data-label="Additional Discount"]').text()).toContain("50");
		expect(wrapper.find('[data-label="Total Discount"]').text()).toContain("170");
		expect(wrapper.find('[data-label="Discount Amount"]').exists()).toBe(false);
		expect(wrapper.text()).toContain(
			"Item and rate discounts are already included in item rates and Net Total.",
		);
		expect(wrapper.text()).toContain(
			"Additional Discount is the separate invoice-level discount.",
		);
	});
});
