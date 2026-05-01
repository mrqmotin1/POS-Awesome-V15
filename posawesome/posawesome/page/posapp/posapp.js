const POSA_VERSION_ENDPOINT = "/assets/posawesome/dist/js/version.json";
const POSA_LOADER_URL = "/assets/posawesome/dist/js/loader.js";
const POSA_LOADER_SCRIPT_ID = "posa-loader-script";

const getPosBuildVersion = async () => {
	try {
		const response = await fetch(`${POSA_VERSION_ENDPOINT}?t=${Date.now()}`, {
			cache: "no-store",
		});
		if (!response.ok) {
			return null;
		}
		const payload = await response.json();
		const version = payload?.version || payload?.buildVersion;
		return typeof version === "string" && version.trim().length ? version.trim() : null;
	} catch (error) {
		console.warn("Unable to fetch POS build version", error);
		return null;
	}
};

const buildVersionedLoaderUrl = (version) =>
	version ? `${POSA_LOADER_URL}?v=${encodeURIComponent(version)}` : POSA_LOADER_URL;

const ensurePosBootController = async () => {
	const version = await getPosBuildVersion();
	const requestedVersion = version || "";
	const existingScript = document.getElementById(POSA_LOADER_SCRIPT_ID);

	if (
		existingScript &&
		existingScript.getAttribute("data-build-version") === requestedVersion &&
		typeof window.startPosBoot === "function"
	) {
		return;
	}

	if (existingScript) {
		existingScript.remove();
	}

	await new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.id = POSA_LOADER_SCRIPT_ID;
		script.type = "module";
		script.async = true;
		script.src = buildVersionedLoaderUrl(version);
		script.setAttribute("data-build-version", requestedVersion);
		script.onload = () => resolve();
		script.onerror = () =>
			reject(new Error(`Failed to load POS boot controller (${requestedVersion || "unversioned"})`));
		document.head.appendChild(script);
	});
};

frappe.pages["posapp"].on_page_load = async function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "POS Awesome",
		single_column: true,
	});
	const pageRef = (wrapper && wrapper.page) || page;

	try {
		await ensurePosBootController();
		await window.startPosBoot({ pageRef });
	} catch (error) {
		console.error("Unable to start POS boot controller", error);
		frappe.msgprint({
			title: "POS Awesome",
			indicator: "red",
			message:
				"POS app failed to start before the boot controller could run. Reload /app/posapp and try again.",
		});
	}
};

frappe.pages["posapp"].on_page_unload = function (wrapper) {
	if (
		wrapper &&
		wrapper.page &&
		wrapper.page._posaTaxInclusiveHandler &&
		frappe.realtime &&
		typeof frappe.realtime.off === "function"
	) {
		frappe.realtime.off("pos_profile_registered", wrapper.page._posaTaxInclusiveHandler);
		wrapper.page._posaTaxInclusiveHandler = null;
	}

	if (
		wrapper &&
		wrapper.page &&
		wrapper.page.$PosApp &&
		typeof wrapper.page.$PosApp.unmount === "function"
	) {
		wrapper.page.$PosApp.unmount();
		wrapper.page.$PosApp = null;
	}
};
