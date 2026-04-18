import { ref, computed } from "vue";
// @ts-ignore
import config from "../../config/loading";

export type LoadingScopeKind =
	| "bootstrap"
	| "route"
	| "section"
	| "action"
	| "background";

type LoadingScopeState = {
	count: number;
	kind: LoadingScopeKind;
	blocking: boolean;
	message: string;
	progress: number | null;
};

type LoadingScopeOptions = Partial<
	Pick<LoadingScopeState, "kind" | "blocking" | "message" | "progress">
>;

const DEFAULT_SCOPE_CONFIG: Record<string, Omit<LoadingScopeState, "count">> = {
	global: {
		kind: "bootstrap",
		blocking: true,
		message: "Loading app data...",
		progress: null,
	},
	bootstrap: {
		kind: "bootstrap",
		blocking: true,
		message: "Loading app data...",
		progress: null,
	},
	route: {
		kind: "route",
		blocking: false,
		message: "Loading view...",
		progress: null,
	},
	api: {
		kind: "action",
		blocking: false,
		message: "Processing request...",
		progress: null,
	},
	background: {
		kind: "background",
		blocking: false,
		message: "",
		progress: null,
	},
};

function getDefaultScopeConfig(id: string): Omit<LoadingScopeState, "count"> {
	return (
		DEFAULT_SCOPE_CONFIG[id] ||
		DEFAULT_SCOPE_CONFIG.background ||
		DEFAULT_SCOPE_CONFIG.global || {
			kind: "background",
			blocking: false,
			message: "",
			progress: null,
		}
	);
}

const loaders = ref(new Map<string, LoadingScopeState>());
const overlayVisible = ref(false);
let delayTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let overlayShownAt = 0;

function resolveScopeState(
	id: string,
	options: LoadingScopeOptions = {},
	existing?: LoadingScopeState,
): LoadingScopeState {
	const defaults = getDefaultScopeConfig(id);

	return {
		count: existing?.count || 0,
		kind: options.kind || existing?.kind || defaults.kind,
		blocking:
			typeof options.blocking === "boolean"
				? options.blocking
				: typeof existing?.blocking === "boolean"
					? existing.blocking
					: defaults.blocking,
		message:
			typeof options.message === "string"
				? options.message
				: existing?.message || defaults.message,
		progress:
			typeof options.progress === "number"
				? Math.max(0, Math.min(100, Math.round(options.progress)))
				: existing?.progress ?? defaults.progress,
	};
}

function hasBlockingLoaders() {
	return Array.from(loaders.value.values()).some(
		(loader) => loader.count > 0 && loader.blocking,
	);
}

function manageOverlay() {
	const shouldShowOverlay = hasBlockingLoaders();
	const { delay, minVisible } = config.overlay;

	if (shouldShowOverlay) {
		if (!overlayVisible.value) {
			if (hideTimer) clearTimeout(hideTimer);
			delayTimer = setTimeout(() => {
				overlayVisible.value = true;
				overlayShownAt = Date.now();
			}, delay);
		}
		return;
	}

	if (delayTimer) clearTimeout(delayTimer);
	if (!overlayVisible.value) {
		return;
	}

	const elapsed = Date.now() - overlayShownAt;
	const remaining = Math.max(minVisible - elapsed, 0);
	hideTimer = setTimeout(() => {
		overlayVisible.value = false;
	}, remaining);
}

export function start(id = "global", options: LoadingScopeOptions = {}) {
	const existing = loaders.value.get(id);
	const next = resolveScopeState(id, options, existing);
	next.count = (existing?.count || 0) + 1;
	loaders.value.set(id, next);
	manageOverlay();
}

export function stop(id = "global") {
	const existing = loaders.value.get(id);
	if (!existing) {
		manageOverlay();
		return;
	}

	if (existing.count <= 1) {
		loaders.value.delete(id);
	} else {
		loaders.value.set(id, {
			...existing,
			count: existing.count - 1,
		});
	}

	manageOverlay();
}

export function setScopeMeta(id: string, options: LoadingScopeOptions = {}) {
	const existing = loaders.value.get(id);
	const next = resolveScopeState(id, options, existing);
	next.count = existing?.count || 0;
	loaders.value.set(id, next);
	manageOverlay();
}

export function clearScopeMeta(id: string) {
	const existing = loaders.value.get(id);
	if (!existing) {
		return;
	}

	if (existing.count > 0) {
		loaders.value.set(id, resolveScopeState(id, {}, { ...existing }));
		return;
	}

	loaders.value.delete(id);
	manageOverlay();
}

export function withLoading<T>(
	fn: () => T | Promise<T>,
	id = "global",
	options: LoadingScopeOptions = {},
): Promise<T> {
	start(id, options);
	return Promise.resolve()
		.then(fn)
		.finally(() => stop(id));
}

export function useLoading() {
	const isLoading = (id = "global") =>
		computed(() => (loaders.value.get(id)?.count || 0) > 0);
	const isAnyLoading = computed(() =>
		Array.from(loaders.value.values()).some((loader) => loader.count > 0),
	);
	const getScopeState = (id: string) =>
		computed<LoadingScopeState>(() => {
			const loader = loaders.value.get(id);
			return (
				loader || {
					...resolveScopeState(id),
				}
			);
		});

	return {
		start,
		stop,
		setScopeMeta,
		clearScopeMeta,
		withLoading,
		isLoading,
		isAnyLoading,
		getScopeState,
		overlayVisible,
	};
}

export const isAnyLoading = computed(() =>
	Array.from(loaders.value.values()).some((loader) => loader.count > 0),
);
