declare const __BUILD_VERSION__: string;
import { resolvePosAppNormalizedPath } from "./loader-utils";

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
	const normalizedPath = resolvePosAppNormalizedPath(pathname, POSAPP_BASE_PATH);
	if (!normalizedPath) {
		return false;
	}

	window.location.replace(`${normalizedPath}${search || ""}${hash || ""}`);
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
