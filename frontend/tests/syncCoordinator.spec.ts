import { describe, expect, it, vi } from "vitest";
import { SyncCoordinator } from "../src/offline/sync/SyncCoordinator";
import type {
	SyncResourceDefinition,
	SyncTrigger,
} from "../src/offline/sync/types";

const makeResource = (
	id: SyncResourceDefinition["id"],
	priority: SyncResourceDefinition["priority"],
	triggers: SyncTrigger[],
): SyncResourceDefinition => ({
	id,
	scope: "profile",
	mode: "delta",
	priority,
	triggers,
	storageKey: `${id}_cache`,
	watermarkType: "timestamp",
	fullResyncSupported: true,
});

describe("SyncCoordinator", () => {
	it("dedupes concurrent runs for the same trigger", async () => {
		const resources = [
			makeResource("bootstrap_config", "boot_critical", ["boot"]),
			makeResource("price_list_meta", "boot_critical", ["boot"]),
		];
		const runResource = vi.fn(async () => undefined);
		const coordinator = new SyncCoordinator({
			concurrency: 1,
			resources,
			runResource,
		});

		await Promise.all([
			coordinator.runTrigger("boot"),
			coordinator.runTrigger("boot"),
		]);

		expect(runResource).toHaveBeenCalledTimes(2);
		expect(runResource.mock.calls.map(([resource]) => resource.id)).toEqual([
			"bootstrap_config",
			"price_list_meta",
		]);
	});

	it("runs resources in priority order for a trigger", async () => {
		const resources = [
			makeResource("items", "warm", ["online_resume"]),
			makeResource("bootstrap_config", "boot_critical", ["online_resume"]),
			makeResource("customers", "warm", ["online_resume"]),
			makeResource("price_list_meta", "boot_critical", ["online_resume"]),
		];
		const started: string[] = [];
		const coordinator = new SyncCoordinator({
			concurrency: 1,
			resources,
			runResource: async (resource) => {
				started.push(resource.id);
			},
		});

		await coordinator.runTrigger("online_resume");

		expect(started).toEqual([
			"bootstrap_config",
			"price_list_meta",
			"items",
			"customers",
		]);
	});

	it("never exceeds configured concurrency while a trigger is running", async () => {
		const resources = [
			makeResource("bootstrap_config", "boot_critical", ["online_resume"]),
			makeResource("price_list_meta", "boot_critical", ["online_resume"]),
			makeResource("currency_matrix", "boot_critical", ["online_resume"]),
			makeResource("payment_method_currencies", "boot_critical", [
				"online_resume",
			]),
		];
		let activeRuns = 0;
		let maxActiveRuns = 0;
		const coordinator = new SyncCoordinator({
			concurrency: 2,
			resources,
			runResource: async () => {
				activeRuns += 1;
				maxActiveRuns = Math.max(maxActiveRuns, activeRuns);
				await new Promise((resolve) => setTimeout(resolve, 5));
				activeRuns -= 1;
			},
		});

		await coordinator.runTrigger("online_resume");

		expect(maxActiveRuns).toBeLessThanOrEqual(2);
		expect(coordinator.getResourceState("bootstrap_config")?.status).toBe(
			"fresh",
		);
	});
});
