import api from "./api";

export default {
	getItemGroups() {
		return api.call("posawesome.posawesome.api.items.get_items_groups");
	},

	getItems(args, signal) {
		return api.call("posawesome.posawesome.api.items.get_items", args, { signal });
	},

	getItemsFromBarcode(args) {
		return api.call("posawesome.posawesome.api.items.get_items_from_barcode", args);
	},

	getItemBrand(itemCode) {
		return api.call("posawesome.posawesome.api.items.get_item_brand", { item_code: itemCode });
	},

	getUOMs() {
		return api.call("frappe.client.get_list", {
			doctype: "UOM",
			fields: ["name"],
			limit_page_length: 0,
		});
	},

	createItem(itemData) {
		return api.call("frappe.client.insert", {
			doc: {
				doctype: "Item",
				is_stock_item: 1,
				...itemData,
			},
		});
	}
};
