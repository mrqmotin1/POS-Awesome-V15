declare const __BUILD_VERSION__: string;

const POSAPP_BASE_PATH = "/app/posapp";
const bundlePath = `/assets/posawesome/dist/js/posawesome.js?v=${__BUILD_VERSION__}`;

declare global {
	interface Window {
		__posawesomeBundlePromise?: Promise<unknown>;
	}
}

function normalizePosAppPath(): boolean {
	if (typeof window === "undefined" || !window.location) {
		return false;
	}

	const { pathname, search, hash } = window.location;
	if (!pathname.toLowerCase().startsWith(`${POSAPP_BASE_PATH}/`)) {
		return false;
	}

	// Frappe route resolution is stable on /app/posapp; deeper URLs can bypass page boot.
	const normalizedPath = pathname.replace(/\/+$/, "");
	if (normalizedPath === POSAPP_BASE_PATH) {
		return false;
	}

	window.location.replace(`${POSAPP_BASE_PATH}${search || ""}${hash || ""}`);
	return true;
}

if (typeof window !== "undefined" && !normalizePosAppPath()) {
	window.__posawesomeBundlePromise = import(/* @vite-ignore */ bundlePath).catch(
		(error) => {
			console.error("POS Awesome bundle failed to load", error);
			throw error;
		},
	);
}
