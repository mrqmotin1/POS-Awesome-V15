export interface CustomerDisplayScreen {
	label: string;
	isPrimary: boolean;
	isInternal: boolean;
	left: number;
	top: number;
	width: number;
	height: number;
	availLeft: number;
	availTop: number;
	availWidth: number;
	availHeight: number;
}

const toNumber = (value: any, fallback = 0) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

export const supportsScreenDetails = () =>
	typeof window !== "undefined" &&
	typeof (window as any).getScreenDetails === "function";

/**
 * Resolves the Window Management API handle. Chromium only, secure context
 * only. The first call must happen inside a user gesture: it is what raises
 * Chrome's "window management" permission prompt.
 * Returns null when unsupported or denied, which callers treat as
 * "no target screen" and fall back to the plain popup.
 */
export const requestScreenDetails = async (): Promise<any | null> => {
	if (!supportsScreenDetails()) {
		return null;
	}
	try {
		return await (window as any).getScreenDetails();
	} catch {
		return null;
	}
};

export const listScreens = (details: any): CustomerDisplayScreen[] => {
	const screens = details?.screens;
	if (!Array.isArray(screens)) {
		return [];
	}

	return screens.map((screen: any, index: number) => {
		const width = toNumber(screen?.width);
		const height = toNumber(screen?.height);

		return {
			label: String(screen?.label || "").trim() || `Display ${index + 1}`,
			isPrimary: Boolean(screen?.isPrimary),
			isInternal: Boolean(screen?.isInternal),
			left: toNumber(screen?.left),
			top: toNumber(screen?.top),
			width,
			height,
			availLeft: toNumber(screen?.availLeft, toNumber(screen?.left)),
			availTop: toNumber(screen?.availTop, toNumber(screen?.top)),
			availWidth: toNumber(screen?.availWidth, width),
			availHeight: toNumber(screen?.availHeight, height),
		};
	});
};

/**
 * Resolves the POS Profile "Customer Display Name" to a screen.
 *
 * Real monitor labels only - "DELL U2412M", "Built-in Retina Display" - as
 * detected on this computer and picked from the list on the POS Profile. Names
 * are machine-specific, so a value set on one computer resolves to nothing on a
 * computer without that monitor.
 *
 * Returns null for a blank name or no match - the caller then keeps the
 * existing popup behavior.
 */
export const matchScreenByName = (
	screens: CustomerDisplayScreen[],
	name: any,
): CustomerDisplayScreen | null => {
	if (!Array.isArray(screens) || !screens.length) {
		return null;
	}

	const needle = String(name ?? "").trim().toLowerCase();
	if (!needle) {
		return null;
	}

	const exact = screens.find((screen) => screen.label.toLowerCase() === needle);
	if (exact) return exact;

	// Only so a label that shifted slightly - "MI monitor" becoming
	// "MI monitor (2)" after a replug - still resolves. Anything else is an
	// exact label taken from the detected list.
	return (
		screens.find((screen) => screen.label.toLowerCase().includes(needle)) || null
	);
};

/**
 * Uses the working area so the window clears the taskbar/dock even when the
 * browser will not honour `fullscreen`.
 *
 * `fullscreen` asks Chrome to open the popup already full screen on the target
 * monitor, which is the only way to get there without a second user gesture in
 * the popup itself. It is gated on the window-management permission and, at the
 * time of writing, on chrome://flags/#fullscreen-popup-windows. Browsers that
 * do not know the token ignore it, so this is never worse than a plain popup.
 */
export const buildWindowFeatures = (screen: CustomerDisplayScreen) =>
	[
		"popup=yes",
		"fullscreen=yes",
		`left=${Math.round(screen.availLeft)}`,
		`top=${Math.round(screen.availTop)}`,
		`width=${Math.round(screen.availWidth)}`,
		`height=${Math.round(screen.availHeight)}`,
		"resizable=yes",
		"scrollbars=yes",
	].join(",");

/**
 * The ScreenDetailed instance the calling window currently sits on, so the
 * display can request full screen on its own monitor.
 */
export const findCurrentScreen = (details: any) => {
	if (!details) return null;
	if (details.currentScreen) {
		return details.currentScreen;
	}
	const screens = Array.isArray(details.screens) ? details.screens : [];
	return screens.find((screen: any) => screen?.isPrimary) || screens[0] || null;
};
