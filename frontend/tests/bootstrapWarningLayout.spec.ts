import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("DefaultLayout bootstrap warning banner", () => {
	it("overrides Vuetify alert content clipping for multi-line offline prerequisite warnings", () => {
		const source = readFileSync(
			resolve(process.cwd(), "src/posapp/layouts/DefaultLayout.vue"),
			"utf8",
		);

		expect(source).toContain(".bootstrap-warning :deep(.v-alert__content)");
		expect(source).toContain("overflow: visible;");
		expect(source).toContain("align-self: stretch;");
		expect(source).toContain("white-space: normal;");
		expect(source).toContain("overflow-wrap: anywhere;");
	});
});
