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
		return () => h("span", { class: "v-icon-stub" }, props.icon);
	},
});

const VTooltipStub = defineComponent({
	props: {
		text: {
			type: String,
			default: "",
		},
	},
	setup(props, { slots }) {
		return () =>
			h("div", { class: "v-tooltip-stub", "data-tooltip": props.text }, [
				slots.activator?.({ props: { "aria-label": props.text } }),
				slots.default?.(),
			]);
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
		prefix: {
			type: String,
			default: "",
		},
	},
	setup(props, { slots }) {
		return () =>
			h("div", { "data-label": props.label }, [
				h("span", { class: "prefix" }, props.prefix),
				h("span", { class: "value" }, String(props.modelValue ?? "")),
				slots["append-inner"]?.(),
			]);
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
					VTooltip: VTooltipStub,
					VTextField: VTextFieldStub,
				},
			},
		});

		expect(wrapper.find('[data-label="Item / Rate Discounts"]').text()).toContain("120");
		expect(wrapper.find('[data-label="Additional Discount"]').text()).toContain("50");
		expect(wrapper.find('[data-label="Total Discount"]').text()).toContain("170");
		expect(wrapper.find('[data-label="Discount Amount"]').exists()).toBe(false);
		expect(wrapper.find(".discount-context-card").exists()).toBe(false);
		const itemDiscountField = wrapper.find('[data-label="Item / Rate Discounts"]');
		expect(itemDiscountField.find(".discount-help-trigger").exists()).toBe(true);
		expect(itemDiscountField.find(".v-icon-stub").text()).toContain(
			"mdi-information-outline",
		);
		const itemDiscountTooltip = itemDiscountField.find(".v-tooltip-stub");
		expect(itemDiscountTooltip.attributes("data-tooltip")).toContain(
			"Item and rate discounts are already included in item rates and Net Total.",
		);
		expect(itemDiscountTooltip.attributes("data-tooltip")).toContain(
			"Additional Discount is the separate invoice-level discount.",
		);
	});

	it("shows the currency symbol once on every total", () => {
		const symbols: Record<string, string> = { BDT: "৳", USD: "$" };
		const wrapper = mount(InvoiceTotals, {
			props: {
				invoice_doc: {
					currency: "BDT",
					net_total: 12,
					total_taxes_and_charges: 0,
					total: 12,
					discount_amount: 0,
					grand_total: 12,
					rounded_total: 12,
				},
				itemDiscountTotal: 0,
				displayCurrency: "BDT",
				diff_payment: 0,
				diff_label: "Change (BDT)",
				// Mirrors useFormat: a currency argument puts the symbol in the value.
				currencySymbol: (currency?: string) => symbols[currency || "USD"],
				formatCurrency: (value: number, currency?: string) =>
					`${currency ? symbols[currency] : ""}${Number(value).toFixed(2)}`,
			},
			global: {
				components: {
					VRow: BoxStub,
					VCol: BoxStub,
					VIcon: VIconStub,
					VTooltip: VTooltipStub,
					VTextField: VTextFieldStub,
				},
			},
		});

		for (const label of ["Net Total", "Tax and Charges", "Total Amount", "Change (BDT)", "Grand Total"]) {
			const field = wrapper.find(`[data-label="${label}"]`);
			expect(field.find(".prefix").text(), label).toBe("৳");
			expect(field.find(".value").text(), label).not.toContain("৳");
		}
	});
});
