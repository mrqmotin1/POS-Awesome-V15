import { ref, getCurrentInstance, inject } from "vue";
import { useToastStore } from "../../../stores/toastStore.js";
import { useUIStore } from "../../../stores/uiStore.js";
import { useInvoiceStore } from "../../../stores/invoiceStore.js";
import {
	initPromise,
	checkDbHealth,
	getOpeningStorage,
	setOpeningStorage,
	clearOpeningStorage,
	setTaxTemplate,
	isOffline,
	getBootstrapSnapshot,
	setBootstrapSnapshot,
} from "../../../../offline/index";
import { getValidCachedOpeningForCurrentUser } from "../../../utils/openingCache";
import { createBootstrapSnapshotFromRegisterData } from "../../../../offline/bootstrapSnapshot";
import { sendRawToQz } from "../../../services/qzTray";
import { silentPrint } from "../../../plugins/print";

declare const __BUILD_VERSION__: string;
declare const frappe: any;

type SkippedPrintedInvoice = {
	invoice?: string;
	doctype?: string;
	return_against?: string;
};

type ClosingShiftPreparationResponse = {
	closing_shift?: any;
	skipped_printed_invoices?: SkippedPrintedInvoice[];
};

const translateMessage = (value: string) => (typeof window !== "undefined" && window.__
	? window.__(value)
	: value);

export function buildSkippedClosingInvoicesPrompt(
	skippedInvoices: SkippedPrintedInvoice[],
) {
	const count = skippedInvoices.length;
	const baseMessage = count === 1
		? "1 printed return invoice references a cancelled invoice and will be excluded from closing."
		: `${count} printed return invoices reference cancelled invoices and will be excluded from closing.`;
	const details = skippedInvoices
		.slice(0, 5)
		.map((invoice) => {
			const invoiceName = invoice?.invoice || translateMessage("Unknown invoice");
			const returnAgainst = invoice?.return_against;
			return returnAgainst
				? `${invoiceName} (${translateMessage("Return Against")}: ${returnAgainst})`
				: invoiceName;
		})
		.join(", ");
	const detailMessage = details
		? `${translateMessage("Invoices")}: ${details}.`
		: "";
	return [
		translateMessage(baseMessage),
		detailMessage,
		translateMessage("The skipped invoice will remain a draft."),
		translateMessage("Do you want to proceed?"),
	]
		.filter(Boolean)
		.join(" ");
}

function normalizeClosingShiftPreparationResponse(
	payload: any,
): ClosingShiftPreparationResponse {
	if (payload?.closing_shift || payload?.skipped_printed_invoices) {
		return payload;
	}

	return {
		closing_shift: payload,
		skipped_printed_invoices: [],
	};
}

export function usePosShift(openDialog?: () => void) {
	const instance = getCurrentInstance();
	const proxy: any = instance?.proxy;
	const eventBus: any = proxy?.eventBus || inject("eventBus");
	const buildVersion =
		typeof __BUILD_VERSION__ !== "undefined" ? __BUILD_VERSION__ : null;
	const toastStore = useToastStore();
	const uiStore = useUIStore();

	const pos_profile = ref<any>(null);
	const pos_opening_shift = ref<any>(null);

	function applyRegisterData(data: any) {
		if (!data) {
			return;
		}
		pos_profile.value = data.pos_profile;
		pos_opening_shift.value = data.pos_opening_shift;
		uiStore.setRegisterData(data);
		setBootstrapSnapshot(
			createBootstrapSnapshotFromRegisterData(
				data,
				getBootstrapSnapshot(),
				{ buildVersion },
			),
		);

		try {
			frappe.realtime.emit("pos_profile_registered");
		} catch (e) {
			console.warn("Realtime emit failed", e);
		}
	}

	async function check_opening_entry() {
		await initPromise;
		await checkDbHealth();
		const cachedOpening = getValidCachedOpeningForCurrentUser(
			getOpeningStorage(),
			frappe?.session?.user,
		);
		if (cachedOpening) {
			applyRegisterData(cachedOpening);
			console.info("LoadPosProfile (bootstrapped from cache)");
		}
		return frappe
			.call("posawesome.posawesome.api.shifts.check_opening_shift", {
				user: frappe.session.user,
			})
			.then((r: any) => {
				if (r.message) {
					applyRegisterData(r.message);
					if (pos_profile.value.taxes_and_charges) {
						frappe.call({
							method: "frappe.client.get",
							args: {
								doctype: "Sales Taxes and Charges Template",
								name: pos_profile.value.taxes_and_charges,
							},
							callback: (res: any) => {
								if (res.message) {
									setTaxTemplate(
										pos_profile.value.taxes_and_charges,
										res.message,
									);
								}
							},
						});
					}
					console.info("LoadPosProfile");
					try {
						setOpeningStorage(r.message);
					} catch (e) {
						console.error("Failed to cache opening data", e);
					}
				} else {
					console.info("No opening shift found, opening dialog");
					clearOpeningStorage();
					openDialog && openDialog();
				}
			})
			.catch((err: unknown) => {
				console.error("Error checking opening entry", err);
				const data = cachedOpening ||
					getValidCachedOpeningForCurrentUser(
						getOpeningStorage(),
						frappe?.session?.user,
					);
				if (data) {
					applyRegisterData(data);
					console.info("LoadPosProfile (cached)");
					return;
				}
				if (!isOffline()) {
					clearOpeningStorage();
				}
				openDialog && openDialog();
			});
	}

	function get_closing_data() {
		// Always prefer the shared store (updated by all usePosShift instances and
		// handleRegisterPosData), then fall back to the local ref, then localStorage.
		const storeOpeningShift = uiStore.posOpeningShift;
		const cachedOpeningShift = (getOpeningStorage() as any)?.pos_opening_shift;
		const resolvedShift =
			storeOpeningShift || pos_opening_shift.value || cachedOpeningShift || null;
		if (!resolvedShift) {
			return Promise.resolve();
		}
		return frappe
			.call(
				"posawesome.posawesome.doctype.pos_closing_shift.pos_closing_shift.make_closing_shift_from_opening",
				{ opening_shift: resolvedShift },
			)
			.then((r: any) => {
				if (r.message) {
					const response = normalizeClosingShiftPreparationResponse(r.message);
					const closingShift = response.closing_shift;
					const skippedPrintedInvoices = Array.isArray(response.skipped_printed_invoices)
						? response.skipped_printed_invoices
						: [];
					if (!closingShift) {
						return;
					}

					if (skippedPrintedInvoices.length) {
						const confirmed = window.confirm(
							buildSkippedClosingInvoicesPrompt(skippedPrintedInvoices),
						);
						if (!confirmed) {
							return;
						}
					}

					eventBus?.emit("open_ClosingDialog", closingShift);
				}
			});
	}

	function submit_closing_pos(data: any, CustomPrint = false) {
		console.log("Submitting closing shift", data);
		//console.log("data ----------------", data);
		//console.log("Print ----------------", CustomPrint);
		frappe
			.call(
				"posawesome.posawesome.doctype.pos_closing_shift.pos_closing_shift.submit_closing_shift",
				{
					closing_shift: JSON.stringify(data),
				},
			)
			.then((r: any) => {
				console.log("Submit result", r);
				if (r.message) {
					const activeProfile = uiStore.posProfile || pos_profile.value;
					const useSilent = !!activeProfile?.posa_silent_print;
					const printerName = activeProfile?.custom_pos_printer || null;
					console.log("Use Silent Print", useSilent, "Printer Name", printerName, "activeProfile", activeProfile);
					pos_profile.value = null;
					pos_opening_shift.value = null;
					uiStore.posOpeningShift = null;
					clearOpeningStorage();
					useInvoiceStore().clear();
					toastStore.show({
						title: "POS Shift Closed",
						color: "success",
					});
					//console.log("Print Value", CustomPrint);
					if (CustomPrint === true) {
						console.log("Print is true");
						load_print_page(r.message, useSilent, printerName);
						console.log("Print page loaded", r.message);
					}
					check_opening_entry();
				}
			})
			.catch((err: unknown) => {
				console.error("Failed to submit closing shift", err);
			});
	}

	// Open print page for pos clsoing shift
		async function load_print_page(
			x: string,
			useSilent = false,
			printerName: string | null = null,
		) {
			console.log("XxXXXXX",x);
			const print_format = "POS Closing Report";
			const doctype = "POS Closing Shift";
			const url =
				frappe.urllib.get_base_url() +
				"/printview?doctype=" +
				encodeURIComponent(doctype) +
				"&name=" +x+
				"&trigger_print=1" +
				"&format=" +
				print_format;

			if (useSilent) {
				if (!isOffline()) {
					try {
						const r: any = await frappe.call(
							"posawesome.posawesome.doctype.pos_closing_shift.closing_processing.escpos.get_closing_shift_escpos",
							{ name: x },
						);
						const escpos = r?.message;
						if (!escpos) {
							throw new Error("Empty ESC/POS payload from server.");
						}
						await sendRawToQz(escpos, printerName || undefined);
						return;
					} catch (error) {
						console.warn(
							"QZ Tray closing-shift raw print failed, falling back to browser print",
							error,
						);
					}
				}
				silentPrint(url, {});
				return;
			}

			//console.log("Print URL", url);
			window.open(url, "Print");

		}

	return {
		pos_profile,
		pos_opening_shift,
		check_opening_entry,
		get_closing_data,
		submit_closing_pos,
	};
}
