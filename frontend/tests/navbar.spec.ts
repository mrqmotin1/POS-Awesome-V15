// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { shallowMount } from "@vue/test-utils";

vi.mock("../src/posapp/composables/core/useRtl", () => ({
	useRtl: () => ({
		isRtl: false,
		rtlStyles: {},
		rtlClasses: [],
	}),
}));

import Navbar from "../src/posapp/components/Navbar.vue";
import { useEmployeeStore } from "../src/posapp/stores/employeeStore";

describe("Navbar supervisor access", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.stubGlobal("__", (value: string) => value);
		vi.stubGlobal("frappe", {
			session: {
				user: "cashier@example.com",
				user_fullname: "Main Cashier",
			},
			boot: {
				sysdefaults: { company: "Test Co" },
				website_settings: {},
			},
			call: vi.fn(async () => ({
				message: [
					{
						user: "cashier@example.com",
						full_name: "Main Cashier",
						is_current: true,
						is_supervisor: false,
					},
				],
			})),
		});
	});

	it("shows the dashboard drawer item only for POS supervisors", async () => {
		const employeeStore = useEmployeeStore();
		employeeStore.setCurrentCashier({
			user: "cashier@example.com",
			full_name: "Main Cashier",
			is_supervisor: false,
		});

		const wrapper = shallowMount(Navbar, {
			props: {
				posProfile: { name: "Main POS" },
			},
			global: {
				mocks: {
					__: (value: string) => value,
				},
				stubs: {
					NavbarAppBar: true,
					NavbarDrawer: true,
					NavbarMenu: true,
					NotificationBell: true,
					StatusIndicator: true,
					CacheUsageMeter: true,
					AboutDialog: true,
					EmployeeSwitchDialog: true,
					OfflineInvoicesDialog: true,
					ServerUsageGadget: true,
					DatabaseUsageGadget: true,
					VDialog: true,
					VCard: true,
					VCardTitle: true,
					VCardText: true,
					VSnackbar: true,
					VBtn: true,
					VProgressCircular: true,
				},
			},
		});

		await Promise.resolve();
		expect((wrapper.vm as any).items.some((item: any) => item.to === "/dashboard")).toBe(false);

		employeeStore.setCurrentCashier({
			user: "cashier@example.com",
			full_name: "Main Cashier",
			is_supervisor: true,
		});
		await (wrapper.vm as any).$nextTick();

		expect((wrapper.vm as any).items.some((item: any) => item.to === "/dashboard")).toBe(true);
	});

	it("shows the gift cards drawer item when gift cards are enabled on the POS profile", async () => {
		const employeeStore = useEmployeeStore();
		employeeStore.setCurrentCashier({
			user: "cashier@example.com",
			full_name: "Main Cashier",
			is_supervisor: true,
		});

		const wrapper = shallowMount(Navbar, {
			props: {
				posProfile: { name: "Main POS", posa_use_gift_cards: 1 },
			},
			global: {
				mocks: {
					__: (value: string) => value,
				},
				stubs: {
					NavbarAppBar: true,
					NavbarDrawer: true,
					NavbarMenu: true,
					NotificationBell: true,
					StatusIndicator: true,
					CacheUsageMeter: true,
					AboutDialog: true,
					EmployeeSwitchDialog: true,
					OfflineInvoicesDialog: true,
					ServerUsageGadget: true,
					DatabaseUsageGadget: true,
					VDialog: true,
					VCard: true,
					VCardTitle: true,
					VCardText: true,
					VSnackbar: true,
					VBtn: true,
					VProgressCircular: true,
				},
			},
		});

		await Promise.resolve();
		expect((wrapper.vm as any).items.some((item: any) => item.to === "/gift-cards")).toBe(true);
	});
});
