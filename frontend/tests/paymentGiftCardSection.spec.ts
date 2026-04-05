// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";

import PaymentGiftCardSection from "../src/posapp/components/pos/payments/PaymentGiftCardSection.vue";

const BoxStub = defineComponent({
	setup(_, { slots }) {
		return () => h("div", {}, slots.default?.());
	},
});

const VBtnStub = defineComponent({
	name: "VBtnStub",
	emits: ["click"],
	setup(_, { slots, emit }) {
		return () =>
			h(
				"button",
				{
					onClick: () => emit("click"),
				},
				slots.default?.(),
			);
	},
});

describe("PaymentGiftCardSection", () => {
	beforeEach(() => {
		(window as any).frappe = { _: (value: string) => value };
		(window as any).__ = (value: string) => value;
	});

	it("shows a dedicated gift card action when gift cards are enabled", () => {
		const wrapper = mount(PaymentGiftCardSection, {
			props: {
				enabled: true,
				appliedAmount: 0,
				cardCode: "",
				formatCurrency: (value: number) => String(value),
			},
			global: {
				components: {
					VBtn: VBtnStub,
					VIcon: BoxStub,
				},
			},
		});

		expect(wrapper.text()).toContain("Gift Card");
		expect(wrapper.text()).toContain("Redeem / Scan");
	});

	it("surfaces the applied gift card amount and code after redemption", () => {
		const wrapper = mount(PaymentGiftCardSection, {
			props: {
				enabled: true,
				appliedAmount: 300,
				cardCode: "GC-0001",
				formatCurrency: (value: number) => String(value),
			},
			global: {
				components: {
					VBtn: VBtnStub,
					VIcon: BoxStub,
				},
			},
		});

		expect(wrapper.text()).toContain("Applied");
		expect(wrapper.text()).toContain("GC-0001");
		expect(wrapper.text()).toContain("300");
	});
});
