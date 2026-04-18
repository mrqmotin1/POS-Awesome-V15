import type { SyncTrigger } from "./types";

type ScheduleFrame = (callback: () => void | Promise<void>) => number;
type ScheduleInterval = (
	callback: () => void | Promise<void>,
	intervalMs: number,
) => number | ReturnType<typeof setInterval>;
type ClearIntervalHandle = (
	handle: number | ReturnType<typeof setInterval>,
) => void;

type OfflineSyncRuntimeOptions = {
	canSync: () => boolean;
	runTrigger: (trigger: SyncTrigger) => Promise<void>;
	scheduleFrame?: ScheduleFrame;
	scheduleInterval?: ScheduleInterval;
	clearScheduledInterval?: ClearIntervalHandle;
	timerIntervalMs?: number;
};

function defaultScheduleFrame(callback: () => void | Promise<void>) {
	if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
		return window.requestAnimationFrame(() => {
			void callback();
		});
	}
	return window.setTimeout(() => {
		void callback();
	}, 0);
}

export function createOfflineSyncRuntime(options: OfflineSyncRuntimeOptions) {
	let bootPromise: Promise<boolean> | null = null;
	let onlineResumePromise: Promise<boolean> | null = null;
	let timerPromise: Promise<boolean> | null = null;
	let timerHandle: number | ReturnType<typeof setInterval> | null = null;
	const scheduleFrame = options.scheduleFrame || defaultScheduleFrame;
	const scheduleInterval =
		options.scheduleInterval ||
		((callback, intervalMs) =>
			globalThis.setInterval(() => {
				void callback();
			}, intervalMs));
	const clearScheduledInterval =
		options.clearScheduledInterval ||
		((handle) => {
			globalThis.clearInterval(handle as ReturnType<typeof setInterval>);
		});
	const timerIntervalMs = Math.max(5_000, options.timerIntervalMs || 60_000);

	function scheduleBootWarmSync() {
		if (bootPromise) {
			return bootPromise;
		}
		if (!options.canSync()) {
			return Promise.resolve(false);
		}

		bootPromise = new Promise<boolean>((resolve, reject) => {
			scheduleFrame(async () => {
				try {
					if (!options.canSync()) {
						resolve(false);
						return;
					}
					await options.runTrigger("boot");
					resolve(true);
				} catch (error) {
					reject(error);
				} finally {
					bootPromise = null;
				}
			});
		});

		return bootPromise;
	}

	function triggerOnlineResumeSync() {
		if (onlineResumePromise) {
			return onlineResumePromise;
		}
		if (!options.canSync()) {
			return Promise.resolve(false);
		}

		onlineResumePromise = (async () => {
			try {
				await options.runTrigger("online_resume");
				return true;
			} finally {
				onlineResumePromise = null;
			}
		})();

		return onlineResumePromise;
	}

	function triggerTimerSync() {
		if (timerPromise) {
			return timerPromise;
		}
		if (!options.canSync()) {
			return Promise.resolve(false);
		}

		timerPromise = (async () => {
			try {
				await options.runTrigger("timer");
				return true;
			} finally {
				timerPromise = null;
			}
		})();

		return timerPromise;
	}

	function startTimerSync() {
		if (timerHandle !== null) {
			return timerHandle;
		}

		timerHandle = scheduleInterval(() => {
			void triggerTimerSync();
		}, timerIntervalMs);
		return timerHandle;
	}

	function stopTimerSync() {
		if (timerHandle === null) {
			return;
		}
		clearScheduledInterval(timerHandle);
		timerHandle = null;
	}

	return {
		scheduleBootWarmSync,
		triggerOnlineResumeSync,
		triggerTimerSync,
		startTimerSync,
		stopTimerSync,
	};
}
