import { defineConfig } from "@playwright/test";

const baseURL = process.env.POSA_SMOKE_BASE_URL || "http://127.0.0.1:8000";

export default defineConfig({
	testDir: "./tests/smoke",
	timeout: 120000,
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI
		? [["github"], ["html", { open: "never" }]]
		: "list",
	use: {
		baseURL,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
});
