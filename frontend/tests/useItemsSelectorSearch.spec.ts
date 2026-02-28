import { describe, expect, it, vi } from "vitest";

import { useItemsSelectorSearch } from "../src/posapp/composables/pos/items/useItemsSelectorSearch";

const createScannerInput = () => ({
	ensureScaleBarcodeSettings: vi.fn().mockResolvedValue(undefined),
	getScaleBarcodePrefix: vi.fn(() => ""),
	scaleBarcodeMatches: vi.fn(() => false),
	onBarcodeScanned: vi.fn(),
	handleSearchKeydown: vi.fn(() => false),
});

describe("useItemsSelectorSearch", () => {
	it("uses the nested integration search path for limit search enter actions", async () => {
		const searchItems = vi.fn().mockResolvedValue([]);
		const vm = {
			first_search: "abc",
			search: "",
			search_from_scanner: false,
			isBackgroundLoading: false,
			pos_profile: { posa_use_limit_search: 1 },
			itemSelection: {
				highlightedIndex: -1,
				selectHighlightedItem: vi.fn(),
			},
			itemsIntegration: {
				searchItems,
			},
		};

		const api = useItemsSelectorSearch({
			getVM: () => vm,
			scannerInput: createScannerInput(),
			itemSelection: vm.itemSelection,
		});

		await api._performSearch();

		expect(searchItems).toHaveBeenCalledWith("abc");
		expect(vm.search).toBe("abc");
	});
});
