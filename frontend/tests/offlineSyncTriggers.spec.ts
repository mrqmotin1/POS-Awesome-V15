import { describe, expect, it, vi } from "vitest";

import { createOfflineSyncRuntime } from "../src/offline/sync/runtime";

describe("offline sync runtime triggers", () => {
	it("schedules boot warm sync after the next frame instead of immediately", async () => {
		let scheduledFrame: (() => void | Promise<void>) | null = null;
		const runTrigger = vi.fn(async () => undefined);
		const runtime = createOfflineSyncRuntime({
			canSync: () => true,
			runTrigger,
			scheduleFrame: (callback) => {
				scheduledFrame = callback;
				return 1;
			},
		});

		const pending = runtime.scheduleBootWarmSync();

		expect(runTrigger).not.toHaveBeenCalled();

		await scheduledFrame?.();
		await pending;

		expect(runTrigger).toHaveBeenCalledTimes(1);
		expect(runTrigger).toHaveBeenCalledWith("boot");
	});

	it("dedupes repeated boot scheduling before the frame runs", async () => {
		let scheduledFrame: (() => void | Promise<void>) | null = null;
		const runTrigger = vi.fn(async () => undefined);
		const runtime = createOfflineSyncRuntime({
			canSync: () => true,
			runTrigger,
			scheduleFrame: (callback) => {
				scheduledFrame = callback;
				return 1;
			},
		});

		const first = runtime.scheduleBootWarmSync();
		const second = runtime.scheduleBootWarmSync();

		expect(first).toBe(second);
		expect(runTrigger).not.toHaveBeenCalled();

		await scheduledFrame?.();
		await Promise.all([first, second]);

		expect(runTrigger).toHaveBeenCalledTimes(1);
	});

	it("dedupes online resume re-entry while a sync is already in flight", async () => {
		let resolveRun: (() => void) | null = null;
		const runTrigger = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					resolveRun = resolve;
				}),
		);
		const runtime = createOfflineSyncRuntime({
			canSync: () => true,
			runTrigger,
		});

		const first = runtime.triggerOnlineResumeSync();
		const second = runtime.triggerOnlineResumeSync();

		expect(first).toBe(second);
		expect(runTrigger).toHaveBeenCalledTimes(1);
		expect(runTrigger).toHaveBeenCalledWith("online_resume");

		resolveRun?.();
		await Promise.all([first, second]);
	});

	it("starts a periodic timer sync and stops it cleanly", async () => {
		let scheduledCallback: (() => void | Promise<void>) | null = null;
		let clearedHandle: number | null = null;
		const runTrigger = vi.fn(async () => undefined);
		const runtime = createOfflineSyncRuntime({
			canSync: () => true,
			runTrigger,
			timerIntervalMs: 15_000,
			scheduleInterval: (callback) => {
				scheduledCallback = callback;
				return 77;
			},
			clearScheduledInterval: (handle) => {
				clearedHandle = Number(handle);
			},
		});

		const handle = runtime.startTimerSync();
		expect(handle).toBe(77);

		await scheduledCallback?.();
		expect(runTrigger).toHaveBeenCalledWith("timer");

		runtime.stopTimerSync();
		expect(clearedHandle).toBe(77);
	});

	it("dedupes timer sync re-entry while a timer-triggered pass is in flight", async () => {
		let resolveRun: (() => void) | null = null;
		const runTrigger = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					resolveRun = resolve;
				}),
		);
		const runtime = createOfflineSyncRuntime({
			canSync: () => true,
			runTrigger,
		});

		const first = runtime.triggerTimerSync();
		const second = runtime.triggerTimerSync();

		expect(first).toBe(second);
		expect(runTrigger).toHaveBeenCalledTimes(1);
		expect(runTrigger).toHaveBeenCalledWith("timer");

		resolveRun?.();
		await Promise.all([first, second]);
	});
});
