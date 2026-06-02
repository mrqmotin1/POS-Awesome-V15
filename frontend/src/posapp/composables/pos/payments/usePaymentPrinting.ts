import { unref, type Ref } from "vue";
import renderOfflineInvoiceHTML from "../../../../offline_print_template";
import renderOfflineInvoiceRaw from "../../../../offline_raw_print_template";
import {
	appendDebugPrintParam,
	isDebugPrintEnabled,
	silentPrint,
	watchPrintWindow,
} from "../../../plugins/print";
import { printDocumentViaQz, printHtmlViaQz } from "../../../services/qzTray";
import { isOffline } from "../../../../offline/index";
import { resolvePaymentPrintDoctype } from "../../../utils/paymentPrintDoctype";

declare const frappe: any;

export interface PaymentPrintingOptions {
	invoiceDoc: Ref<any>;
	posProfile: Ref<any>;
	invoiceType: Ref<string>;
	printFormat?: Ref<string>;
}

export function usePaymentPrinting(options: PaymentPrintingOptions) {
	const { invoiceDoc, posProfile, invoiceType, printFormat } = options;

	const resolvePrintContext = (input: { doc?: any; doctype?: string } = {}) => {
		const doc = input.doc || unref(invoiceDoc);
		const profile = unref(posProfile);
		const type = unref(invoiceType);
		const pFormatOverride = unref(printFormat);
		const print_format =
			pFormatOverride ||
			profile.print_format_for_online ||
			profile.print_format;
		const letter_head = profile.letter_head || 0;
		const doctype = resolvePaymentPrintDoctype({
			profile,
			invoiceType: type,
			explicitDoctype: input.doctype || input.doc?.doctype,
		});

		return {
			doc,
			profile,
			doctype,
			print_format,
			letter_head,
		};
	};

	const openOfflineInvoicePreview = async (
		invoice: any,
		{ debugPrint = false, printFormatStr = "" } = {},
	) => {
		if (!invoice) return;
		const html = await renderOfflineInvoiceHTML(invoice);
		const win = window.open("", "_blank");
		if (!win) return;
		win.document.write(html);
		win.document.close();
		win.focus();
		if (debugPrint) {
			console.log("[POSAwesome][Print Debug]", {
				location: win.location?.href || null,
				online: navigator.onLine,
				trigger_print: "0",
				print_format: printFormatStr || null,
				template_path: "offline-fallback",
				should_print: false,
			});
		}
	};

	const printOfflineInvoice = async (invoice: any) => {
		if (!invoice) return;

		// When silent printing is enabled, render the ESC/POS receipt client-side and
		// send it to QZ Tray as raw commands (QZ runs locally, so this works offline).
		const profile = unref(posProfile);
		if (profile?.posa_silent_print) {
			try {
				const raw = await renderOfflineInvoiceRaw(invoice);
				await printHtmlViaQz(raw, {
					printerName: profile.custom_pos_printer || null,
				});
				return;
			} catch (error) {
				console.warn(
					"Offline QZ raw print failed, falling back to browser print",
					error,
				);
			}
		}

		const html = await renderOfflineInvoiceHTML(invoice);
		const win = window.open("", "_blank");
		if (!win) {
			frappe?.msgprint(__("Print blocked by browser. Please allow popups for this site and try again."));
			return;
		}
		win.document.write(html);
		win.document.close();
		win.focus();
		win.print();
		win.close();
		setTimeout(() => {
			if (!win.closed) {
				win.close();
			}
		}, 1000);
	};

	const loadPrintPage = async (input: { doc?: any; doctype?: string } = {}) => {
		const { doc, profile, doctype, print_format, letter_head } = resolvePrintContext(input);
		const debugPrint = isDebugPrintEnabled();

		let url =
			frappe.urllib.get_base_url() +
			"/printview?doctype=" +
			encodeURIComponent(doctype) +
			"&name=" +
			doc.name +
			"&trigger_print=1" +
			"&format=" +
			print_format +
			"&no_letterhead=" +
			letter_head;

		url = appendDebugPrintParam(url, debugPrint);

		const printOptions = {
			invoiceDoc: doc,
			allowOfflineFallback: isOffline(),
			triggerPrint: "1",
			debugPrint,
			debugInfo: {
				printFormat: print_format,
				templatePath: "online-printview",
			},
		};

		if (profile.posa_open_print_in_new_tab) {
			if (isOffline()) {
				openOfflineInvoicePreview(doc, {
					debugPrint,
					printFormatStr: print_format,
				});
				return;
			}
			let newTabUrl =
				frappe.urllib.get_base_url() +
				"/printview?doctype=" +
				encodeURIComponent(doctype) +
				"&name=" +
				doc.name +
				"&trigger_print=0" +
				"&format=" +
				print_format;

			if (profile.letter_head) {
				newTabUrl +=
					"&letterhead=" + encodeURIComponent(profile.letter_head);
				newTabUrl += "&no_letterhead=0";
			} else {
				newTabUrl += "&no_letterhead=0";
			}

			newTabUrl = appendDebugPrintParam(newTabUrl, debugPrint);
			const printWindow = window.open(newTabUrl, "_blank");
			if (printWindow) {
				watchPrintWindow(printWindow, {
					...printOptions,
					triggerPrint: "0",
					shouldPrint: false,
				});
			}
			return;
		}

		if (profile.posa_silent_print) {
			if (!isOffline()) {
				try {
					await printDocumentViaQz({
						doctype,
						name: doc.name,
						printFormat: print_format || "Standard",
						letterhead: profile.letter_head || null,
						noLetterhead: letter_head,
						printerName: profile.custom_pos_printer || null,

					});
					return;
				} catch (error) {
					console.warn("QZ Tray print failed, falling back to browser print", error);
				}
			} else {
				// Offline: render the ESC/POS receipt client-side and send it to QZ Tray
				// as raw commands (QZ runs locally so it works without the server).
				try {
					const raw = await renderOfflineInvoiceRaw(doc);
					await printHtmlViaQz(raw, {
						printerName: profile.custom_pos_printer || null,
					});
					return;
				} catch (error) {
					console.warn(
						"Offline QZ raw print failed, falling back to browser print",
						error,
					);
				}
			}
			silentPrint(url, printOptions);
		} else {
			const printWindow = window.open(url, "Print");
			if (printWindow) {
				watchPrintWindow(printWindow, printOptions);
			}
		}
	};

	return {
		loadPrintPage,
		printOfflineInvoice,
		openOfflineInvoicePreview,
	};
}
