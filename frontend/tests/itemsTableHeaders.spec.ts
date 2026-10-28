import { beforeEach, describe, expect, it } from "vitest";

import { getItemsTableHeaders } from "../src/posapp/utils/itemsTableHeaders";

const pharmacyProfile = (overrides: Record<string, unknown> = {}) => ({
	posa_display_item_code: 0,
	__onload: {
		posa_item_selector_columns: [
			{ fieldname: "item_group", label: "Category", insert_after: "item_name", width: 100 },
			{ fieldname: "custom_generic_name", label: "Generic", insert_after: "actual_qty", width: 140 },
			{ fieldname: "brand", label: "Vendor", insert_after: "custom_generic_name", width: null },
		],
	},
	...overrides,
});

describe("getItemsTableHeaders layout columns", () => {
	beforeEach(() => {
		(globalThis as any).__ = (text: string) => text;
	});

	it("keeps the classic columns when no layout columns are declared", () => {
		const keys = getItemsTableHeaders("pos", { posa_display_item_code: 1 }).map((h) => h.key);

		expect(keys).toEqual(["item_name", "item_code", "rate", "actual_qty"]);
	});

	it("places app-declared columns after their anchors", () => {
		const headers = getItemsTableHeaders("pos", pharmacyProfile());

		expect(headers.map((h) => h.key)).toEqual([
			"item_name",
			"item_group",
			"rate",
			"actual_qty",
			"custom_generic_name",
			"brand",
		]);
		expect(headers.find((h) => h.key === "custom_generic_name")).toMatchObject({
			title: "Generic",
			width: "140px",
		});
		expect(headers.find((h) => h.key === "brand")?.width).toBeUndefined();
	});

	it("puts a column without a known anchor before the rate", () => {
		const headers = getItemsTableHeaders("pos", {
			__onload: { posa_item_selector_columns: [{ fieldname: "brand", label: "Vendor", insert_after: "nope" }] },
		});

		expect(headers.map((h) => h.key)).toEqual(["item_name", "brand", "rate", "actual_qty"]);
	});

	it("does not add layout columns to the purchase selector", () => {
		const keys = getItemsTableHeaders("purchase", pharmacyProfile()).map((h) => h.key);

		expect(keys).toEqual(["item_name", "rate", "actual_qty"]);
	});
});
