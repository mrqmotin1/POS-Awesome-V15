import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	start,
	stop,
	setScopeMeta,
	useLoading,
} from "../src/posapp/composables/core/useLoading";

describe("useLoading scoped orchestration", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		stop("bootstrap");
		stop("route");
		stop("api");
	});

	it("shows the overlay only for blocking bootstrap loads", async () => {
		const { overlayVisible, getScopeState } = useLoading();

		start("bootstrap");
		setScopeMeta("bootstrap", {
			message: "Initializing application...",
			progress: 25,
		});
		await vi.runAllTimersAsync();

		expect(overlayVisible.value).toBe(true);
		expect(getScopeState("bootstrap").value.message).toBe(
			"Initializing application...",
		);
		expect(getScopeState("bootstrap").value.progress).toBe(25);

		stop("bootstrap");
		await vi.runAllTimersAsync();

		expect(overlayVisible.value).toBe(false);
	});

	it("keeps route loading non-blocking for the global overlay", async () => {
		const { overlayVisible, getScopeState } = useLoading();

		start("route");
		await vi.runAllTimersAsync();

		expect(overlayVisible.value).toBe(false);
		expect(getScopeState("route").value.count).toBe(1);
		expect(getScopeState("route").value.kind).toBe("route");

		stop("route");
	});
});
