// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";

import PaymentOptions from "../src/posapp/components/pos/payments/PaymentOptions.vue";
import CustomerInsights from "../src/posapp/components/pos/customer/CustomerInsights.vue";

const BoxStub = defineComponent({
	setup(_, { slots }) {
		return () => h("div", {}, slots.default?.());
	},
});

const VSwitchStub = defineComponent({
	name: "VSwitchStub",
	props: {
		label: {
			type: String,
			default: "",
		},
		modelValue: {
			type: Boolean,
			default: false,
		},
	},
	emits: ["update:modelValue"],
	setup(props, { emit }) {
		return () =>
			h("label", {}, [
				h("input", {
					type: "checkbox",
					checked: props.modelValue,
					onChange: (event: Event) =>
						emit("update:modelValue", (event.target as HTMLInputElement).checked),
				}),
				props.label,
			]);
	},
});

const VueDatePickerStub = defineComponent({
	setup() {
		return () => h("div");
	},
});

const VTextFieldStub = defineComponent({
	setup() {
		return () => h("input");
	},
});

describe("stored value UX", () => {
	beforeEach(() => {
		(window as any).frappe = { _: (value: string) => value };
		(globalThis as any).frappe = { _: (value: string) => value };
		(window as any).__ = (value: string) => value;
		(globalThis as any).__ = (value: string) => value;
	});

	it("surfaces stored value summary details when redemption is enabled", () => {
		const wrapper = mount(PaymentOptions, {
			props: {
				invoiceDoc: {
					is_return: 0,
				},
				posProfile: {
					use_customer_credit: 1,
				},
				redeemCustomerCredit: true,
				availableCustomerCredit: 850,
				redeemedCustomerCredit: 300,
				customerCreditSources: 2,
			},
			global: {
				components: {
					VRow: BoxStub,
					VCol: BoxStub,
					VSwitch: VSwitchStub,
					VTextField: VTextFieldStub,
					VChip: BoxStub,
					VueDatePicker: VueDatePickerStub,
				},
			},
		});

		expect(wrapper.text()).toContain("Use Stored Value");
		expect(wrapper.text()).toContain("Stored Value Ready");
		expect(wrapper.text()).toContain("Available stored value");
		expect(wrapper.text()).toContain("Applied now");
		expect(wrapper.text()).toContain("2 source(s)");
	});

	it("shows stored value and loyalty insights for the selected customer", () => {
		const wrapper = mount(CustomerInsights, {
			props: {
				customerInfo: {
					loyalty_points: 120,
					stored_value_balance: 850,
					stored_value_sources: 2,
				},
				formatCurrency: (value: number) => `PKR ${value}`,
			},
			global: {
				components: {
					VChip: BoxStub,
				},
			},
		});

		expect(wrapper.text()).toContain("Stored Value");
		expect(wrapper.text()).toContain("PKR 850");
		expect(wrapper.text()).toContain("2 sources");
		expect(wrapper.text()).toContain("Loyalty");
		expect(wrapper.text()).toContain("120 pts");
	});
});
