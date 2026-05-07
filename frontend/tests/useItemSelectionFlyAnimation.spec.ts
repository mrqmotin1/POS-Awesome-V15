// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { useItemSelection } from "../src/posapp/composables/pos/items/useItemSelection";

describe("useItemSelection fly animation", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("targets the cart top row instead of the selector-side table", async () => {
		const selectorTable = document.createElement("div");
		selectorTable.className = "items-table-container";
		document.body.appendChild(selectorTable);
		const cartTable = document.createElement("div");
		cartTable.className = "posa-items-table-container";
		cartTable.innerHTML = `
			<table class="posa-cart-table">
				<tbody>
					<tr data-test="cart-top-row"><td>Top row</td></tr>
				</tbody>
			</table>
		`;
		document.body.appendChild(cartTable);
		const fly = vi.fn();
		const addItem = vi.fn();
		const itemSelection = useItemSelection();
		itemSelection.registerContext({
			addItem,
			fly,
			flyConfig: { speed: 0.6 },
		});

		await itemSelection.handleRowClick(
			new MouseEvent("click", {
				clientX: 120,
				clientY: 160,
			}),
			{ item: { item_code: "ITEM-001" } },
		);

		const source = fly.mock.calls[0]?.[0] as HTMLElement | undefined;
		const target = fly.mock.calls[0]?.[1] as HTMLElement | undefined;

		expect(source?.className).toBe("item-fly-placeholder");
		expect(source?.style.backgroundColor).toBeTruthy();
		expect(target?.dataset.test).toBe("cart-top-row");
		expect(target).not.toBe(selectorTable);
		expect(fly).toHaveBeenCalledWith(source, target, { speed: 0.6 });
		expect(document.body.contains(source as Node)).toBe(false);
		expect(addItem).toHaveBeenCalledWith({ item_code: "ITEM-001" });
	});

	it("animates card clicks toward the cart when the selector table is not rendered", () => {
		const cartTable = document.createElement("div");
		cartTable.className = "posa-items-table-container";
		cartTable.innerHTML = `
			<table class="posa-cart-table">
				<tbody>
					<tr data-test="cart-top-row"><td>Top row</td></tr>
				</tbody>
			</table>
		`;
		document.body.appendChild(cartTable);
		const card = document.createElement("button");
		card.className = "card-item-card";
		const image = document.createElement("div");
		image.className = "card-item-image";
		card.appendChild(image);
		document.body.appendChild(card);
		const fly = vi.fn();
		const addItem = vi.fn();
		const itemSelection = useItemSelection();
		itemSelection.registerContext({
			addItem,
			fly,
			flyConfig: { speed: 0.6 },
		});
		const event = new MouseEvent("click");
		Object.defineProperty(event, "currentTarget", {
			value: card,
		});

		itemSelection.handleItemSelection(event, { item_code: "ITEM-002" });

		expect(fly).toHaveBeenCalledWith(
			image,
			document.querySelector('[data-test="cart-top-row"]'),
			{ speed: 0.6 },
		);
		expect(addItem).toHaveBeenCalledWith({ item_code: "ITEM-002" });
	});
});
