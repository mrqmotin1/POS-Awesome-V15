// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

vi.mock("../src/posapp/composables/core/useTheme", () => ({
	useTheme: () => ({
		isDark: { value: false },
	}),
}));

vi.mock("../src/posapp/composables/core/useResponsive", () => ({
	useResponsive: () => ({
		windowWidth: { value: 1400 },
	}),
}));

vi.mock("../src/offline/index", () => ({
	isOffline: () => false,
}));

vi.mock("../src/posapp/plugins/print", () => ({
	appendDebugPrintParam: (url: string) => url,
	isDebugPrintEnabled: () => false,
	silentPrint: vi.fn(),
	watchPrintWindow: vi.fn(),
}));

vi.mock("../src/posapp/services/qzTray", () => ({
	printDocumentViaQz: vi.fn(),
}));

import InvoiceManagement from "../src/posapp/components/pos/flows/InvoiceManagement.vue";

describe("InvoiceManagement repair candidate filter", () => {
	it("filters history rows to repair candidates when the toggle is enabled", () => {
		const context = {
			historyInvoices: [
				{
					name: "ACC-SINV-0001",
					customer_name: "Walk-In",
					status: "Paid",
					posting_date: "2026-04-04",
					posting_time: "10:00:00",
					grand_total: 240,
					paid_amount: 2400,
					change_amount: 2160,
					outstanding_amount: -2160,
					is_return: 0,
				},
				{
					name: "ACC-SINV-0002",
					customer_name: "Regular",
					status: "Paid",
					posting_date: "2026-04-04",
					posting_time: "11:00:00",
					grand_total: 240,
					paid_amount: 240,
					change_amount: 0,
					outstanding_amount: 0,
					is_return: 0,
				},
			],
			historySearch: "",
			historyStatus: "All",
			historyDateFrom: "",
			historyDateTo: "",
			historyShowRepairCandidatesOnly: true,
			filterCollection: (InvoiceManagement as any).methods.filterCollection,
			sortInvoicesByLatest: (InvoiceManagement as any).methods.sortInvoicesByLatest,
			invoiceSortValue: (InvoiceManagement as any).methods.invoiceSortValue,
			normalizeDate: (InvoiceManagement as any).methods.normalizeDate,
			normalizePostingTime: (InvoiceManagement as any).methods.normalizePostingTime,
			toPostingTimestamp: (InvoiceManagement as any).methods.toPostingTimestamp,
			inRange: (InvoiceManagement as any).methods.inRange,
			isRepairCandidate: (InvoiceManagement as any).methods.isRepairCandidate,
		};

		const filtered = (InvoiceManagement as any).computed.filteredHistoryInvoices.call(context);

		expect(filtered).toHaveLength(1);
		expect(filtered[0].name).toBe("ACC-SINV-0001");
	});

	it("recomputes history totals from the repair-candidate subset", () => {
		const context = {
			filteredHistoryInvoices: [
				{
					grand_total: 240,
					paid_amount: 2400,
					change_amount: 2160,
					outstanding_amount: -2160,
				},
			],
		};

		const totals = (InvoiceManagement as any).computed.historyTotals.call(context);

		expect(totals).toEqual({
			gross: 240,
			paid: 2400,
			change_return: 2160,
			outstanding: -2160,
		});
	});
});
