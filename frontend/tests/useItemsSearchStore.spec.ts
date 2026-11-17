import { describe, expect, it } from "vitest";

import { useItemsSearch } from "../src/posapp/composables/pos/items/store/useItemsSearch";

describe("useItemsSearch fuzzy local matching", () => {
	it("matches a near item-name typo without requiring a server miss fallback", () => {
		const search = useItemsSearch();
		const items = [
			{
				item_code: "CHOCO-BISCUIT",
				item_name: "Chocolate Biscuit",
				item_group: "Snacks",
			},
			{
				item_code: "VANILLA-CAKE",
				item_name: "Vanilla Cake",
				item_group: "Bakery",
			},
		] as any[];

		search.updateIndexes(items, null);

		const result = search.performLocalSearch(
			"choclate",
			items,
			"ALL",
		);

		expect(result.map((item) => item.item_code)).toEqual([
			"CHOCO-BISCUIT",
		]);
	});

	it("keeps item group filtering active for fuzzy matches", () => {
		const search = useItemsSearch();
		const items = [
			{
				item_code: "CHOCO-BISCUIT",
				item_name: "Chocolate Biscuit",
				item_group: "Snacks",
			},
			{
				item_code: "CHOCO-CAKE",
				item_name: "Chocolate Cake",
				item_group: "Bakery",
			},
		] as any[];

		search.updateIndexes(items, null);

		const result = search.performLocalSearch(
			"choclate",
			items,
			"Bakery",
		);

		expect(result.map((item) => item.item_code)).toEqual(["CHOCO-CAKE"]);
	});

	it("indexes item codes and barcodes in normalized lookup maps", () => {
		const search = useItemsSearch();
		const items = [
			{
				item_code: "MED-001",
				item_name: "Medicine",
				item_group: "Pharmacy",
				item_barcode: [{ barcode: "ABC123" }],
				barcodes: ["98765"],
			},
		] as any[];

		search.updateIndexes(items, null);

		expect(search.getItemByCode("med-001")?.item_code).toBe("MED-001");
		expect(search.getItemByBarcode("abc123")?.item_code).toBe("MED-001");
		expect(search.getItemByBarcode("98765")?.item_code).toBe("MED-001");
	});

	it("finds pharmacy items by generic name", () => {
		const search = useItemsSearch();
		const items = [
			{
				item_code: "NAPA-500",
				item_name: "Napa 500 mg Tablet",
				item_group: "Medicines",
				retailmind_old_pos_generic_name: "Paracetamol 500 mg",
			},
			{
				item_code: "SECLO-20",
				item_name: "Seclo 20 mg Capsule",
				item_group: "Medicines",
				retailmind_old_pos_generic_name: "Omeprazole 20 mg",
			},
		] as any[];

		search.updateIndexes(items, null);

		const byName = search.performRankedLocalSearch("paracetamol", items, "ALL", 10);
		expect(byName.map((item) => item.item_code)).toEqual(["NAPA-500"]);

		// Items that were never indexed use the fallback field list.
		const unindexed = items.map(({ _search_index, _search_tokens, ...item }) => item);
		const fallback = search.performLocalSearch("omeprazole", unindexed, "ALL");
		expect(fallback.map((item) => item.item_code)).toEqual(["SECLO-20"]);
	});

	it("ranks exact code and barcode matches before broader name matches", () => {
		const search = useItemsSearch();
		const items = [
			{
				item_code: "PARA-500",
				item_name: "Paracetamol 500",
				item_group: "Pharmacy",
			},
			{
				item_code: "OTHER",
				item_name: "Para Support",
				item_group: "Pharmacy",
				item_barcode: [{ barcode: "PARA" }],
			},
		] as any[];

		search.updateIndexes(items, null);

		const result = search.performRankedLocalSearch(
			"PARA",
			items,
			"ALL",
			10,
		);

		expect(result.map((item) => item.item_code)).toEqual([
			"OTHER",
			"PARA-500",
		]);
	});
});
