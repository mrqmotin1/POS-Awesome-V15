import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourcePath = (relativePath: string) =>
	fileURLToPath(new URL(`../src/${relativePath}`, import.meta.url));

describe("large cart performance guards", () => {
	it("does not log from CartItemRow render memoization", () => {
		const source = readFileSync(
			sourcePath("posapp/components/pos/invoice/CartItemRow.vue"),
			"utf8",
		);

		expect(source).not.toMatch(/console\.log\(\`\[CartItemRow\]/);
	});

	it("does not deep-watch every cart item for offer refreshes", () => {
		const source = readFileSync(
			sourcePath("posapp/composables/pos/invoice/useInvoiceOffers.ts"),
			"utf8",
		);

		expect(source).toContain("invoiceStore.metadata.changeVersion");
		expect(source).not.toContain("[items, posOffers, posa_coupons");
	});

	it("keeps Vuetify virtual table spacer available for bottom rows", () => {
		const source = readFileSync(
			sourcePath("posapp/components/pos/invoice/items-table-styles.css"),
			"utf8",
		);

		expect(source).not.toMatch(
			/\.v-data-table-virtual__spacer\s*\{[\s\S]*display:\s*none/i,
		);
		expect(source).not.toMatch(
			/\.v-data-table-virtual__spacer\s*\{[\s\S]*height:\s*0/i,
		);
	});
});
