import { describe, expect, it } from "vitest";

import {
	DATA_TABLE_EXPAND_COLUMN,
	buildFinalVisibleColumns,
	getNarrowScrollHeaders,
	getResponsiveVisibleHeaders,
	usesNarrowScrollLayout,
} from "../src/posapp/composables/pos/items/useItemsTableResponsive";

const headers = [
	{ key: "item_name", title: "Name", required: true },
	{ key: "qty", title: "QTY", required: true },
	{ key: "uom", title: "UOM" },
	{ key: "price_list_rate", title: "Price List Rate" },
	{ key: "discount_percentage", title: "Discount %" },
	{ key: "discount_amount", title: "Discount Amount" },
	{ key: "rate", title: "Rate", required: true },
	{ key: "amount", title: "Amount", required: true },
	{ key: "posa_is_offer", title: "Offer?" },
	{ key: "actions", title: "Actions", required: true },
];

describe("items table final visible columns", () => {
	it("keeps the body column order aligned with the responsive header order and appends expand", () => {
		const visible = buildFinalVisibleColumns(headers, 1200);

		expect(visible.map((column) => column.key)).toEqual([
			"item_name",
			"qty",
			"uom",
			"price_list_rate",
			"discount_percentage",
			"discount_amount",
			"rate",
			"amount",
			"posa_is_offer",
			"actions",
			"data-table-expand",
		]);
	});

	// FORK(mon-develop-4): our fork hides discount/UOM/price-list columns below 650px.
	it.skip("keeps selected optional columns visible in normal POS pane widths", () => {
		const responsive = getResponsiveVisibleHeaders(headers, 600);
		const finalColumns = buildFinalVisibleColumns(headers, 600);

		expect(responsive.map((column) => column.key)).toEqual([
			"item_name",
			"qty",
			"uom",
			"price_list_rate",
			"discount_percentage",
			"discount_amount",
			"rate",
			"amount",
			"posa_is_offer",
			"actions",
		]);
		expect(finalColumns.slice(0, -1)).toEqual(responsive);
		expect(finalColumns.at(-1)?.key).toBe("data-table-expand");
		expect(
			responsive.find((column) => column.key === "item_name")?.minWidth,
		).toBe(160);
		expect(
			responsive.find((column) => column.key === "qty")?.minWidth,
		).toBe(92);
		expect(
			responsive.find((column) => column.key === "actions")?.minWidth,
		).toBe(68);
	});

	// FORK(mon-develop-4): our fork keeps its own 1024px-tuned column width sets.
	it.skip("fits every selected column inside a standard desktop invoice pane", () => {
		const paneWidth = 1020;
		const responsive = getResponsiveVisibleHeaders(headers, paneWidth);
		const occupiedWidth = responsive.reduce(
			(total, column) => total + Number(column.width || 0),
			Number(DATA_TABLE_EXPAND_COLUMN.width),
		);

		expect(responsive).toHaveLength(headers.length);
		expect(occupiedWidth).toBeLessThanOrEqual(paneWidth);
		expect(
			responsive.find((column) => column.key === "item_name")?.minWidth,
		).toBe(148);
		expect(
			responsive.find((column) => column.key === "actions")?.minWidth,
		).toBe(56);
	});

	it("keeps the expand column even when the responsive layout collapses optional fields", () => {
		const finalColumns = buildFinalVisibleColumns(headers, 420);

		expect(finalColumns.map((column) => column.key)).toEqual([
			"item_name",
			"qty",
			"rate",
			"amount",
			"actions",
			"data-table-expand",
		]);
	});
});

describe("narrow cart on a desktop screen", () => {
	const cartHeaders = [{ key: "sl", title: "SL", required: true }, ...headers];

	it("applies only to a narrow cart on a screen at least 1024px wide", () => {
		expect(usesNarrowScrollLayout(400, 1024)).toBe(true);
		expect(usesNarrowScrollLayout(649, 1280)).toBe(true);
		expect(usesNarrowScrollLayout(650, 1024)).toBe(false);
		expect(usesNarrowScrollLayout(400, 1023)).toBe(false);
		expect(usesNarrowScrollLayout(0, 1024)).toBe(false);
	});

	it("puts SL, Name, QTY, Rate, Amount first and keeps every other column after them", () => {
		const narrow = getNarrowScrollHeaders(cartHeaders);

		expect(narrow.map((column) => column.key)).toEqual([
			"sl",
			"item_name",
			"qty",
			"rate",
			"amount",
			"uom",
			"price_list_rate",
			"discount_percentage",
			"discount_amount",
			"posa_is_offer",
			"actions",
		]);
	});

	it("keeps the five main columns within a ~400px cart", () => {
		const narrow = getNarrowScrollHeaders(cartHeaders);
		const mainWidth = narrow
			.slice(0, 5)
			.reduce((sum, column) => sum + Number(column.width), 0);

		expect(mainWidth).toBeLessThanOrEqual(390);
		narrow.forEach((column) => expect(column.minWidth).toBe(column.width));
	});
});
