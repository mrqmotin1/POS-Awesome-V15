import { describe, expect, it, vi } from "vitest";

import { _applyItemDetailPayload } from "../src/posapp/components/pos/invoice_utils/item_updates";

describe("_applyItemDetailPayload serial preservation", () => {
	it("keeps selected serial info when server payload does not include serial_no", () => {
		const context: any = {
			pos_profile: { warehouse: "Main", posa_auto_set_batch: false },
			price_list_currency: "USD",
			selected_currency: "USD",
			currency_precision: 2,
			flt: (value: any) => Number(value),
			update_qty_limits: vi.fn(),
			_getPlcConversionRate: () => 1,
			_applyPriceListRate: vi.fn(),
		};

		const item: any = {
			item_code: "ITEM-1",
			warehouse: "Main",
			qty: 1,
			serial_no_selected: ["SER-KEEP-01"],
			serial_no_selected_count: 1,
			serial_no: "SER-KEEP-01",
			item_uoms: [],
		};

		const data: any = {
			stock_uom: "Nos",
			uom: "Nos",
			conversion_factor: 1,
			item_uoms: [{ uom: "Nos", conversion_factor: 1 }],
			allow_change_warehouse: 0,
			locked_price: 0,
			description: "",
			item_tax_template: "",
			discount_percentage: 0,
			warehouse: "Main",
			has_batch_no: 0,
			has_serial_no: 1,
			serial_no: null,
			batch_no: null,
			is_stock_item: 1,
			is_fixed_asset: 0,
			allow_alternative_item: 0,
			actual_qty: 10,
			price_list_rate: 100,
			currency: "USD",
			serial_no_data: [],
		};

		_applyItemDetailPayload(context, item, data, {});

		expect(item.serial_no_selected).toEqual(["SER-KEEP-01"]);
		expect(item.serial_no).toBe("SER-KEEP-01");
		expect(item.serial_no_selected_count).toBe(1);
	});
});

