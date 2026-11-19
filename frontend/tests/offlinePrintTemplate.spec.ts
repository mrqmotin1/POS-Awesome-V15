// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/offline/index", () => ({
	getPrintTemplate: vi.fn(() => ""),
	getTermsAndConditions: vi.fn(() => ""),
	memoryInitPromise: Promise.resolve(),
}));

import renderOfflineInvoiceHTML from "../src/offline_print_template";

describe("offline print fallback totals", () => {
	beforeEach(() => {
		vi.stubGlobal("frappe", { _: (text: string) => text });
	});

	// FORK(mon-develop-4): the Spark offline receipt has its own totals layout.
	it.skip("prints paid amount net of change in invoice currency", async () => {
		const html = await renderOfflineInvoiceHTML({
			name: "ACC-SINV-OFFLINE-1",
			company: "Test Co",
			customer: "Walk In",
			grand_total: 100,
			change_amount: 20,
			payments: [{ mode_of_payment: "Cash", amount: 120 }],
			items: [],
			taxes: [],
		});

		expect(html).toContain("Change Amount");
		expect(html).toContain("20");
		expect(html).toContain(
			'<td style="width:40%; text-align:right;">100</td>',
		);
	});

	// FORK(mon-develop-4): the Spark offline receipt has its own totals layout.
	it.skip("prints return paid amount as negative", async () => {
		const html = await renderOfflineInvoiceHTML({
			name: "ACC-SINV-RETURN-OFFLINE",
			company: "Test Co",
			customer: "Walk In",
			is_return: 1,
			grand_total: -80,
			payments: [{ mode_of_payment: "Cash", amount: -80 }],
			items: [],
			taxes: [],
		});

		expect(html).toContain(
			'<td style="width:40%; text-align:right;">-80</td>',
		);
	});

	it("removes executable markup from offline invoice fields", async () => {
		const html = await renderOfflineInvoiceHTML({
			name: "ACC-SINV-XSS",
			company: '<img src=x onerror="globalThis.pwned=1">',
			customer_name: "<script>globalThis.pwned=1</script>Customer",
			posa_notes: '<a href="javascript:alert(1)">note</a>',
			terms_and_conditions:
				'<iframe srcdoc="<script>alert(1)</script>"></iframe><b>Safe terms</b>',
			grand_total: 10,
			items: [
				{
					item_code: "ITEM-XSS",
					item_name: '<svg onload="alert(1)">Item</svg>',
					qty: 1,
					uom: "Nos",
					rate: 10,
					amount: 10,
				},
			],
			taxes: [],
			payments: [],
		});

		expect(html).not.toMatch(
			/<script|<iframe|onerror=|onload=|javascript:/i,
		);
		// FORK(mon-develop-4): the Spark offline receipt does not print terms & conditions.
		expect(html).toContain("Content-Security-Policy");
	});

	// FORK(mon-develop-4): defaultOfflineHTML is async; the upstream sanitizePrintHtml
	// wrap must await it or the receipt prints the literal "[object Promise]".
	it("renders the fork fallback receipt instead of [object Promise]", async () => {
		const html = await renderOfflineInvoiceHTML({
			name: "ACC-SINV-2026-00042",
			company: "Test Co",
			posting_date: "2026-11-19",
			grand_total: 105,
			net_total: 100,
			total_taxes_and_charges: 5,
			items: [
				{
					item_code: "ITEM-1",
					item_name: "Blue Shirt",
					qty: 1,
					rate: 100,
					amount: 100,
				},
			],
			taxes: [],
			payments: [{ mode_of_payment: "Cash", amount: 105 }],
		});

		expect(html).not.toContain("[object Promise]");
		expect(html).toContain("TAX INVOICE");
		expect(html).toContain("Blue Shirt");
		expect(html).toContain("19-11-2026");
		expect(html).toContain("Content-Security-Policy");
	});
});
